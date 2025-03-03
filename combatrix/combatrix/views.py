# views.py
from django.shortcuts import render, redirect, get_object_or_404
from django.views.generic import ListView, DetailView, CreateView, UpdateView
from django.urls import reverse_lazy
from .models import Member, Membership
from .forms import MemberForm, MembershipForm
from django.db.models import Sum, Q
from django.utils import timezone

class MemberListView(ListView):
    model = Member
    template_name = 'gym/member_list.html'
    context_object_name = 'members'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Add summary data for visualization
        context['total_members'] = Member.objects.count()
        context['active_members'] = sum(member.is_active() for member in context['members'])
        context['total_revenue'] = Membership.objects.aggregate(Sum('price'))['price__sum'] or 0
        context['combatrix_revenue'] = Membership.objects.aggregate(Sum('combatrix_share'))['combatrix_share__sum'] or 0
        context['fitshala_revenue'] = Membership.objects.aggregate(Sum('fitshala_share'))['fitshala_share__sum'] or 0
        
        # Memberships expiring in the next 30 days
        today = timezone.now().date()
        fifteen_days_later = today + timezone.timedelta(days=15)
        expiring_soon = Membership.objects.filter(
            end_date__gte=today,
            end_date__lte=fifteen_days_later
        ).select_related('member')
        context['expiring_soon'] = expiring_soon
        
        return context

class MemberDetailView(DetailView):
    model = Member
    template_name = 'gym/member_detail.html'
    context_object_name = 'member'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['memberships'] = self.object.memberships.order_by('-end_date')
        context['today'] = timezone.now().date()
        return context

class MemberCreateView(CreateView):
    model = Member
    form_class = MemberForm
    template_name = 'gym/member_form.html'
    success_url = reverse_lazy('member-list')

class MembershipCreateView(CreateView):
    model = Membership
    form_class = MembershipForm
    template_name = 'gym/membership_form.html'
    
    def get_initial(self):
        initial = super().get_initial()
        if 'member_id' in self.kwargs:
            initial['member'] = get_object_or_404(Member, pk=self.kwargs['member_id'])
        return initial
    
    def get_success_url(self):
        return reverse_lazy('member-detail', kwargs={'pk': self.object.member.pk})