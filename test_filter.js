const mongoose = require('mongoose');
const Prescription = require('./models/Prescription');
const Doctor = require('./models/Doctor'); // Include Doctor model
require('dotenv').config();

async function testFilter() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Assume we're using the first doctor's ID for testing
    const firstPrescription = await Prescription.findOne().populate('doctorId');
    if (!firstPrescription) {
      console.log('No prescriptions found');
      return;
    }

    const doctorId = firstPrescription.doctorId._id;
    console.log('Testing with doctor ID:', doctorId);

    // Test 1: Get all prescriptions for the doctor
    const allPrescriptions = await Prescription.find({ doctorId })
      .sort({ createdAt: -1 });
    console.log('\n📊 Total prescriptions for doctor:', allPrescriptions.length);

    // Test 2: Get only follow-up prescriptions
    const followUpPrescriptions = await Prescription.find({ 
      doctorId,
      nextFollowUp: { $exists: true, $ne: null }
    }).sort({ createdAt: -1 });
    console.log('📋 Follow-up prescriptions:', followUpPrescriptions.length);

    // Test 3: Pagination test - limit 5
    const paginatedAll = await Prescription.find({ doctorId })
      .sort({ createdAt: -1 })
      .limit(5);
    console.log('📄 First 5 prescriptions (all):', paginatedAll.length);

    // Test 4: Pagination test with follow-up filter - limit 5
    const paginatedFollowUps = await Prescription.find({ 
      doctorId,
      nextFollowUp: { $exists: true, $ne: null }
    })
      .sort({ createdAt: -1 })
      .limit(5);
    console.log('📄 First 5 follow-up prescriptions:', paginatedFollowUps.length);

    // Show some sample follow-up prescriptions
    console.log('\n🔍 Sample follow-up prescriptions:');
    paginatedFollowUps.slice(0, 3).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.prescriptionId} - ${p.patientName} (Next: ${p.nextFollowUp?.toLocaleDateString()})`);
    });

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testFilter();
