import psycopg2
from psycopg2.extras import RealDictCursor

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from combatrix.models import Member, Membership, Attendance, MonthlyLeaderboard


class Command(BaseCommand):
    help = (
        'Sync Members and Membership data from an external PostgreSQL database '
        'into the current (local) database. '
        'WARNING: This DELETES all existing Member/Membership records (and their '
        'related Attendance/MonthlyLeaderboard rows) in the local database before '
        'importing the fresh data from the external source.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--external-db-url',
            type=str,
            required=False,
            help='External PostgreSQL database URL (e.g., postgresql://user:password@host:port/dbname)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Fetch and show what would be synced without changing the local database',
        )
        parser.add_argument(
            '--yes',
            action='store_true',
            help='Skip the interactive confirmation prompt (needed for non-interactive/cron use)',
        )

    def handle(self, *args, **options):
        external_db_url = options.get('external_db_url')

        if not external_db_url:
            raise CommandError(
                'Please provide external database URL via --external-db-url argument.'
            )

        dry_run = options['dry_run']

        if not dry_run and not options['yes']:
            confirm = input(
                'This will DELETE all existing Member/Membership/Attendance/'
                'MonthlyLeaderboard data in the LOCAL database and replace it with '
                'data from the external database. Type "yes" to continue: '
            )
            if confirm.strip().lower() != 'yes':
                self.stdout.write(self.style.WARNING('Aborted. No changes were made.'))
                return

        self.stdout.write(self.style.SUCCESS('Starting sync from external database...'))

        members_data, memberships_data = self.fetch_external_data(external_db_url)

        self.stdout.write(self.style.SUCCESS(
            f'Fetched {len(members_data)} members and {len(memberships_data)} '
            f'memberships from external database.'
        ))

        if dry_run:
            self.stdout.write(self.style.WARNING(
                '\nDRY RUN - local database was not modified.'
            ))
            self.stdout.write('Would delete all local Members/Memberships/Attendance/'
                               'MonthlyLeaderboard records.')
            self.stdout.write(f'Would create {len(members_data)} members and '
                               f'{len(memberships_data)} memberships locally.')
            return

        created_members, created_memberships = self.replace_local_data(
            members_data, memberships_data
        )

        self.stdout.write(self.style.SUCCESS('\n=== SYNC SUMMARY ==='))
        self.stdout.write(f'Members imported:     {created_members}')
        self.stdout.write(f'Memberships imported: {created_memberships}')
        self.stdout.write(self.style.SUCCESS('\nSync completed successfully!'))

    def fetch_external_data(self, db_url):
        """Connect to the external database and fetch members + memberships."""
        connection = None
        try:
            self.stdout.write('Connecting to external database...')
            connection = psycopg2.connect(db_url)
            self.stdout.write(self.style.SUCCESS('✓ Connected to external database'))

            members_query = """
                SELECT
                    id,
                    name,
                    email,
                    phone_number,
                    emergency_contact_name,
                    emergency_contact_number,
                    date_joined,
                    status
                FROM combatrix_member
                ORDER BY date_joined DESC
            """
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(members_query)
                members_data = cursor.fetchall()

            memberships_query = """
                SELECT
                    m.id,
                    m.member_id,
                    mem.email as member_email,
                    m.start_date,
                    m.end_date,
                    m.price,
                    m.combatrix_share,
                    m.fitshala_share,
                    m.created_at
                FROM combatrix_membership m
                JOIN combatrix_member mem ON m.member_id = mem.id
                ORDER BY m.start_date DESC
            """
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(memberships_query)
                memberships_data = cursor.fetchall()

            return members_data, memberships_data

        except psycopg2.OperationalError as e:
            raise CommandError(f'Database connection error: {str(e)}')
        except psycopg2.ProgrammingError as e:
            raise CommandError(f'Database query error (check if tables exist): {str(e)}')
        finally:
            if connection:
                connection.close()
                self.stdout.write('Connection closed')

    @transaction.atomic
    def replace_local_data(self, members_data, memberships_data):
        """Wipe local Member/Membership (+ dependent) data and re-import from source."""

        # Delete dependent data first (FK -> Member), then Members/Memberships.
        self.stdout.write('Deleting existing local data...')
        deleted_attendance = Attendance.objects.all().delete()[0]
        deleted_leaderboard = MonthlyLeaderboard.objects.all().delete()[0]
        deleted_memberships = Membership.objects.all().delete()[0]
        deleted_members = Member.objects.all().delete()[0]
        self.stdout.write(self.style.WARNING(
            f'  Deleted {deleted_members} members, {deleted_memberships} memberships, '
            f'{deleted_attendance} attendance records, {deleted_leaderboard} leaderboard entries.'
        ))

        # Recreate Members, preserving external IDs so Membership FK references match.
        self.stdout.write('Importing members...')
        member_objs = []
        for row in members_data:
            member_objs.append(Member(
                id=row['id'],
                name=row.get('name') or '',
                email=row['email'],
                phone_number=row.get('phone_number') or '',
                emergency_contact_name=row.get('emergency_contact_name') or '',
                emergency_contact_number=row.get('emergency_contact_number') or '',
                date_joined=row.get('date_joined'),
                status=row.get('status') or Member.STATUS_ACTIVE,
            ))
        Member.objects.bulk_create(member_objs)

        # Recreate Memberships, preserving external IDs.
        self.stdout.write('Importing memberships...')
        membership_objs = []
        skipped = 0
        valid_member_ids = {m.id for m in member_objs}
        for row in memberships_data:
            if row['member_id'] not in valid_member_ids:
                skipped += 1
                continue
            membership_objs.append(Membership(
                id=row['id'],
                member_id=row['member_id'],
                start_date=row.get('start_date'),
                end_date=row.get('end_date'),
                price=row.get('price') or 0,
                combatrix_share=row.get('combatrix_share') or 0,
                fitshala_share=row.get('fitshala_share') or 0,
            ))
        Membership.objects.bulk_create(membership_objs)

        if skipped:
            self.stdout.write(self.style.WARNING(
                f'  Skipped {skipped} memberships referencing unknown members.'
            ))

        # bulk_create() does not call Membership.save(), so member statuses need
        # to be recalculated based on the freshly imported memberships.
        self.stdout.write('Recalculating member statuses...')
        for member in Member.objects.all():
            member.auto_update_status()

        return len(member_objs), len(membership_objs)
