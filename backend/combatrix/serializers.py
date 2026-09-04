from rest_framework import serializers
from .models import Member, Membership, Attendance, MonthlyLeaderboard
from django.utils import timezone


class MembershipSerializer(serializers.ModelSerializer):
    is_active = serializers.SerializerMethodField()

    # WRITE: accept member ID
    member = serializers.PrimaryKeyRelatedField(
        queryset=Member.objects.all(),
        write_only=True
    )

    # READ: return member name (string)
    member_name = serializers.CharField(
        source="member.name",
        read_only=True
    )

    class Meta:
        model = Membership
        fields = '__all__'

    def get_is_active(self, obj):
        return obj.end_date >= timezone.now().date()


class MemberListSerializer(serializers.ModelSerializer):
    is_active = serializers.SerializerMethodField()
    membership_end_date = serializers.SerializerMethodField()
    total_revenue = serializers.SerializerMethodField()

    class Meta:
        model = Member
        fields = [
            'id', 'name', 'email', 'phone_number',
            'date_joined', 'status', 'is_active',
            'membership_end_date', 'total_revenue'
        ]

    def get_is_active(self, obj):
        return obj.is_active()

    def get_membership_end_date(self, obj):
        return obj.membership_end_date()

    def get_total_revenue(self, obj):
        return obj.total_revenue()


class MemberDetailSerializer(serializers.ModelSerializer):
    memberships = MembershipSerializer(many=True, read_only=True)
    is_active = serializers.SerializerMethodField()
    total_revenue = serializers.SerializerMethodField()
    combatrix_total_share = serializers.SerializerMethodField()
    fitshala_total_share = serializers.SerializerMethodField()

    class Meta:
        model = Member
        fields = '__all__'

    def get_is_active(self, obj):
        return obj.is_active()

    def get_total_revenue(self, obj):
        return obj.total_revenue()

    def get_combatrix_total_share(self, obj):
        return obj.combatrix_total_share()

    def get_fitshala_total_share(self, obj):
        return obj.fitshala_total_share()
    

class AttendanceSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.name', read_only=True)
    member_email = serializers.CharField(source='member.email', read_only=True)
    confirmed_by_name = serializers.CharField(source='confirmed_by.username', read_only=True)
    
    class Meta:
        model = Attendance
        fields = [
            'id', 'member', 'member_name', 'member_email',
            'date', 'check_in_time', 'status',
            'confirmed_by', 'confirmed_by_name', 'confirmed_at',
            'notes'
        ]
        read_only_fields = ['check_in_time', 'confirmed_by', 'confirmed_at']
    
    def validate(self, data):
        """Prevent duplicate attendance for the same day"""
        member = data.get('member')
        date = data.get('date', timezone.now().date())
        
        # Check if attendance already exists for this member on this date
        if self.instance is None:  # Only check on creation
            existing = Attendance.objects.filter(
                member=member,
                date=date
            ).exclude(status=Attendance.STATUS_REJECTED).first()
            
            if existing:
                raise serializers.ValidationError(
                    f"Attendance for {date} already exists with status: {existing.status}"
                )
        
        return data


class AttendanceStatsSerializer(serializers.Serializer):
    """Serializer for attendance statistics"""
    total_days = serializers.IntegerField()
    confirmed_days = serializers.IntegerField()
    pending_days = serializers.IntegerField()
    current_month_days = serializers.IntegerField()
    streak = serializers.IntegerField()
    attendance_rate = serializers.FloatField()


class MonthlyLeaderboardSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.name', read_only=True)
    member_email = serializers.CharField(source='member.email', read_only=True)
    
    class Meta:
        model = MonthlyLeaderboard
        fields = [
            'id', 'member', 'member_name', 'member_email',
            'year', 'month', 'attendance_count', 'rank',
            'last_updated'
        ]


class AttendanceHeatmapSerializer(serializers.Serializer):
    """Serializer for GitHub-style attendance heatmap data"""
    date = serializers.DateField()
    count = serializers.IntegerField()
    status = serializers.CharField()
