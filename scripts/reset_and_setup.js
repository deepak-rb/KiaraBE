const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

// Import models
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');

async function resetAndSetupDoctor() {
  try {
    // Step 1: Connect to MongoDB and clear all data
    console.log('Step 1: Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic_management', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB successfully!');

    console.log('Step 2: Clearing all existing data...');
    
    // Delete all existing data
    const doctorCount = await Doctor.countDocuments();
    const patientCount = await Patient.countDocuments();
    const prescriptionCount = await Prescription.countDocuments();
    
    await Doctor.deleteMany({});
    await Patient.deleteMany({});
    await Prescription.deleteMany({});
    
    console.log(`Deleted ${doctorCount} doctors, ${patientCount} patients, ${prescriptionCount} prescriptions`);
    console.log('Database cleared successfully!');
    
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed.');
    
    // Step 3: Wait a moment for server to be ready
    console.log('Step 3: Waiting for server...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 4: Register new doctor via API
    console.log('Step 4: Registering new doctor...');
    const response = await axios.post('http://localhost:5000/api/auth/register', {
      username: 'bipincysp',
      email: 'bipincyalen1993@gmail.com',
      password: 'Bipincy@123',
      name: 'Bipincy S P',
      specialization: 'Homeopathic Consultant',
      licenseNumber: 'Reg No: 11841',
      phone: '8281704219',
      clinicName: 'Kiara Homeopathic Speciality Clinic',
      clinicAddress: 'Kannaravila Pin:695524'
    });
    
    console.log('Doctor registered successfully!');
    console.log('New Doctor Details:');
    console.log('Username:', response.data.doctor.username);
    console.log('Name:', response.data.doctor.name);
    console.log('Email:', response.data.doctor.email);
    console.log('Clinic:', response.data.doctor.clinicName);
    
    console.log('\n✅ Setup completed successfully!');
    console.log('You can now login with:');
    console.log('Username: bipincysp');
    console.log('Password: Bipincy@123');
    
  } catch (error) {
    console.error('Error during setup:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
  } finally {
    process.exit(0);
  }
}

resetAndSetupDoctor();
