const mongoose = require('mongoose');
const Doctor = require('./models/Doctor');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function checkCurrentDoctor() {
  try {
    console.log('Checking current doctors in database...');
    
    const doctors = await Doctor.find({});
    console.log(`Found ${doctors.length} doctors`);
    
    for (let doctor of doctors) {
      console.log('Doctor:', {
        username: doctor.username,
        name: doctor.name,
        email: doctor.email,
        requirePasswordChange: doctor.requirePasswordChange,
        hashedPassword: doctor.password.substring(0, 20) + '...'
      });
      
      // Test password comparison
      const isMatch1 = await doctor.comparePassword('Hello@123');
      const isMatch2 = await doctor.comparePassword('Bipincy@123');
      
      console.log(`Password 'Hello@123' matches: ${isMatch1}`);
      console.log(`Password 'Bipincy@123' matches: ${isMatch2}`);
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

checkCurrentDoctor();
