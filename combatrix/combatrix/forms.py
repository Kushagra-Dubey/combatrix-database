# forms.py
from django import forms
from .models import Member, Membership

class MemberForm(forms.ModelForm):
    class Meta:
        model = Member
        fields = ['name', 'email', 'phone_number', 'emergency_contact_name', 'emergency_contact_number']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'phone_number': forms.TextInput(attrs={'class': 'form-control'}),
            'emergency_contact_name': forms.TextInput(attrs={'class': 'form-control'}),
            'emergency_contact_number': forms.TextInput(attrs={'class': 'form-control'}),
        }

class MembershipForm(forms.ModelForm):
    class Meta:
        model = Membership
        fields = ['member', 'start_date', 'end_date', 'price', 'combatrix_share', 'fitshala_share']
        widgets = {
            'member': forms.Select(attrs={'class': 'form-control'}),
            'start_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'end_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'price': forms.NumberInput(attrs={'class': 'form-control'}),
            'combatrix_share': forms.NumberInput(attrs={'class': 'form-control'}),
            'fitshala_share': forms.NumberInput(attrs={'class': 'form-control'}),
        }
    
    def clean(self):
        cleaned_data = super().clean()
        start_date = cleaned_data.get('start_date')
        end_date = cleaned_data.get('end_date')
        price = cleaned_data.get('price')
        combatrix_share = cleaned_data.get('combatrix_share')
        fitshala_share = cleaned_data.get('fitshala_share')
        
        if start_date and end_date and start_date > end_date:
            raise forms.ValidationError("End date cannot be before start date")
        
        if price and combatrix_share and fitshala_share:
            if combatrix_share + fitshala_share != price:
                raise forms.ValidationError("Combatrix share and Fitshala share must sum up to the total price")
        
        return cleaned_data