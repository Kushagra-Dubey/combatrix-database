# combatrix/management/commands/send_holi_notification.py
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone
from combatrix.models import Member

class Command(BaseCommand):
    help = 'Sends Holi greetings and academy closure notification to all members'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Print emails that would be sent without actually sending them',
        )

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)
        print("dry_run received", dry_run)
        # Get all members
        members = Member.objects.filter(status="active")
        
        if not members:
            self.stdout.write(self.style.WARNING('No members found in the database.'))
            return
        
        # Email content
        subject = "Happy Holi - Combatrix Academy Closure Notice"
        
        # Email body
        email_body = """
Dear {name},

Warm greetings from Combatrix Academy!

We wish you and your family a very Happy Holi filled with vibrant colors, joy, and prosperity.

Please note that our academy will remain CLOSED on {closure_date} on the occasion of Holi.

Regular classes will resume from {resume_date}.

If you have any questions or concerns, please feel free to contact us.

Best regards,
Team Combatrix
        """
        
        # Get tomorrow's date for closure
        tomorrow = timezone.now().date() + timezone.timedelta(days=1)
        resume_date = tomorrow + timezone.timedelta(days=3)
        
        # Format dates
        closure_date = tomorrow.strftime("%A, %d %B %Y")
        resume_date = resume_date.strftime("%A, %d %B %Y")
        
        successful_count = 0
        failed_emails = []
        
        # Send emails
        for member in members:
            personalized_message = email_body.format(
                name=member.name,
                closure_date=closure_date,
                resume_date=resume_date
            )
            
            if dry_run:
                self.stdout.write(f"Would send email to: {member.email}")
                self.stdout.write(f"Subject: {subject}")
                self.stdout.write(f"Message: {personalized_message}")
                self.stdout.write("-" * 40)
                successful_count += 1
                continue
            
            try:
                send_mail(
                    subject=subject,
                    message=personalized_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[member.email],
                    fail_silently=False,
                )
                successful_count += 1
                # self.stdout.write(f"Email sent to {member.email}")
            except Exception as e:
                failed_emails.append((member.email, str(e)))
                self.stdout.write(self.style.ERROR(f"Failed to send email to {member.email}: {e}"))
        
        # Summary
        self.stdout.write(self.style.SUCCESS(f'Process completed. Emails sent: {successful_count}/{len(members)}'))
        
        if failed_emails:
            self.stdout.write(self.style.WARNING('Failed emails:'))
            for email, error in failed_emails:
                self.stdout.write(f"  - {email}: {error}")