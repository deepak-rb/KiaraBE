const mongoose = require('mongoose');
const Patient = require('../models/Patient');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic_management');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const showPatientsWithPhotos = async () => {
  try {
    await connectDB();
    
    console.log('\n📸 PATIENTS WITH PHOTOS SAMPLE');
    console.log('=================================');
    
    // Get patients with photos
    const patientsWithPhotos = await Patient.find({ photo: { $ne: null } }).limit(10);
    const patientsWithoutPhotos = await Patient.countDocuments({ photo: null });
    const totalPatients = await Patient.countDocuments();
    
    console.log(`Total Patients: ${totalPatients}`);
    console.log(`Patients with Photos: ${totalPatients - patientsWithoutPhotos}`);
    console.log(`Patients without Photos: ${patientsWithoutPhotos}`);
    console.log(`Photo Success Rate: ${Math.round(((totalPatients - patientsWithoutPhotos) / totalPatients) * 100)}%`);
    
    console.log('\n👤 SAMPLE PATIENTS WITH PHOTOS:');
    console.log('==================================');
    
    patientsWithPhotos.forEach((patient, index) => {
      console.log(`${index + 1}. ${patient.name} (${patient.patientId})`);
      console.log(`   Age: ${patient.age}, Sex: ${patient.sex}`);
      console.log(`   Photo: ${patient.photo}`);
      console.log(`   Phone: ${patient.phone}`);
      console.log('');
    });
    
    if (patientsWithoutPhotos > 0) {
      console.log('\n📝 SAMPLE PATIENTS WITHOUT PHOTOS:');
      console.log('====================================');
      
      const patientsNoPhotos = await Patient.find({ photo: null }).limit(5);
      patientsNoPhotos.forEach((patient, index) => {
        console.log(`${index + 1}. ${patient.name} (${patient.patientId})`);
        console.log(`   Age: ${patient.age}, Sex: ${patient.sex}`);
        console.log(`   Photo: No photo available`);
        console.log('');
      });
    }
    
    console.log('✅ Photo verification completed!');
    
  } catch (error) {
    console.error('Error showing patients with photos:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the verification
if (require.main === module) {
  showPatientsWithPhotos();
}

module.exports = { showPatientsWithPhotos };
