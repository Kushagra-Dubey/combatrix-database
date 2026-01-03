import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'combatrix.settings')
django.setup()

from combatrix.models import Member

members = Member.objects.all()
print(f'Total members: {members.count()}')
print('\nStatus breakdown:')
for status in ['active', 'inactive', 'deleted']:
    count = Member.objects.filter(status=status).count()
    print(f'  {status}: {count}')

print('\nFirst 5 members with their status:')
for member in members[:5]:
    print(f'  {member.name}: status="{member.status}"')
