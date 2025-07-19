const mongoose = require('mongoose');
const Doctor = require('./models/Doctor');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function testExportFormat() {
  try {
    console.log('=== TESTING EXPORT FORMAT ===');
    
    const doctors = await Doctor.find({});
    console.log(`Found ${doctors.length} doctors`);
    
    // Simulate the export process
    const processedDoctors = doctors.map(doctor => {
      const { password, ...doctorWithoutPassword } = doctor.toObject();
      return {
        ...doctorWithoutPassword,
        password: 'Hello@123', // Default password for import
        requirePasswordChange: true // Flag to force password change on first login
      };
    });
    
    console.log('Processed doctor for export:');
    console.log(JSON.stringify(processedDoctors[0], null, 2));
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Test error:', error);
    mongoose.disconnect();
  }
}

testExportFormat();
