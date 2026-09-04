from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.db.models import Sum, Count
from django.utils import timezone
from django.db.models.functions import TruncMonth
from datetime import timedelta
from .models import Member, Membership, Attendance, MonthlyLeaderboard
from .serializers import MemberDetailSerializer, MemberListSerializer, MembershipSerializer,  MonthlyLeaderboardSerializer, AttendanceHeatmapSerializer, AttendanceSerializer, AttendanceStatsSerializer


class MemberViewSet(viewsets.ModelViewSet):
    queryset = Member.objects.all()
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend,
                       filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['name', 'email', 'phone_number']
    ordering_fields = ['name', 'date_joined']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MemberDetailSerializer
        return MemberListSerializer

    def list(self, request, *args, **kwargs):
        # 1. Get the standard list response (filtered, searched, ordered, paginated)
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            list_data = serializer.data
        else:
            serializer = self.get_serializer(queryset, many=True)
            list_data = serializer.data

        # 2. Calculate Global Statistics (Unfiltered)
        total_members = Member.objects.count()
        active_members = Member.objects.filter(
            memberships__end_date__gte=timezone.now().date()
        ).distinct().count()

        # 3. Structure the Final Response
        response_data = {
            'statistics': {
                'total_members': total_members,
                'active_members': active_members,
                'inactive_members': total_members - active_members,
            },
            'members': list_data
        }

        # Handle pagination for the final response
        if page is not None:
            return self.get_paginated_response(response_data)

        return Response(response_data)

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Get dashboard statistics"""
        total_members = Member.objects.count()
        active_members = sum(1 for m in Member.objects.all() if m.is_active())

        revenue_stats = Membership.objects.aggregate(
            total_revenue=Sum('price'),
            combatrix_revenue=Sum('combatrix_share'),
            fitshala_revenue=Sum('fitshala_share')
        )

        # Expiring soon
        today = timezone.now().date()
        fifteen_days_later = today + timedelta(days=15)
        expiring_soon = Membership.objects.filter(
            end_date__gte=today,
            end_date__lte=fifteen_days_later
        ).select_related('member')
        print("expiring soon",  MembershipSerializer(
            expiring_soon, many=True).data)

        return Response({
            'total_members': total_members,
            'active_members': active_members,
            'total_revenue': revenue_stats['total_revenue'] or 0,
            'combatrix_revenue': revenue_stats['combatrix_revenue'] or 0,
            'fitshala_revenue': revenue_stats['fitshala_revenue'] or 0,
            'expiring_soon': MembershipSerializer(expiring_soon, many=True).data
        })


class MembershipViewSet(viewsets.ModelViewSet):
    queryset = Membership.objects.all()
    serializer_class = MembershipSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['member']
    ordering_fields = ['start_date', 'end_date']

    @action(detail=False, methods=['post'])
    def revenue_analysis(self, request):
        """Analyze revenue for a date range"""
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')

        memberships = Membership.objects.filter(
            start_date__gte=start_date,
            start_date__lte=end_date
        )

        stats = memberships.aggregate(
            total_revenue=Sum('price'),
            combatrix_revenue=Sum('combatrix_share'),
            fitshala_revenue=Sum('fitshala_share'),
            member_count=Count('member', distinct=True)
        )
   
        monthly_data = memberships.annotate(
            month=TruncMonth('start_date')
        ).values('month').annotate(
            revenue=Sum('price'),
            combatrix=Sum('combatrix_share'),
            fitshala=Sum('fitshala_share'),
            count=Count('id')
        ).order_by('month')

        return Response({
            'stats': stats,
            'monthly_data': list(monthly_data),
            'memberships': MembershipSerializer(memberships, many=True).data
        })


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['member', 'status', 'date']
    ordering_fields = ['date', 'check_in_time', 'status']
    ordering = ['-date', '-check_in_time']

    def get_queryset(self):
        """Filter attendance based on user role"""
        user = self.request.user

        if user.is_staff:
            # Admins can see all attendance
            return Attendance.objects.all().select_related('member', 'confirmed_by')
        else:
            # Regular users can only see their own attendance
            # Assuming user has a related member profile
            try:
                member = Member.objects.get(email=user.email)
                return Attendance.objects.filter(member=member).select_related('member', 'confirmed_by')
            except Member.DoesNotExist:
                return Attendance.objects.none()

    def perform_create(self, serializer):
        """Auto-set member for non-admin users"""
        user = self.request.user

        if not user.is_staff:
            # For regular users, set member based on their profile
            try:
                member = Member.objects.get(email=user.email)
                serializer.save(member=member, date=timezone.now().date())
            except Member.DoesNotExist:
                raise Exception(
                    "No member profile found for this user")
        else:
            serializer.save()

    @action(detail=False, methods=['post'])
    def mark_today(self, request):
        """Quick action to mark attendance for today"""
        user = request.user

        if user.is_staff and 'member_id' in request.data:
            # Admin marking for a specific member
            member_id = request.data['member_id']
            try:
                member = Member.objects.get(id=member_id)
            except Member.DoesNotExist:
                return Response(
                    {'error': 'Member not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Regular user marking their own attendance
            try:
                member = Member.objects.get(email=user.email)
            except Member.DoesNotExist:
                return Response(
                    {'error': 'No member profile found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        today = timezone.now().date()

        # Check if already marked
        existing = Attendance.objects.filter(
            member=member,
            date=today
        ).exclude(status=Attendance.STATUS_REJECTED).first()

        if existing:
            return Response(
                {
                    'error': f'Attendance already marked for today',
                    'attendance': AttendanceSerializer(existing).data
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create attendance
        attendance_data = {
            'member': member.id,
            'date': today,
            'status': Attendance.STATUS_CONFIRMED if user.is_staff else Attendance.STATUS_PENDING
        }

        serializer = AttendanceSerializer(data=attendance_data)
        if serializer.is_valid():
            attendance = serializer.save()

            # Auto-confirm if admin is marking
            if user.is_staff:
                attendance.confirm(user)

            return Response(
                AttendanceSerializer(attendance).data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def confirm(self, request, pk=None):
        """Confirm a pending attendance"""
        attendance = self.get_object()

        if attendance.status != Attendance.STATUS_PENDING:
            return Response(
                {'error': f'Attendance is already {attendance.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        attendance.confirm(request.user)

        # Update leaderboard
        MonthlyLeaderboard.update_for_month(
            attendance.date.year,
            attendance.date.month
        )

        return Response(
            AttendanceSerializer(attendance).data,
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def reject(self, request, pk=None):
        """Reject a pending attendance"""
        attendance = self.get_object()

        if attendance.status != Attendance.STATUS_PENDING:
            return Response(
                {'error': f'Attendance is already {attendance.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        reason = request.data.get('notes', '')
        attendance.reject(request.user, reason)

        return Response(
            AttendanceSerializer(attendance).data,
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get all pending attendance requests (admin only)"""
        if not request.user.is_staff:
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )

        pending_attendance = Attendance.objects.filter(
            status=Attendance.STATUS_PENDING
        ).select_related('member').order_by('date', 'check_in_time')

        serializer = AttendanceSerializer(pending_attendance, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def bulk_confirm(self, request):
        """Confirm multiple attendance records at once"""
        attendance_ids = request.data.get('attendance_ids', [])

        if not attendance_ids:
            return Response(
                {'error': 'No attendance IDs provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        attendances = Attendance.objects.filter(
            id__in=attendance_ids,
            status=Attendance.STATUS_PENDING
        )

        confirmed_count = 0
        for attendance in attendances:
            attendance.confirm(request.user)
            confirmed_count += 1

            # Update leaderboard for each month
            MonthlyLeaderboard.update_for_month(
                attendance.date.year,
                attendance.date.month
            )

        return Response({
            'confirmed': confirmed_count,
            'message': f'Successfully confirmed {confirmed_count} attendance records'
        })

    @action(detail=False, methods=['get'])
    def my_stats(self, request):
        """Get attendance statistics for the current user"""
        user = request.user

        try:
            member = Member.objects.get(email=user.email)
        except Member.DoesNotExist:
            return Response(
                {'error': 'No member profile found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Calculate stats
        all_attendance = Attendance.objects.filter(member=member)

        total_days = all_attendance.count()
        confirmed_days = all_attendance.filter(
            status=Attendance.STATUS_CONFIRMED).count()
        pending_days = all_attendance.filter(
            status=Attendance.STATUS_PENDING).count()

        # Current month
        today = timezone.now().date()
        current_month_days = all_attendance.filter(
            date__year=today.year,
            date__month=today.month,
            status=Attendance.STATUS_CONFIRMED
        ).count()

        # Calculate streak
        streak = 0
        current_date = today
        while True:
            if all_attendance.filter(
                date=current_date,
                status=Attendance.STATUS_CONFIRMED
            ).exists():
                streak += 1
                current_date -= timedelta(days=1)
            else:
                break

        # Attendance rate
        attendance_rate = (confirmed_days / total_days *
                           100) if total_days > 0 else 0

        stats_data = {
            'total_days': total_days,
            'confirmed_days': confirmed_days,
            'pending_days': pending_days,
            'current_month_days': current_month_days,
            'streak': streak,
            'attendance_rate': round(attendance_rate, 2)
        }

        serializer = AttendanceStatsSerializer(stats_data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def heatmap(self, request):
        """Get heatmap data for the last year (GitHub style)"""
        user = request.user

        # Get member
        member_id = request.query_params.get('member_id')
        if member_id and user.is_staff:
            try:
                member = Member.objects.get(id=member_id)
            except Member.DoesNotExist:
                return Response(
                    {'error': 'Member not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            try:
                member = Member.objects.get(email=user.email)
            except Member.DoesNotExist:
                return Response(
                    {'error': 'No member profile found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Get last 365 days of attendance
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=365)

        attendance_data = Attendance.objects.filter(
            member=member,
            date__gte=start_date,
            date__lte=end_date
        ).values('date', 'status')

        # Create heatmap data
        heatmap = []
        attendance_dict = {item['date']: item['status']
                           for item in attendance_data}

        current_date = start_date
        while current_date <= end_date:
            heatmap.append({
                'date': current_date,
                'count': 1 if current_date in attendance_dict else 0,
                'status': attendance_dict.get(current_date, 'none')
            })
            current_date += timedelta(days=1)

        serializer = AttendanceHeatmapSerializer(heatmap, many=True)
        return Response(serializer.data)


class LeaderboardViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MonthlyLeaderboard.objects.all()
    serializer_class = MonthlyLeaderboardSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['year', 'month']
    ordering = ['rank']

    @action(detail=False, methods=['get'])
    def current_month(self, request):
        """Get leaderboard for current month"""
        today = timezone.now().date()
        year = today.year
        month = today.month

        # Update leaderboard
        leaderboard = MonthlyLeaderboard.update_for_month(year, month)

        serializer = MonthlyLeaderboardSerializer(leaderboard, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def refresh(self, request):
        """Manually refresh leaderboard for a specific month"""
        year = request.data.get('year', timezone.now().year)
        month = request.data.get('month', timezone.now().month)

        leaderboard = MonthlyLeaderboard.update_for_month(year, month)

        serializer = MonthlyLeaderboardSerializer(leaderboard, many=True)
        return Response({
            'message': f'Leaderboard refreshed for {year}-{month:02d}',
            'leaderboard': serializer.data
        })
