from rest_framework import serializers
from .models import Member, Membership
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
