const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');
const Doctor = require('../models/Doctor');

// Format date to DD/MM/YYYY for display
const formatDateForDisplay = (date) => {
  if (!date) return 'Not scheduled';
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

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

const showSampleData = async () => {
  try {
    await connectDB();
    
    console.log('\n🏥 CLINIC DATABASE SUMMARY');
    console.log('================================');
    
    // Get counts
    const doctorCount = await Doctor.countDocuments();
    const patientCount = await Patient.countDocuments();
    const prescriptionCount = await Prescription.countDocuments();
    
    console.log(`👨‍⚕️ Doctors: ${doctorCount}`);
    console.log(`👥 Patients: ${patientCount}`);
    console.log(`📋 Prescriptions: ${prescriptionCount}`);
    
    // Follow-up statistics
    const prescriptionsWithFollowUp = await Prescription.countDocuments({ nextFollowUp: { $ne: null } });
    const prescriptionsWithoutFollowUp = await Prescription.countDocuments({ nextFollowUp: null });
    console.log(`📅 Prescriptions with Follow-up: ${prescriptionsWithFollowUp}`);
    console.log(`📝 Prescriptions without Follow-up: ${prescriptionsWithoutFollowUp}`);
    
    console.log('\n📊 SAMPLE PATIENTS (Latest 5):');
    console.log('================================');
    
    const samplePatients = await Patient.find().sort({ createdAt: -1 }).limit(5);
    samplePatients.forEach((patient, index) => {
      console.log(`${index + 1}. ${patient.name} (${patient.patientId})`);
      console.log(`   Age: ${patient.age}, Sex: ${patient.sex}`);
      console.log(`   Date of Birth: ${formatDateForDisplay(patient.dateOfBirth)}`);
      console.log(`   Phone: ${patient.phone}`);
      console.log(`   Address: ${patient.address}`);
      console.log(`   Emergency Contact: ${patient.emergencyContact.name} (${patient.emergencyContact.relation})`);
      console.log(`   Medical History: ${patient.medicalHistory.allergies}, ${patient.medicalHistory.chronicIllnesses}`);
      console.log('');
    });
    
    console.log('\n📋 SAMPLE PRESCRIPTIONS (Latest 5):');
    console.log('=====================================');
    
    const samplePrescriptions = await Prescription.find()
      .populate('patientId', 'name patientId')
      .sort({ createdAt: -1 })
      .limit(5);
      
    samplePrescriptions.forEach((prescription, index) => {
      console.log(`${index + 1}. ${prescription.prescriptionId}`);
      console.log(`   Patient: ${prescription.patientName} (Age: ${prescription.patientAge})`);
      console.log(`   Symptoms: ${prescription.symptoms}`);
      console.log(`   Prescription: ${prescription.prescription.substring(0, 100)}...`);
      console.log(`   Created: ${formatDateForDisplay(prescription.createdAt)}`);
      console.log(`   Next Follow-up: ${formatDateForDisplay(prescription.nextFollowUp)}`);
      console.log('');
    });
    
    console.log('\n📈 DATA DISTRIBUTION:');
    console.log('=====================');
    
    // Gender distribution
    const maleCount = await Patient.countDocuments({ sex: 'Male' });
    const femaleCount = await Patient.countDocuments({ sex: 'Female' });
    console.log(`Gender Distribution - Male: ${maleCount}, Female: ${femaleCount}`);
    
    // Age groups
    const ageGroups = [
      { name: '0-18', min: 0, max: 18 },
      { name: '19-35', min: 19, max: 35 },
      { name: '36-55', min: 36, max: 55 },
      { name: '56+', min: 56, max: 150 }
    ];
    
    console.log('\nAge Distribution:');
    for (const group of ageGroups) {
      const count = await Patient.countDocuments({ 
        age: { $gte: group.min, $lte: group.max } 
      });
      console.log(`  ${group.name}: ${count} patients`);
    }
    
    // Recent prescriptions
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentPrescriptions = await Prescription.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    console.log(`\nRecent Prescriptions (Last 30 days): ${recentPrescriptions}`);
    
    console.log('\n✅ Database verification completed!');
    
  } catch (error) {
    console.error('Error showing sample data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the verification
if (require.main === module) {
  showSampleData();
}

module.exports = { showSampleData };
