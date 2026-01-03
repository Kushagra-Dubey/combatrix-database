from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta
from .models import Member, Membership
from .serializers import MemberDetailSerializer, MemberListSerializer, MembershipSerializer

class MemberViewSet(viewsets.ModelViewSet):
    queryset = Member.objects.all()
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
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
        print("expiring soon",  MembershipSerializer(expiring_soon, many=True).data)
        
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
        
        # Monthly breakdown
        from django.db.models.functions import TruncMonth
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