const mongoose = require('mongoose');
const Doctor = require('./models/Doctor');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function testPasswordHashing() {
  try {
    console.log('Testing password hashing...');
    
    // Create a new doctor with the default password
    const testDoctor = new Doctor({
      username: 'testuser',
      password: 'Hello@123',
      name: 'Test Doctor',
      email: 'test@example.com',
      specialization: 'General',
      licenseNumber: 'TEST123',
      phone: '1234567890',
      clinicName: 'Test Clinic',
      requirePasswordChange: true
    });
    
    console.log('Before save - password:', testDoctor.password);
    await testDoctor.save();
    console.log('After save - password (hashed):', testDoctor.password);
    
    // Test password comparison
    const isMatch = await testDoctor.comparePassword('Hello@123');
    console.log('Password comparison result:', isMatch);
    
    // Clean up
    await Doctor.findByIdAndDelete(testDoctor._id);
    console.log('Test doctor deleted');
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Test error:', error);
    mongoose.disconnect();
  }
}

testPasswordHashing();
