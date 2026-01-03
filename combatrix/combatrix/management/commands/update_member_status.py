from django.core.management.base import BaseCommand
from django.utils import timezone
from combatrix.models import Member


class Command(BaseCommand):
    help = 'Update member status based on their latest membership expiration'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed output for each member',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        verbose = options['verbose']
        
        self.stdout.write(
            self.style.SUCCESS('Starting member status update...')
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No changes will be made')
            )
        
        # Get all members
        members = Member.objects.all()
        total_members = members.count()
        
        # Counters
        updated_to_inactive = 0
        updated_to_active = 0
        already_correct = 0
        no_membership = 0
        skipped_deleted = 0
        
        today = timezone.now().date()
        
        for member in members:
            # Skip deleted members
            if member.status == Member.STATUS_DELETED:
                skipped_deleted += 1
                if verbose:
                    self.stdout.write(
                        self.style.WARNING(f'Skipped (deleted): {member.name}')
                    )
                continue
            
            # Get latest membership
            latest_membership = member.memberships.order_by('-end_date').first()
            
            if not latest_membership:
                no_membership += 1
                if verbose:
                    self.stdout.write(
                        self.style.WARNING(f'No membership found: {member.name} (Current status: {member.status})')
                    )
                
                # If member has no membership and status is active, mark as inactive
                if member.status == Member.STATUS_ACTIVE:
                    if not dry_run:
                        member.status = Member.STATUS_INACTIVE
                        member.save()
                        updated_to_inactive += 1
                        self.stdout.write(
                            self.style.SUCCESS(f'Updated to INACTIVE: {member.name} (No membership)')
                        )
                    else:
                        updated_to_inactive += 1
                        self.stdout.write(
                            self.style.SUCCESS(f'Would update to INACTIVE: {member.name} (No membership)')
                        )
                continue
            
            # Check if membership is expired
            is_expired = latest_membership.end_date < today
            
            if verbose:
                self.stdout.write(
                    f'\nChecking: {member.name}'
                )
                self.stdout.write(
                    f'  Current status: {member.status}'
                )
                self.stdout.write(
                    f'  Latest membership end date: {latest_membership.end_date}'
                )
                self.stdout.write(
                    f'  Is expired: {is_expired}'
                )
            
            # Determine correct status
            if is_expired:
                correct_status = Member.STATUS_INACTIVE
            else:
                correct_status = Member.STATUS_ACTIVE
            
            # Update if needed
            if member.status != correct_status:
                if not dry_run:
                    member.status = correct_status
                    member.save()
                    
                    if correct_status == Member.STATUS_INACTIVE:
                        updated_to_inactive += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'Updated to INACTIVE: {member.name} (Membership expired on {latest_membership.end_date})'
                            )
                        )
                    else:
                        updated_to_active += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'Updated to ACTIVE: {member.name} (Membership valid until {latest_membership.end_date})'
                            )
                        )
                else:
                    if correct_status == Member.STATUS_INACTIVE:
                        updated_to_inactive += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'Would update to INACTIVE: {member.name} (Membership expired on {latest_membership.end_date})'
                            )
                        )
                    else:
                        updated_to_active += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'Would update to ACTIVE: {member.name} (Membership valid until {latest_membership.end_date})'
                            )
                        )
            else:
                already_correct += 1
                if verbose:
                    self.stdout.write(
                        f'  Status already correct: {member.status}'
                    )
        
        # Print summary
        self.stdout.write(
            self.style.SUCCESS('\n=== UPDATE SUMMARY ===')
        )
        self.stdout.write(f'Total members processed: {total_members}')
        self.stdout.write(f'Updated to INACTIVE: {updated_to_inactive}')
        self.stdout.write(f'Updated to ACTIVE: {updated_to_active}')
        self.stdout.write(f'Already correct status: {already_correct}')
        self.stdout.write(f'No membership found: {no_membership}')
        self.stdout.write(f'Skipped (deleted): {skipped_deleted}')
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('\nDRY RUN completed - No changes were made')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'\nStatus update completed! Updated {updated_to_inactive + updated_to_active} members.')
            )
