const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Prescription = require('../models/Prescription');

const updatePrescriptionStatus = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Update all prescriptions that don't have a status field
    const result = await Prescription.updateMany(
      { status: { $exists: false } }, // Find prescriptions without status field
      { $set: { status: 'active' } }  // Set default status to 'active'
    );

    console.log(`Updated ${result.modifiedCount} prescriptions with default status 'active'`);

    // Show sample updated prescriptions
    const sampleUpdated = await Prescription.find({ status: 'active' }).limit(5);
    console.log('\nSample updated prescriptions:');
    sampleUpdated.forEach((prescription, index) => {
      console.log(`${index + 1}. ${prescription.prescriptionId} - Status: ${prescription.status}`);
    });

  } catch (error) {
    console.error('Error updating prescription status:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

updatePrescriptionStatus();
