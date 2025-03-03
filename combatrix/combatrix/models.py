# models.py
from django.db import models
from django.utils import timezone

class Member(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=15)
    emergency_contact_name = models.CharField(max_length=100)
    emergency_contact_number = models.CharField(max_length=15)
    date_joined = models.DateField(default=timezone.now)
    
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