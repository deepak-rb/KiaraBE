const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');
const Doctor = require('../models/Doctor');
require('dotenv').config();

async function clearAllExceptDoctors() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get counts before deletion
    const patientCount = await Patient.countDocuments();
    const prescriptionCount = await Prescription.countDocuments();
    const doctorCount = await Doctor.countDocuments();

    console.log('\n📊 Current data counts:');
    console.log(`👥 Patients: ${patientCount}`);
    console.log(`📋 Prescriptions: ${prescriptionCount}`);
    console.log(`👨‍⚕️ Doctors: ${doctorCount} (will be preserved)`);

    // Confirm deletion
    console.log('\n⚠️  WARNING: This will delete ALL patients and prescriptions!');
    console.log('📝 Doctor records will be preserved.');
    
    // In a real scenario, you might want to add a confirmation prompt
    // For automation purposes, we'll proceed directly
    
    console.log('\n🗑️  Starting data cleanup...');

    // Delete all prescriptions first (to avoid foreign key issues)
    console.log('📋 Deleting all prescriptions...');
    const deletedPrescriptions = await Prescription.deleteMany({});
    console.log(`✅ Deleted ${deletedPrescriptions.deletedCount} prescriptions`);

    // Delete all patients
    console.log('👥 Deleting all patients...');
    const deletedPatients = await Patient.deleteMany({});
    console.log(`✅ Deleted ${deletedPatients.deletedCount} patients`);

    // Verify final counts
    const finalPatientCount = await Patient.countDocuments();
    const finalPrescriptionCount = await Prescription.countDocuments();
    const finalDoctorCount = await Doctor.countDocuments();

    console.log('\n📊 Final data counts:');
    console.log(`👥 Patients: ${finalPatientCount}`);
    console.log(`📋 Prescriptions: ${finalPrescriptionCount}`);
    console.log(`👨‍⚕️ Doctors: ${finalDoctorCount} (preserved)`);

    if (finalPatientCount === 0 && finalPrescriptionCount === 0 && finalDoctorCount === doctorCount) {
      console.log('\n🎉 Data cleanup completed successfully!');
      console.log('✅ All patients and prescriptions have been deleted');
      console.log('✅ All doctor records have been preserved');
    } else {
      console.log('\n⚠️  Warning: Data cleanup may not have completed as expected');
    }

  } catch (error) {
    console.error('❌ Error during data cleanup:', error);
    console.error('Error details:', error.message);
  } finally {
    console.log('\n🔌 Disconnecting from MongoDB...');
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

// Add command line confirmation for safety
if (process.argv.includes('--confirm')) {
  clearAllExceptDoctors();
} else {
  console.log('⚠️  Data Cleanup Script');
  console.log('This script will delete ALL patients and prescriptions while preserving doctors.');
  console.log('');
  console.log('To run this script, use:');
  console.log('node scripts/clear_all_except_doctors.js --confirm');
  console.log('');
  console.log('⚠️  USE WITH CAUTION! This action cannot be undone.');
  process.exit(1);
}
