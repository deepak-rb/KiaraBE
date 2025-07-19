const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');

async function clearDatabaseExceptBipincysp() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic_management', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB successfully!');

    // Find the doctor bipincysp
    const bipincyspDoctor = await Doctor.findOne({ username: 'bipincysp' });
    
    if (!bipincyspDoctor) {
      console.log('Doctor "bipincysp" not found in database!');
      console.log('Available doctors:');
      const allDoctors = await Doctor.find({}, 'username name');
      allDoctors.forEach(doc => {
        console.log(`- ${doc.username} (${doc.name})`);
      });
      return;
    }

    console.log(`Found doctor "bipincysp" (${bipincyspDoctor.name})`);
    console.log('Clearing all data except for this doctor...');
    
    // Delete all doctors except bipincysp
    const otherDoctorsCount = await Doctor.countDocuments({ username: { $ne: 'bipincysp' } });
    await Doctor.deleteMany({ username: { $ne: 'bipincysp' } });
    console.log(`Deleted ${otherDoctorsCount} other doctors`);
    
    // Delete all patients (they belong to doctors, so we need to keep only bipincysp's patients)
    // Since we're clearing all data except bipincysp, we'll delete all patients and prescriptions
    const patientCount = await Patient.countDocuments();
    await Patient.deleteMany({});
    console.log(`Deleted ${patientCount} patients`);
    
    // Delete all prescriptions
    const prescriptionCount = await Prescription.countDocuments();
    await Prescription.deleteMany({});
    console.log(`Deleted ${prescriptionCount} prescriptions`);
    
    console.log('Database cleanup completed successfully!');
    console.log(`Kept 1 doctor (bipincysp), deleted ${otherDoctorsCount + patientCount + prescriptionCount} other records`);
    
    // Verify what's left
    const remainingDoctors = await Doctor.countDocuments();
    const remainingPatients = await Patient.countDocuments();
    const remainingPrescriptions = await Prescription.countDocuments();
    
    console.log('\nRemaining data:');
    console.log(`- Doctors: ${remainingDoctors}`);
    console.log(`- Patients: ${remainingPatients}`);
    console.log(`- Prescriptions: ${remainingPrescriptions}`);
    
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  }
}

clearDatabaseExceptBipincysp();
