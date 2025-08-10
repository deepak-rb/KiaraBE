const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');
const Doctor = require('../models/Doctor');
require('dotenv').config();

async function clearData(options = {}) {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get current counts
    const counts = {
      patients: await Patient.countDocuments(),
      prescriptions: await Prescription.countDocuments(),
      doctors: await Doctor.countDocuments()
    };

    console.log('\n📊 Current database state:');
    console.log(`👥 Patients: ${counts.patients}`);
    console.log(`📋 Prescriptions: ${counts.prescriptions}`);
    console.log(`👨‍⚕️ Doctors: ${counts.doctors}`);

    console.log('\n🗑️  Starting cleanup...');

    let deletedCounts = {
      patients: 0,
      prescriptions: 0,
      doctors: 0
    };

    // Clear prescriptions
    if (options.clearPrescriptions !== false) {
      const result = await Prescription.deleteMany({});
      deletedCounts.prescriptions = result.deletedCount;
      console.log(`✅ Deleted ${deletedCounts.prescriptions} prescriptions`);
    }

    // Clear patients
    if (options.clearPatients !== false) {
      const result = await Patient.deleteMany({});
      deletedCounts.patients = result.deletedCount;
      console.log(`✅ Deleted ${deletedCounts.patients} patients`);
    }

    // Clear doctors (only if explicitly requested)
    if (options.clearDoctors === true) {
      const result = await Doctor.deleteMany({});
      deletedCounts.doctors = result.deletedCount;
      console.log(`✅ Deleted ${deletedCounts.doctors} doctors`);
    } else {
      console.log('✅ Doctors preserved (as requested)');
    }

    // Show final state
    const finalCounts = {
      patients: await Patient.countDocuments(),
      prescriptions: await Prescription.countDocuments(),
      doctors: await Doctor.countDocuments()
    };

    console.log('\n📊 Final database state:');
    console.log(`👥 Patients: ${finalCounts.patients}`);
    console.log(`📋 Prescriptions: ${finalCounts.prescriptions}`);
    console.log(`👨‍⚕️ Doctors: ${finalCounts.doctors}`);

    console.log('\n📋 Summary:');
    console.log(`🗑️  Deleted ${deletedCounts.patients} patients`);
    console.log(`🗑️  Deleted ${deletedCounts.prescriptions} prescriptions`);
    console.log(`🗑️  Deleted ${deletedCounts.doctors} doctors`);

    console.log('\n🎉 Cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    console.error('Error details:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

// Default: clear patients and prescriptions, preserve doctors
options.clearPatients = true;
options.clearPrescriptions = true;
options.clearDoctors = false;

// Parse specific options
if (args.includes('--all')) {
  options.clearDoctors = true;
  console.log('⚠️  WARNING: --all flag detected. This will delete EVERYTHING including doctors!');
}

if (args.includes('--patients-only')) {
  options.clearPrescriptions = false;
  options.clearDoctors = false;
}

if (args.includes('--prescriptions-only')) {
  options.clearPatients = false;
  options.clearDoctors = false;
}

if (args.includes('--help')) {
  console.log('🧹 Database Cleanup Script');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/clear_data.js                    # Clear patients & prescriptions (default)');
  console.log('  node scripts/clear_data.js --patients-only    # Clear only patients');
  console.log('  node scripts/clear_data.js --prescriptions-only # Clear only prescriptions');
  console.log('  node scripts/clear_data.js --all              # Clear everything including doctors');
  console.log('  node scripts/clear_data.js --help             # Show this help');
  console.log('');
  console.log('⚠️  Default behavior: Preserves doctors, clears patients and prescriptions');
  process.exit(0);
}

// Run the cleanup
clearData(options);
