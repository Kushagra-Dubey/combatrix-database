import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'combatrix.settings')
django.setup()

from combatrix.models import Member

# Check if member 57 exists
try:
    member = Member.objects.get(id=57)
    print(f"Member ID 57 found: {member.name}")
    print(f"Email: {member.email}")
    print(f"Status: {member.status}")
except Member.DoesNotExist:
    print("Member ID 57 does not exist")

# Show all member IDs
all_members = Member.objects.all().order_by('id')
print(f"\nTotal members: {all_members.count()}")
print("\nAll member IDs:")
for member in all_members:
    print(f"  ID {member.id}: {member.name} (status: {member.status})")
