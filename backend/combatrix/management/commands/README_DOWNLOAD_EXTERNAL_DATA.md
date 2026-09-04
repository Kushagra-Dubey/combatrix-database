# Download External Data Command

This Django management command connects to an external PostgreSQL database and downloads Members and Membership data to an Excel file.

## Features

- ✅ Connects to any external PostgreSQL database
- ✅ Downloads Members and Membership data
- ✅ Exports to Excel with 3 sheets: Members, Memberships, and Summary
- ✅ Auto-formats dates and numbers
- ✅ Calculates membership duration
- ✅ Provides detailed statistics
- ✅ Auto-adjusts column widths in Excel

## Setup

### Required Dependencies

All dependencies are already included in `requirements.txt`:
- `psycopg2-binary` - PostgreSQL adapter
- `pandas` - Data manipulation
- `openpyxl` - Excel file creation

## Usage

### Method 1: Set URL in the Command File (Recommended)

1. Open the command file:
   ```bash
   code backend/combatrix/management/commands/download_external_data.py
   ```

2. Find line 48 and paste your database URL:
   ```python
   # PASTE YOUR EXTERNAL DATABASE URL HERE
   external_db_url = "postgresql://username:password@host:port/database"  # <-- PASTE URL HERE
   ```

3. Run the command:
   ```bash
   cd backend
   python manage.py download_external_data
   ```

### Method 2: Pass URL as Command Line Argument

Run with the `--external-db-url` argument:

```bash
cd backend
python manage.py download_external_data --external-db-url "postgresql://username:password@host:port/database"
```

## Database URL Format

The database URL should follow this format:
```
postgresql://username:password@host:port/database
```

### Examples:

**Local database:**
```
postgresql://postgres:mypassword@localhost:5432/combatrix_db
```

**Remote database:**
```
postgresql://user123:secure_pass@192.168.1.100:5432/gym_database
```

**Cloud database (e.g., Railway, Render, etc.):**
```
postgresql://postgres:AbCd1234XyZ@containers-us-west-123.railway.app:5432/railway
```

## Command Options

| Option | Description | Default |
|--------|-------------|---------|
| `--external-db-url` | External PostgreSQL database URL | None (must be set in file or via argument) |
| `--output-dir` | Directory to save the Excel file | `csv_exports` |
| `--filename` | Custom filename (without .xlsx extension) | `external_db_download_TIMESTAMP.xlsx` |

## Examples

### Basic Usage (URL in file)
```bash
python manage.py download_external_data
```

### With Custom Output Directory
```bash
python manage.py download_external_data --output-dir "/Users/myuser/Desktop/exports"
```

### With Custom Filename
```bash
python manage.py download_external_data --filename "gym_backup_jan2026"
```

### Complete Example
```bash
python manage.py download_external_data \
  --external-db-url "postgresql://postgres:password@localhost:5432/combatrix" \
  --output-dir "backups" \
  --filename "combatrix_backup"
```

## Output

The command creates an Excel file with **3 sheets**:

### 1. Members Sheet
Contains all member data:
- ID
- Name
- Email
- Phone Number
- Emergency Contact Name
- Emergency Contact Number
- Date Joined
- Status

### 2. Memberships Sheet
Contains all membership data with joined member information:
- ID
- Member Name
- Member Email
- Member ID
- Start Date
- End Date
- Duration (Days)
- Price
- Combatrix Share
- Fitshala Share
- Created At

### 3. Summary Sheet
Contains aggregated statistics:
- Total Members (by status)
- Total Memberships
- Total Revenue
- Total Combatrix Share
- Total Fitshala Share
- Download timestamp

## Sample Output

```
Starting External Database Data Download...
Connecting to external database...
✓ Connected to external database
Downloading Members data...
✓ Downloaded 45 members
Downloading Memberships data...
✓ Downloaded 123 memberships
Connection closed

=== DOWNLOAD SUMMARY ===
Total Members: 45
  - Active: 32
  - Inactive: 11
  - Deleted: 2

Total Memberships: 123
Total Revenue: Rs 369,000.00
Combatrix Share: Rs 221,400.00
Fitshala Share: Rs 147,600.00

✓ Data downloaded successfully: csv_exports/external_db_download_20260213_200530.xlsx
  Members: 45 records
  Memberships: 123 records
```

## Troubleshooting

### Connection Error
```
Database connection error: could not connect to server
```
**Solution:** Check that:
- Database URL is correct
- Database server is running
- Network allows connection
- Firewall rules permit access

### Table Not Found Error
```
Database query error (check if tables exist): relation "combatrix_member" does not exist
```
**Solution:** 
- Ensure the external database has the tables `combatrix_member` and `combatrix_membership`
- Check if table names are different in the external database
- Modify the SQL queries in the command file if needed

### Missing Password
```
fe_sendauth: no password supplied
```
**Solution:** Include password in the database URL

### Permission Denied
```
permission denied for table combatrix_member
```
**Solution:** Ensure the database user has SELECT permissions on the tables

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit database URLs to Git** - Use environment variables or keep them in the command file locally
2. **Protect the Excel files** - They contain sensitive member data
3. **Use read-only database users** - The command only needs SELECT permissions
4. **Secure the connection** - Use SSL for production databases if available

## Database Table Requirements

The external database must have these tables:

### combatrix_member
- `id` (integer)
- `name` (varchar)
- `email` (varchar)
- `phone_number` (varchar)
- `emergency_contact_name` (varchar)
- `emergency_contact_number` (varchar)
- `date_joined` (date)
- `status` (varchar)

### combatrix_membership
- `id` (integer)
- `member_id` (foreign key to combatrix_member)
- `start_date` (date)
- `end_date` (date)
- `price` (decimal)
- `combatrix_share` (decimal)
- `fitshala_share` (decimal)
- `created_at` (timestamp)

## Customization

To customize the data being downloaded, modify the SQL queries in the `download_data_from_external_db` method:

```python
members_query = """
    SELECT 
        id,
        name,
        email,
        -- Add more columns here
    FROM combatrix_member
    ORDER BY date_joined DESC
"""
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the error message details
3. Verify database connectivity manually using `psql` command
4. Check Django logs for detailed error information
