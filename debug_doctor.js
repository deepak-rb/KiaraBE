const mongoose = require('mongoose');
const Doctor = require('./models/Doctor');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function debugCurrentDoctor() {
  try {
    console.log('=== DEBUGGING CURRENT DOCTOR ===');
    
    const doctors = await Doctor.find({});
    console.log(`Found ${doctors.length} doctors in database`);
    
    for (let doctor of doctors) {
      console.log('\n--- Doctor Details ---');
      console.log('Username:', doctor.username);
      console.log('Name:', doctor.name);
      console.log('Email:', doctor.email);
      console.log('RequirePasswordChange:', doctor.requirePasswordChange);
      console.log('Password Hash:', doctor.password);
      console.log('Password Hash Length:', doctor.password.length);
      console.log('Password starts with $2b$:', doctor.password.startsWith('$2b$'));
      
      // Test multiple passwords
      const testPasswords = ['Hello@123', 'Bipincy@123', 'hello@123', 'HELLO@123'];
      
      for (let testPassword of testPasswords) {
        try {
          const isMatch = await doctor.comparePassword(testPassword);
          console.log(`Password '${testPassword}' matches: ${isMatch}`);
        } catch (error) {
          console.log(`Error testing password '${testPassword}':`, error.message);
        }
      }
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Debug error:', error);
    mongoose.disconnect();
  }
}

debugCurrentDoctor();
