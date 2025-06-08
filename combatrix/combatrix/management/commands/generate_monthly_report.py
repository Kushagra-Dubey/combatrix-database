from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from datetime import datetime, date
from collections import defaultdict
import pandas as pd
from decimal import Decimal
import os

from combatrix.models import Member, Membership  # Replace 'your_app' with your actual app name


class Command(BaseCommand):
    help = 'Generate monthly report for MMA gym members and memberships'

    def add_arguments(self, parser):
        parser.add_argument(
            '--start-date',
            type=str,
            help='Start date for the report (YYYY-MM-DD format)',
        )
        parser.add_argument(
            '--end-date',
            type=str,
            help='End date for the report (YYYY-MM-DD format)',
        )
        parser.add_argument(
            '--output-dir',
            type=str,
            default='.',
            help='Output directory for the Excel file (default: current directory)',
        )
        parser.add_argument(
            '--filename',
            type=str,
            help='Custom filename for the Excel file (without extension)',
        )
        parser.add_argument(
            '--status',
            type=str,
            choices=['active', 'inactive', 'deleted', 'all'],
            default='all',
            help='Filter members by status (default: all)',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('Starting MMA Gym Monthly Report Generation...')
        )

        try:
            # Parse date filters
            start_date = None
            end_date = None
            
            if options['start_date']:
                start_date = datetime.strptime(options['start_date'], '%Y-%m-%d').date()
                
            if options['end_date']:
                end_date = datetime.strptime(options['end_date'], '%Y-%m-%d').date()

            # Generate reports
            monthly_data = self.generate_monthly_report(start_date, end_date, options['status'])
            summary_df = self.create_excel_report(monthly_data)
            detailed_df = self.generate_detailed_membership_report(start_date, end_date, options['status'])

            # Save Excel file
            filename = self.save_excel_report(summary_df, detailed_df, options)
            
            # Print summary
            self.print_summary_statistics(start_date, end_date, options['status'])
            
            self.stdout.write(
                self.style.SUCCESS(f'Report generated successfully: {filename}')
            )

        except Exception as e:
            raise CommandError(f'Error generating report: {str(e)}')

    def generate_monthly_report(self, start_date=None, end_date=None, status_filter='all'):
        """
        Generate month-wise report for member registrations and memberships
        """
        
        # Dictionary to store monthly data
        monthly_data = defaultdict(lambda: {
            'new_members': 0,
            'new_memberships': 0,
            'total_revenue': Decimal('0.00'),
            'combatrix_share': Decimal('0.00'),
            'fitshala_share': Decimal('0.00'),
            'member_names': [],
            'membership_details': []
        })
        
        # Get filtered members
        members_qs = Member.objects.all()
        
        if status_filter != 'all':
            members_qs = members_qs.filter(status=status_filter)
            
        if start_date:
            members_qs = members_qs.filter(date_joined__gte=start_date)
            
        if end_date:
            members_qs = members_qs.filter(date_joined__lte=end_date)
        
        # Process member registrations
        for member in members_qs:
            reg_month_key = member.date_joined.strftime('%Y-%m')
            month_name = member.date_joined.strftime('%B %Y')
            
            monthly_data[reg_month_key]['new_members'] += 1
            monthly_data[reg_month_key]['member_names'].append(member.name)
            monthly_data[reg_month_key]['month_name'] = month_name
        
        # Get filtered memberships
        memberships_qs = Membership.objects.select_related('member')
        
        if status_filter != 'all':
            memberships_qs = memberships_qs.filter(member__status=status_filter)
            
        if start_date:
            memberships_qs = memberships_qs.filter(start_date__gte=start_date)
            
        if end_date:
            memberships_qs = memberships_qs.filter(start_date__lte=end_date)
        
        # Process memberships
        for membership in memberships_qs:
            membership_month_key = membership.start_date.strftime('%Y-%m')
            month_name = membership.start_date.strftime('%B %Y')
            
            monthly_data[membership_month_key]['new_memberships'] += 1
            monthly_data[membership_month_key]['total_revenue'] += membership.price
            monthly_data[membership_month_key]['combatrix_share'] += membership.combatrix_share
            monthly_data[membership_month_key]['fitshala_share'] += membership.fitshala_share
            monthly_data[membership_month_key]['month_name'] = month_name
            
            membership_detail = f"{membership.member.name} (${membership.price})"
            monthly_data[membership_month_key]['membership_details'].append(membership_detail)
        
        return monthly_data

    def create_excel_report(self, monthly_data):
        """
        Create Excel-ready DataFrame with monthly data
        """
        
        report_data = []
        sorted_months = sorted(monthly_data.keys())
        
        for month_key in sorted_months:
            data = monthly_data[month_key]
            
            row = {
                'Month': data.get('month_name', month_key),
                'New Members': data['new_members'],
                'New Memberships': data['new_memberships'],
                'Total Revenue': float(data['total_revenue']),
                'Combatrix Share': float(data['combatrix_share']),
                'Fitshala Share': float(data['fitshala_share']),
                'Member Names': ', '.join(data['member_names']) if data['member_names'] else 'None',
                'Membership Details': ', '.join(data['membership_details']) if data['membership_details'] else 'None'
            }
            
            report_data.append(row)
        
        # Create DataFrame
        df = pd.DataFrame(report_data)
        
        # Add summary row if data exists
        if not df.empty:
            summary_row = {
                'Month': 'TOTAL',
                'New Members': df['New Members'].sum(),
                'New Memberships': df['New Memberships'].sum(),
                'Total Revenue': df['Total Revenue'].sum(),
                'Combatrix Share': df['Combatrix Share'].sum(),
                'Fitshala Share': df['Fitshala Share'].sum(),
                'Member Names': '',
                'Membership Details': ''
            }
            
            df = pd.concat([df, pd.DataFrame([summary_row])], ignore_index=True)
        
        return df

    def generate_detailed_membership_report(self, start_date=None, end_date=None, status_filter='all'):
        """
        Generate detailed membership report with individual membership records
        """
        
        memberships_qs = Membership.objects.select_related('member').order_by('start_date')
        
        if status_filter != 'all':
            memberships_qs = memberships_qs.filter(member__status=status_filter)
            
        if start_date:
            memberships_qs = memberships_qs.filter(start_date__gte=start_date)
            
        if end_date:
            memberships_qs = memberships_qs.filter(start_date__lte=end_date)
        
        detailed_data = []
        
        for membership in memberships_qs:
            row = {
                'Member Name': membership.member.name,
                'Member Email': membership.member.email,
                'Member Status': membership.member.get_status_display(),
                'Member Join Date': membership.member.date_joined.strftime('%Y-%m-%d'),
                'Membership Start': membership.start_date.strftime('%Y-%m-%d'),
                'Membership End': membership.end_date.strftime('%Y-%m-%d'),
                'Duration (Days)': (membership.end_date - membership.start_date).days + 1,
                'Month': membership.start_date.strftime('%B %Y'),
                'Price': float(membership.price),
                'Combatrix Share': float(membership.combatrix_share),
                'Fitshala Share': float(membership.fitshala_share),
                'Is Currently Active': membership.member.is_active(),
                'Created At': membership.created_at.strftime('%Y-%m-%d %H:%M:%S')
            }
            
            detailed_data.append(row)
        
        return pd.DataFrame(detailed_data)

    def save_excel_report(self, summary_df, detailed_df, options):
        """
        Save Excel file with formatting
        """
        
        # Generate filename
        if options['filename']:
            filename = f"{options['filename']}.xlsx"
        else:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'mma_gym_report_{timestamp}.xlsx'
        
        # Full path
        output_dir = options['output_dir']
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        filepath = os.path.join(output_dir, filename)
        
        # Create Excel file
        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            # Write sheets
            summary_df.to_excel(writer, sheet_name='Monthly Summary', index=False)
            detailed_df.to_excel(writer, sheet_name='Detailed Memberships', index=False)
            
            # Format sheets
            self.format_excel_sheet(writer.sheets['Monthly Summary'])
            self.format_excel_sheet(writer.sheets['Detailed Memberships'])
        
        return filepath

    def format_excel_sheet(self, sheet):
        """
        Format Excel sheet with auto-adjusted column widths
        """
        
        for column in sheet.columns:
            max_length = 0
            column_letter = column[0].column_letter
            
            for cell in column:
                try:
                    if cell.value and len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
                    
            adjusted_width = min(max_length + 2, 50)
            sheet.column_dimensions[column_letter].width = adjusted_width

    def print_summary_statistics(self, start_date=None, end_date=None, status_filter='all'):
        """
        Print summary statistics to console
        """
        
        # Build querysets with filters
        members_qs = Member.objects.all()
        memberships_qs = Membership.objects.all()
        
        if status_filter != 'all':
            members_qs = members_qs.filter(status=status_filter)
            memberships_qs = memberships_qs.filter(member__status=status_filter)
        
        if start_date:
            members_qs = members_qs.filter(date_joined__gte=start_date)
            memberships_qs = memberships_qs.filter(start_date__gte=start_date)
            
        if end_date:
            members_qs = members_qs.filter(date_joined__lte=end_date)
            memberships_qs = memberships_qs.filter(start_date__lte=end_date)
        
        # Calculate totals
        total_revenue = sum(float(m.price) for m in memberships_qs)
        total_combatrix = sum(float(m.combatrix_share) for m in memberships_qs)
        total_fitshala = sum(float(m.fitshala_share) for m in memberships_qs)
        
        self.stdout.write(self.style.SUCCESS('\n=== SUMMARY STATISTICS ==='))
        
        if start_date or end_date:
            date_range = f" (Filtered: {start_date or 'Beginning'} to {end_date or 'Present'})"
        else:
            date_range = ""
            
        if status_filter != 'all':
            status_info = f" (Status: {status_filter.title()})"
        else:
            status_info = ""
            
        self.stdout.write(f"Total Members{date_range}{status_info}: {members_qs.count()}")
        self.stdout.write(f"Total Memberships{date_range}{status_info}: {memberships_qs.count()}")
        self.stdout.write(f"Total Revenue{date_range}{status_info}: Rs{total_revenue:.2f}")
        self.stdout.write(f"Total Combatrix Share{date_range}{status_info}: Rs{total_combatrix:.2f}")
        self.stdout.write(f"Total Fitshala Share{date_range}{status_info}: Rs{total_fitshala:.2f}")