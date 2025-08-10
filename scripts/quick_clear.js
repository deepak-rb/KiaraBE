const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');
const Doctor = require('../models/Doctor');
require('dotenv').config();

async function quickClearData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get counts before deletion
    const patientCount = await Patient.countDocuments();
    const prescriptionCount = await Prescription.countDocuments();
    const doctorCount = await Doctor.countDocuments();

    console.log('\n📊 Before cleanup:');
    console.log(`👥 Patients: ${patientCount}`);
    console.log(`📋 Prescriptions: ${prescriptionCount}`);
    console.log(`👨‍⚕️ Doctors: ${doctorCount}`);

    console.log('\n🗑️  Clearing data...');

    // Delete prescriptions first
    await Prescription.deleteMany({});
    console.log('✅ Deleted all prescriptions');

    // Delete patients
    await Patient.deleteMany({});
    console.log('✅ Deleted all patients');

    // Verify final state
    const finalCounts = {
      patients: await Patient.countDocuments(),
      prescriptions: await Prescription.countDocuments(),
      doctors: await Doctor.countDocuments()
    };

    console.log('\n📊 After cleanup:');
    console.log(`👥 Patients: ${finalCounts.patients}`);
    console.log(`📋 Prescriptions: ${finalCounts.prescriptions}`);
    console.log(`👨‍⚕️ Doctors: ${finalCounts.doctors}`);

    console.log('\n🎉 Data cleanup completed! Only doctors preserved.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

quickClearData();
