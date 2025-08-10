# Database Cleanup Scripts

This directory contains scripts for managing and cleaning up the clinic database.

## Available Scripts

### Quick Commands (via npm)

```bash
# Clear all data except doctors (recommended)
npm run clear-except-doctors

# Quick clear without options
npm run quick-clear

# Clear only patients
npm run clear-patients

# Clear only prescriptions  
npm run clear-prescriptions

# Clear everything including doctors (⚠️ DANGEROUS)
npm run clear-all
```

### Direct Script Execution

#### 1. `clear_data.js` - Main cleanup script with options

```bash
# Default: Clear patients & prescriptions, preserve doctors
node scripts/clear_data.js

# Clear only patients
node scripts/clear_data.js --patients-only

# Clear only prescriptions
node scripts/clear_data.js --prescriptions-only

# Clear everything including doctors (⚠️ DANGEROUS)
node scripts/clear_data.js --all

# Show help
node scripts/clear_data.js --help
```

#### 2. `quick_clear.js` - Simple, fast cleanup

```bash
# Quickly clear patients and prescriptions, preserve doctors
node scripts/quick_clear.js
```

#### 3. `clear_all_except_doctors.js` - Safe cleanup with confirmation

```bash
# Clear all data except doctors (requires confirmation)
node scripts/clear_all_except_doctors.js --confirm
```

## What Each Script Does

### Default Behavior (Recommended)
- ✅ **Preserves**: Doctor accounts and settings
- 🗑️ **Deletes**: All patients and their prescriptions
- 🎯 **Use Case**: Reset patient data for testing or new setup

### Options Available

| Option | Patients | Prescriptions | Doctors |
|--------|----------|---------------|---------|
| `default` | 🗑️ Delete | 🗑️ Delete | ✅ Preserve |
| `--patients-only` | 🗑️ Delete | ✅ Preserve | ✅ Preserve |
| `--prescriptions-only` | ✅ Preserve | 🗑️ Delete | ✅ Preserve |
| `--all` | 🗑️ Delete | 🗑️ Delete | 🗑️ Delete |

## Safety Features

- 🔒 **Doctor Preservation**: By default, doctor accounts are never deleted
- 📊 **Before/After Counts**: Shows data counts before and after cleanup
- ⚠️ **Warnings**: Clear warnings for destructive operations
- 🛡️ **Confirmation**: Some scripts require explicit confirmation

## Example Output

```
📊 Before cleanup:
👥 Patients: 150
📋 Prescriptions: 500
👨‍⚕️ Doctors: 1

🗑️  Clearing data...
✅ Deleted all prescriptions
✅ Deleted all patients

📊 After cleanup:
👥 Patients: 0
📋 Prescriptions: 0
👨‍⚕️ Doctors: 1

🎉 Data cleanup completed! Only doctors preserved.
```

## When to Use

- 🧪 **Testing**: Clear test data between test runs
- 🆕 **Fresh Start**: Reset the system for a new clinic
- 🐛 **Debugging**: Clear corrupted or problematic data
- 📊 **Demo Setup**: Prepare system for demonstrations

## ⚠️ Important Notes

1. **These operations cannot be undone** - make sure you want to delete the data
2. **Doctor accounts are preserved by default** - you won't lose login credentials
3. **Database backup recommended** before running cleanup scripts
4. **Scripts automatically handle relationships** - prescriptions are deleted before patients to avoid foreign key issues

## Troubleshooting

If a script fails:
1. Check database connection in `.env` file
2. Ensure MongoDB is running
3. Check console output for specific error messages
4. Verify you have proper database permissions
