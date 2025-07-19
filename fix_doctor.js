const mongoose = require('mongoose');
const Doctor = require('./models/Doctor');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function fixCurrentDoctor() {
  try {
    console.log('=== FIXING CURRENT DOCTOR ===');
    
    const doctor = await Doctor.findOne({ username: 'bipincysp' });
    if (!doctor) {
      console.log('Doctor not found');
      return;
    }
    
    console.log('Before fix:');
    console.log('- RequirePasswordChange:', doctor.requirePasswordChange);
    console.log('- Password hash:', doctor.password);
    
    // Update password to Hello@123 and set requirePasswordChange to true
    doctor.password = 'Hello@123';
    doctor.requirePasswordChange = true;
    
    await doctor.save();
    
    console.log('\nAfter fix:');
    console.log('- RequirePasswordChange:', doctor.requirePasswordChange);
    console.log('- Password hash:', doctor.password);
    
    // Test the password
    const isMatch = await doctor.comparePassword('Hello@123');
    console.log('- Password Hello@123 matches:', isMatch);
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Fix error:', error);
    mongoose.disconnect();
  }
}

fixCurrentDoctor();
