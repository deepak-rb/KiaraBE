const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Prescription = require('../models/Prescription');

const checkPrescriptionStatus = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all prescriptions with their status
    const prescriptions = await Prescription.find({})
      .select('prescriptionId patientName status originalPrescriptionId createdAt')
      .sort({ createdAt: -1 });

    console.log(`Found ${prescriptions.length} prescriptions:`);
    console.log('\nPrescription Status Report:');
    console.log('==============================');

    prescriptions.forEach((prescription, index) => {
      console.log(`${index + 1}. ${prescription.prescriptionId}`);
      console.log(`   Patient: ${prescription.patientName}`);
      console.log(`   Status: ${prescription.status || 'NO STATUS'}`);
      console.log(`   Original ID: ${prescription.originalPrescriptionId || 'N/A'}`);
      console.log(`   Created: ${prescription.createdAt.toISOString().split('T')[0]}`);
      console.log('');
    });

    // Count by status
    const statusCounts = await Prescription.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('Status Distribution:');
    statusCounts.forEach(status => {
      console.log(`  ${status._id || 'NO STATUS'}: ${status.count}`);
    });

  } catch (error) {
    console.error('Error checking prescription status:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

checkPrescriptionStatus();
