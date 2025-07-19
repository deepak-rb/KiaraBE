const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');

async function clearDatabase() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic_management', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB successfully!');

    // Clear all collections
    console.log('Clearing all data from database...');
    
    // Delete all doctors
    const doctorCount = await Doctor.countDocuments();
    await Doctor.deleteMany({});
    console.log(`Deleted ${doctorCount} doctors`);
    
    // Delete all patients
    const patientCount = await Patient.countDocuments();
    await Patient.deleteMany({});
    console.log(`Deleted ${patientCount} patients`);
    
    // Delete all prescriptions
    const prescriptionCount = await Prescription.countDocuments();
    await Prescription.deleteMany({});
    console.log(`Deleted ${prescriptionCount} prescriptions`);
    
    console.log('Database cleared successfully!');
    console.log(`Total records deleted: ${doctorCount + patientCount + prescriptionCount}`);
    
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  }
}

clearDatabase();
