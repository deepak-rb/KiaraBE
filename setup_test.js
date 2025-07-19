const mongoose = require('mongoose');
const Doctor = require('./models/Doctor');
require('dotenv').config();

async function setupTestData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic_management');
    console.log('Connected to MongoDB');
    
    // Clear existing data
    await Doctor.deleteMany({});
    console.log('Cleared existing doctors');
    
    // Create a test doctor
    const doctor = new Doctor({
      username: 'testdoc',
      password: 'Test123!',
      name: 'Test Doctor',
      email: 'test@example.com',
      specialization: 'Test Specialist',
      licenseNumber: 'TEST001',
      phone: '1234567890',
      clinicName: 'Test Clinic',
      clinicAddress: 'Test Address'
    });
    
    await doctor.save();
    console.log('Created test doctor:', {
      username: doctor.username,
      name: doctor.name,
      email: doctor.email
    });
    
    // Verify the doctor exists
    const foundDoctor = await Doctor.findOne({ username: 'testdoc' });
    console.log('Doctor found:', !!foundDoctor);
    
    await mongoose.connection.close();
    console.log('Setup complete');
    
  } catch (error) {
    console.error('Setup failed:', error);
  }
}

setupTestData();
