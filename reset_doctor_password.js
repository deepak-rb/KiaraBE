const mongoose = require('mongoose');
const Doctor = require('./models/Doctor');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function resetDoctorPassword() {
  try {
    console.log('Resetting doctor password to default...');
    
    const doctor = await Doctor.findOne({ username: 'bipincysp' });
    if (!doctor) {
      console.log('Doctor not found');
      return;
    }
    
    console.log('Found doctor:', doctor.username);
    
    // Update password to default and set requirePasswordChange
    doctor.password = 'Hello@123';
    doctor.requirePasswordChange = true;
    
    await doctor.save();
    console.log('Doctor password updated to Hello@123 and requirePasswordChange set to true');
    
    // Test the password
    const isMatch = await doctor.comparePassword('Hello@123');
    console.log('Password verification:', isMatch);
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

resetDoctorPassword();
