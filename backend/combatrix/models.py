# models.py
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
from django.db.models import Count


class Member(models.Model):
    # Status choices
    STATUS_ACTIVE = 'active'
    STATUS_INACTIVE = 'inactive'
    STATUS_DELETED = 'deleted'
    
    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_INACTIVE, 'Inactive'),
        (STATUS_DELETED, 'Deleted'),
    ]
    
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=15)
    emergency_contact_name = models.CharField(max_length=100)
    emergency_contact_number = models.CharField(max_length=15)
    date_joined = models.DateField(default=timezone.now)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
        help_text="Current status of the member"
    )
    
    def __str__(self):
        return self.name
    
    def is_active(self):
        """Check if member has an active membership"""
        latest_membership = self.memberships.order_by('-end_date').first()
        if latest_membership:
            return latest_membership.end_date >= timezone.now().date()
        return False
    
    def membership_end_date(self):
        latest_membership = self.memberships.order_by('-end_date').first()
        if latest_membership:
            return latest_membership.end_date
        return None
    
    def total_revenue(self):
        return sum(membership.price for membership in self.memberships.all())
    
    def combatrix_total_share(self):
        return sum(membership.combatrix_share for membership in self.memberships.all())
    
    def fitshala_total_share(self):
        return sum(membership.fitshala_share for membership in self.memberships.all())
    
    def auto_update_status(self):
        """Automatically update status based on membership"""
        is_member_active = self.is_active()
        
        # Only update if status is active or inactive
        # Don't change suspended or terminated statuses automatically
        if self.status in [self.STATUS_ACTIVE, self.STATUS_INACTIVE]:
            if is_member_active and self.status == self.STATUS_INACTIVE:
                self.status = self.STATUS_ACTIVE
                self.save()
            elif not is_member_active and self.status == self.STATUS_ACTIVE:
                self.status = self.STATUS_INACTIVE
                self.save()
        
        return self.status


class Membership(models.Model):
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='memberships')
    start_date = models.DateField()
    end_date = models.DateField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    combatrix_share = models.DecimalField(max_digits=10, decimal_places=2)
    fitshala_share = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.member.name}'s membership ({self.start_date} to {self.end_date})"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update member status when membership changes
        self.member.auto_update_status()

class Attendance(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_CONFIRMED = 'confirmed'
    STATUS_REJECTED = 'rejected'
    
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_CONFIRMED, 'Confirmed'),
        (STATUS_REJECTED, 'Rejected'),
    ]
    
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='attendances')
    date = models.DateField(default=timezone.now)
    check_in_time = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        help_text="Attendance confirmation status"
    )
    confirmed_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='confirmed_attendances',
        help_text="Admin who confirmed the attendance"
    )
    confirmed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, help_text="Optional notes from admin")
    
    class Meta:
        unique_together = ['member', 'date']
        ordering = ['-date', '-check_in_time']
        indexes = [
            models.Index(fields=['member', 'date']),
            models.Index(fields=['status', 'date']),
        ]
    
    def __str__(self):
        return f"{self.member.name} - {self.date} ({self.status})"
    
    def confirm(self, admin_user):
        """Confirm the attendance"""
        self.status = self.STATUS_CONFIRMED
        self.confirmed_by = admin_user
        self.confirmed_at = timezone.now()
        self.save()
    
    def reject(self, admin_user, reason=""):
        """Reject the attendance"""
        self.status = self.STATUS_REJECTED
        self.confirmed_by = admin_user
        self.confirmed_at = timezone.now()
        if reason:
            self.notes = reason
        self.save()


class MonthlyLeaderboard(models.Model):
    """Cache for monthly attendance leaderboard"""
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='leaderboard_entries')
    year = models.IntegerField()
    month = models.IntegerField()  # 1-12
    attendance_count = models.IntegerField(default=0)
    rank = models.IntegerField(null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['member', 'year', 'month']
        ordering = ['-year', '-month', '-attendance_count']
        indexes = [
            models.Index(fields=['year', 'month', '-attendance_count']),
        ]
    
    def __str__(self):
        return f"{self.member.name} - {self.year}/{self.month:02d} - {self.attendance_count} days"
    
    @classmethod
    def update_for_month(cls, year, month):
        """Update leaderboard for a specific month"""
        
        # Get attendance counts for the month
        attendance_counts = Attendance.objects.filter(
            date__year=year,
            date__month=month,
            status=Attendance.STATUS_CONFIRMED
        ).values('member').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Update or create leaderboard entries
        for entry in attendance_counts:
            cls.objects.update_or_create(
                member_id=entry['member'],
                year=year,
                month=month,
                defaults={'attendance_count': entry['count']}
            )
        
        # Update ranks
        leaderboard = cls.objects.filter(year=year, month=month).order_by('-attendance_count')
        for rank, entry in enumerate(leaderboard, start=1):
            entry.rank = rank
            entry.save(update_fields=['rank'])
        
        return leaderboard