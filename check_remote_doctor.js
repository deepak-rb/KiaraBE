const mongoose = require('mongoose');
const Doctor = require('./models/Doctor');
require('dotenv').config();

// Connect to MongoDB (this will use the remote MongoDB Atlas from .env)
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to remote MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function checkRemoteDoctor() {
  try {
    console.log('Checking doctors in remote database...');
    
    const doctors = await Doctor.find({});
    console.log(`Found ${doctors.length} doctors in remote database`);
    
    for (const doctor of doctors) {
      console.log('\nDoctor:', {
        username: doctor.username,
        name: doctor.name,
        email: doctor.email,
        requirePasswordChange: doctor.requirePasswordChange
      });
      
      // Test common passwords
      const passwords = ['Hello@123', 'Bipincy@123', 'bipin@123', 'admin@123'];
      
      for (const pwd of passwords) {
        const isMatch = await doctor.comparePassword(pwd);
        console.log(`Password '${pwd}' matches:`, isMatch);
        if (isMatch) {
          console.log(`✅ CORRECT PASSWORD FOUND: ${pwd}`);
          break;
        }
      }
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

checkRemoteDoctor();
