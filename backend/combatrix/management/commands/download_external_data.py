from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from datetime import datetime
import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
import os


class Command(BaseCommand):
    help = 'Download Members and Membership data from external PostgreSQL database to CSV files'

    def add_arguments(self, parser):
        parser.add_argument(
            '--external-db-url',
            type=str,
            required=False,
            help='External PostgreSQL database URL (e.g., postgresql://user:password@host:port/dbname)',
        )
        parser.add_argument(
            '--output-dir',
            type=str,
            default='csv_exports',
            help='Output directory for the CSV files (default: csv_exports)',
        )
        parser.add_argument(
            '--filename-prefix',
            type=str,
            help='Custom filename prefix for the CSV files (without extension)',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('Starting External Database Data Download...')
        )

        # ==============================================
        # CONFIGURATION: Set your external database URL here
        # ==============================================
        # Format: postgresql://username:password@host:port/database
        # Example: postgresql://postgres:mypassword@localhost:5432/combatrix_db
        
        external_db_url = options.get('external_db_url')
        
        # If no URL provided via argument, use the variable below
        if not external_db_url:
            # PASTE YOUR EXTERNAL DATABASE URL HERE
            external_db_url = ""  # <-- PASTE URL HERE
        
        if not external_db_url:
            raise CommandError(
                'Please provide external database URL either via --external-db-url argument '
                'or by setting the external_db_url variable in the command file.'
            )

        try:
            # Download data from external database
            members_df, memberships_df = self.download_data_from_external_db(external_db_url)
            
            # Save to CSV files
            filepaths = self.save_csv_reports(members_df, memberships_df, options)
            
            # Print summary
            self.print_summary_statistics(members_df, memberships_df)
            
            self.stdout.write(
                self.style.SUCCESS(f'\n✓ Data downloaded successfully!')
            )
            self.stdout.write(
                self.style.SUCCESS(f'  Members: {len(members_df)} records → {filepaths["members"]}')
            )
            self.stdout.write(
                self.style.SUCCESS(f'  Memberships: {len(memberships_df)} records → {filepaths["memberships"]}')
            )
            self.stdout.write(
                self.style.SUCCESS(f'  Summary: {filepaths["summary"]}')
            )

        except psycopg2.OperationalError as e:
            raise CommandError(f'Database connection error: {str(e)}')
        except psycopg2.ProgrammingError as e:
            raise CommandError(f'Database query error (check if tables exist): {str(e)}')
        except Exception as e:
            raise CommandError(f'Error downloading data: {str(e)}')

    def download_data_from_external_db(self, db_url):
        """
        Connect to external PostgreSQL database and download Members and Membership data
        """
        self.stdout.write('Connecting to external database...')
        
        # Parse database URL
        # Format: postgresql://user:password@host:port/dbname
        connection = None
        
        try:
            # Connect to external database
            connection = psycopg2.connect(db_url)
            
            self.stdout.write(self.style.SUCCESS('✓ Connected to external database'))
            
            # Download Members data
            self.stdout.write('Downloading Members data...')
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
            
            members_df = pd.DataFrame(members_data)
            self.stdout.write(self.style.SUCCESS(f'✓ Downloaded {len(members_df)} members'))
            
            # Download Memberships data
            self.stdout.write('Downloading Memberships data...')
            memberships_query = """
                SELECT 
                    m.id,
                    mem.name as member_name,
                    mem.email as member_email,
                    m.member_id,
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
            
            memberships_df = pd.DataFrame(memberships_data)
            self.stdout.write(self.style.SUCCESS(f'✓ Downloaded {len(memberships_df)} memberships'))
            
            return members_df, memberships_df
            
        finally:
            if connection:
                connection.close()
                self.stdout.write('Connection closed')

    def save_csv_reports(self, members_df, memberships_df, options):
        """
        Save CSV files with Members and Memberships data
        """
        
        # Generate filename prefix
        if options['filename_prefix']:
            prefix = options['filename_prefix']
        else:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            prefix = f'external_db_download_{timestamp}'
        
        # Full path
        output_dir = options['output_dir']
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            self.stdout.write(f'Created output directory: {output_dir}')
        
        # Format DataFrames
        members_formatted = members_df.copy()
        if not members_formatted.empty:
            # Format date columns for Members
            if 'date_joined' in members_formatted.columns:
                members_formatted['date_joined'] = pd.to_datetime(members_formatted['date_joined']).dt.strftime('%Y-%m-%d')
        
        memberships_formatted = memberships_df.copy()
        if not memberships_formatted.empty:
            # Format date and numeric columns for Memberships
            if 'start_date' in memberships_formatted.columns:
                memberships_formatted['start_date'] = pd.to_datetime(memberships_formatted['start_date']).dt.strftime('%Y-%m-%d')
            if 'end_date' in memberships_formatted.columns:
                memberships_formatted['end_date'] = pd.to_datetime(memberships_formatted['end_date']).dt.strftime('%Y-%m-%d')
            if 'created_at' in memberships_formatted.columns:
                memberships_formatted['created_at'] = pd.to_datetime(memberships_formatted['created_at']).dt.strftime('%Y-%m-%d %H:%M:%S')
            
            # Calculate duration
            memberships_formatted['duration_days'] = (
                pd.to_datetime(memberships_formatted['end_date']) - 
                pd.to_datetime(memberships_formatted['start_date'])
            ).dt.days + 1
            
            # Format numeric columns
            for col in ['price', 'combatrix_share', 'fitshala_share']:
                if col in memberships_formatted.columns:
                    memberships_formatted[col] = memberships_formatted[col].astype(float)
        
        # Save CSV files
        filepaths = {}
        
        # Save Members CSV
        members_path = os.path.join(output_dir, f'{prefix}_members.csv')
        members_formatted.to_csv(members_path, index=False, encoding='utf-8')
        filepaths['members'] = members_path
        
        # Save Memberships CSV
        memberships_path = os.path.join(output_dir, f'{prefix}_memberships.csv')
        memberships_formatted.to_csv(memberships_path, index=False, encoding='utf-8')
        filepaths['memberships'] = memberships_path
        
        # Create and save summary CSV
        summary_data = self.create_summary_data(members_df, memberships_df)
        summary_df = pd.DataFrame(summary_data)
        summary_path = os.path.join(output_dir, f'{prefix}_summary.csv')
        summary_df.to_csv(summary_path, index=False, encoding='utf-8')
        filepaths['summary'] = summary_path
        
        return filepaths

    def create_summary_data(self, members_df, memberships_df):
        """
        Create summary statistics
        """
        summary = []
        
        # Members summary
        summary.append({'Metric': 'Total Members', 'Value': len(members_df)})
        
        if not members_df.empty and 'status' in members_df.columns:
            status_counts = members_df['status'].value_counts()
            for status, count in status_counts.items():
                summary.append({'Metric': f'Members - {status.title()}', 'Value': count})
        
        summary.append({'Metric': '', 'Value': ''})  # Empty row
        
        # Memberships summary
        summary.append({'Metric': 'Total Memberships', 'Value': len(memberships_df)})
        
        if not memberships_df.empty:
            if 'price' in memberships_df.columns:
                total_revenue = memberships_df['price'].astype(float).sum()
                summary.append({'Metric': 'Total Revenue', 'Value': f'Rs {total_revenue:,.2f}'})
            
            if 'combatrix_share' in memberships_df.columns:
                combatrix_total = memberships_df['combatrix_share'].astype(float).sum()
                summary.append({'Metric': 'Total Combatrix Share', 'Value': f'Rs {combatrix_total:,.2f}'})
            
            if 'fitshala_share' in memberships_df.columns:
                fitshala_total = memberships_df['fitshala_share'].astype(float).sum()
                summary.append({'Metric': 'Total Fitshala Share', 'Value': f'Rs {fitshala_total:,.2f}'})
        
        summary.append({'Metric': '', 'Value': ''})  # Empty row
        summary.append({'Metric': 'Downloaded At', 'Value': datetime.now().strftime('%Y-%m-%d %H:%M:%S')})
        
        return summary

    def print_summary_statistics(self, members_df, memberships_df):
        """
        Print summary statistics to console
        """
        self.stdout.write(self.style.SUCCESS('\n=== DOWNLOAD SUMMARY ==='))
        
        # Members summary
        self.stdout.write(f'Total Members: {len(members_df)}')
        if not members_df.empty and 'status' in members_df.columns:
            status_counts = members_df['status'].value_counts()
            for status, count in status_counts.items():
                self.stdout.write(f'  - {status.title()}: {count}')
        
        # Memberships summary
        self.stdout.write(f'\nTotal Memberships: {len(memberships_df)}')
        if not memberships_df.empty:
            if 'price' in memberships_df.columns:
                total_revenue = memberships_df['price'].astype(float).sum()
                self.stdout.write(f'Total Revenue: Rs {total_revenue:,.2f}')
            
            if 'combatrix_share' in memberships_df.columns:
                combatrix_total = memberships_df['combatrix_share'].astype(float).sum()
                self.stdout.write(f'Combatrix Share: Rs {combatrix_total:,.2f}')
            
            if 'fitshala_share' in memberships_df.columns:
                fitshala_total = memberships_df['fitshala_share'].astype(float).sum()
                self.stdout.write(f'Fitshala Share: Rs {fitshala_total:,.2f}')
