const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');
const Doctor = require('../models/Doctor');
const fs = require('fs');
const path = require('path');
const https = require('https');

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

// Sample data arrays for generating realistic dummy data
const firstNames = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Reyansh', 'Mohammed', 'Sai', 'Krishna', 'Darsh',
  'Aadhya', 'Diya', 'Kavya', 'Ananya', 'Anika', 'Saanvi', 'Angel', 'Pihu', 'Myra', 'Sara',
  'Rajesh', 'Suresh', 'Ramesh', 'Mahesh', 'Dinesh', 'Naresh', 'Umesh', 'Rakesh', 'Lokesh', 'Hitesh',
  'Priya', 'Pooja', 'Neha', 'Shreya', 'Kritika', 'Sakshi', 'Ritu', 'Sonia', 'Meera', 'Kavita',
  'Arjun', 'Kiran', 'Rohan', 'Vikram', 'Amit', 'Rohit', 'Sumit', 'Ankit', 'Nikhil', 'Abhishek'
];

const lastNames = [
  'Sharma', 'Verma', 'Gupta', 'Agarwal', 'Tiwari', 'Mishra', 'Singh', 'Kumar', 'Yadav', 'Pandey',
  'Jain', 'Bansal', 'Saxena', 'Srivastava', 'Dwivedi', 'Tripathi', 'Chandra', 'Bhardwaj', 'Arora', 'Kapoor',
  'Malhotra', 'Khanna', 'Sethi', 'Bhatia', 'Chopra', 'Grover', 'Tandon', 'Aggarwal', 'Jindal', 'Mittal',
  'Patel', 'Shah', 'Modi', 'Desai', 'Mehta', 'Amin', 'Parikh', 'Thakkar', 'Vyas', 'Joshi',
  'Reddy', 'Rao', 'Naidu', 'Prasad', 'Murthy', 'Raju', 'Krishna', 'Sai', 'Venkat', 'Chandra'
];

const addresses = [
  'MG Road, Bangalore, Karnataka 560001',
  'Connaught Place, New Delhi, Delhi 110001',
  'Park Street, Kolkata, West Bengal 700016',
  'Marine Drive, Mumbai, Maharashtra 400020',
  'Anna Salai, Chennai, Tamil Nadu 600002',
  'Sector 17, Chandigarh, Punjab 160017',
  'Commercial Street, Bangalore, Karnataka 560001',
  'Khan Market, New Delhi, Delhi 110003',
  'Elgin Road, Kolkata, West Bengal 700020',
  'Linking Road, Mumbai, Maharashtra 400050',
  'T. Nagar, Chennai, Tamil Nadu 600017',
  'Mall Road, Shimla, Himachal Pradesh 171001',
  'Civil Lines, Jaipur, Rajasthan 302006',
  'Camp Area, Pune, Maharashtra 411001',
  'Residency Road, Bangalore, Karnataka 560025',
  'Karol Bagh, New Delhi, Delhi 110005',
  'Salt Lake, Kolkata, West Bengal 700064',
  'Juhu, Mumbai, Maharashtra 400049',
  'Adyar, Chennai, Tamil Nadu 600020',
  'Sector 22, Gurgaon, Haryana 122015'
];

const relations = ['Father', 'Mother', 'Brother', 'Sister', 'Spouse', 'Son', 'Daughter', 'Uncle', 'Aunt', 'Friend'];

const allergies = [
  'Penicillin', 'Shellfish', 'Nuts', 'Dairy', 'Dust mites', 'Pollen', 'Pet dander', 'Latex', 'Aspirin', 'None known'
];

const chronicIllnesses = [
  'Diabetes Type 2', 'Hypertension', 'Asthma', 'Arthritis', 'Heart Disease', 'Thyroid disorder', 'None', 'COPD', 'Migraine', 'Depression'
];

const pastSurgeries = [
  'Appendectomy', 'Gallbladder removal', 'Hernia repair', 'Cataract surgery', 'Knee replacement', 'None', 'Tonsillectomy', 'C-section', 'Bypass surgery', 'None'
];

const medications = [
  'Metformin for diabetes', 'Amlodipine for BP', 'Aspirin for heart', 'Levothyroxine for thyroid', 'Insulin injections', 'None', 'Albuterol inhaler', 'Vitamin D supplements', 'Multivitamins', 'None'
];

const symptoms = [
  'Fever and headache', 'Persistent cough', 'Chest pain and shortness of breath', 'Abdominal pain and nausea',
  'Joint pain and stiffness', 'Fatigue and weakness', 'Dizziness and vertigo', 'Skin rash and itching',
  'Back pain and muscle spasms', 'Digestive issues and bloating', 'Sleep disturbances', 'Anxiety and stress',
  'High blood pressure', 'Blood sugar fluctuations', 'Vision problems', 'Hearing difficulties',
  'Respiratory congestion', 'Cardiac palpitations', 'Neurological symptoms', 'Allergic reactions'
];

const prescriptions = [
  'Paracetamol 500mg - Take 1 tablet twice daily after meals for 3 days\nRest and adequate fluid intake',
  'Azithromycin 500mg - Take 1 tablet daily for 5 days\nSalbutamol inhaler - 2 puffs when needed\nAvoid cold exposure',
  'Aspirin 75mg - Take 1 tablet daily\nAmlodipine 5mg - Take 1 tablet daily\nRegular BP monitoring',
  'Omeprazole 20mg - Take 1 tablet before breakfast\nDomperidone 10mg - Take before meals\nAvoid spicy food',
  'Diclofenac 50mg - Take 1 tablet twice daily after meals\nPhysiotherapy sessions\nHot compress application',
  'Iron tablets 100mg - Take 1 tablet daily\nVitamin B12 injection - Weekly for 4 weeks\nNutritious diet',
  'Betahistine 16mg - Take 1 tablet twice daily\nAvoid sudden head movements\nAdequate rest',
  'Cetirizine 10mg - Take 1 tablet daily\nCalamine lotion - Apply twice daily\nAvoid allergens',
  'Tramadol 50mg - Take when needed for pain\nMuscle relaxant - Apply gel twice daily\nPhysiotherapy',
  'Simethicone 40mg - Take after meals\nProbiotics - Take daily\nRegular meal times\nAvoid gas-forming foods',
  'Melatonin 3mg - Take before bedtime\nMaintain sleep hygiene\nAvoid caffeine after 6 PM',
  'Sertraline 25mg - Take daily morning\nCounseling sessions\nRegular exercise\nStress management techniques',
  'Telmisartan 40mg - Take daily\nHydrochlorothiazide 12.5mg - Take daily\nLow sodium diet\nRegular exercise',
  'Metformin 500mg - Take twice daily\nGlibenclamide 5mg - Take before breakfast\nDiabetic diet\nRegular monitoring',
  'Eye drops - Apply 2 drops twice daily\nVitamin A supplements\nRegular eye check-ups',
  'Wax removal drops - Apply for 3 days\nHearing aid consultation\nAvoid cotton buds',
  'Expectorant syrup - Take 10ml thrice daily\nSteam inhalation\nWarm salt water gargling',
  'Propranolol 40mg - Take twice daily\nECG monitoring\nStress management\nRegular cardiology follow-up',
  'Gabapentin 100mg - Take twice daily\nVitamin B complex\nNeurology consultation\nPhysiotherapy',
  'Prednisolone 10mg - Take for 5 days\nAntihistamine - Take daily\nAvoid known allergens\nEmergency contact information'
];

const notes = [
  'Patient advised to follow up in 1 week',
  'Monitor symptoms and report any worsening',
  'Continue current medication until next visit',
  'Lifestyle modifications recommended',
  'Dietary changes discussed with patient',
  'Exercise routine to be started gradually',
  'Patient education provided regarding condition',
  'Family history significant for similar condition',
  'Patient responded well to previous treatment',
  'Regular monitoring of vital signs required',
  'Specialist referral may be needed if no improvement',
  'Patient counseled about medication compliance',
  'Emergency signs and symptoms explained',
  'Follow-up blood tests scheduled',
  'Patient demonstrates good understanding of treatment plan'
];

// Utility functions
const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];

const getRandomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Format date to DD/MM/YYYY
const formatDate = (date) => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Parse DD/MM/YYYY format back to Date object
const parseDate = (dateString) => {
  const [day, month, year] = dateString.split('/');
  return new Date(year, month - 1, day);
};

const getRandomAge = () => Math.floor(Math.random() * 80) + 1; // Age between 1-80

const generatePhone = () => {
  const prefixes = ['98', '97', '96', '95', '94', '93', '92', '91', '90', '89'];
  const prefix = getRandomElement(prefixes);
  const remaining = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return prefix + remaining;
};

const generatePatientId = async (index) => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  // Get the highest existing patient number
  const existingPatients = await Patient.find({}, { patientId: 1 }).sort({ patientId: -1 });
  let maxNumber = 0;
  
  if (existingPatients.length > 0) {
    const lastPatientId = existingPatients[0].patientId;
    const lastNumber = parseInt(lastPatientId.slice(-4));
    if (!isNaN(lastNumber)) {
      maxNumber = lastNumber;
    }
  }
  
  return `PAT${year}${month}${(maxNumber + index + 1).toString().padStart(4, '0')}`;
};

const calculateDateOfBirth = (age) => {
  const today = new Date();
  const birthYear = today.getFullYear() - age;
  const birthMonth = Math.floor(Math.random() * 12);
  const birthDay = Math.floor(Math.random() * 28) + 1;
  return new Date(birthYear, birthMonth, birthDay); // Return Date object for database
};

// Download and save a random avatar image for patient
const downloadPatientPhoto = async (patientId, gender) => {
  return new Promise((resolve, reject) => {
    try {
      // Create uploads/patients directory if it doesn't exist
      const uploadsDir = path.join(__dirname, '../uploads/patients');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Generate a random seed for consistent but varied avatars
      const seed = Math.floor(Math.random() * 10000);
      const genderParam = gender === 'Female' ? 'women' : 'men';
      
      // Use a placeholder service that provides different faces
      const imageUrl = `https://randomuser.me/api/portraits/${genderParam}/${seed % 99}.jpg`;
      
      const filename = `patient-${Date.now()}-${Math.floor(Math.random() * 1000000)}.jpg`;
      const filepath = path.join(uploadsDir, filename);
      
      const file = fs.createWriteStream(filepath);
      
      const request = https.get(imageUrl, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            // Return relative path for database storage
            resolve(`uploads/patients/${filename}`);
          });
          file.on('error', (err) => {
            fs.unlink(filepath, () => {}); // Clean up empty file
            resolve(null);
          });
        } else {
          // If download fails, resolve with null (no photo)
          fs.unlink(filepath, () => {}); // Clean up empty file
          resolve(null);
        }
      });
      
      request.on('error', (err) => {
        fs.unlink(filepath, () => {}); // Clean up empty file
        resolve(null); // Don't reject, just continue without photo
      });
      
      // Set timeout for the request
      request.setTimeout(5000, () => {
        request.destroy();
        fs.unlink(filepath, () => {}); // Clean up empty file
        resolve(null);
      });
      
    } catch (error) {
      resolve(null); // Don't reject, just continue without photo
    }
  });
};

// Generate dummy patients
const generatePatients = async (doctorId, count = 150) => {
  const patients = [];
  
  console.log('Generating patients with photos...');
  
  for (let i = 0; i < count; i++) {
    const age = getRandomAge();
    const firstName = getRandomElement(firstNames);
    const lastName = getRandomElement(lastNames);
    const name = `${firstName} ${lastName}`;
    const sex = getRandomElement(['Male', 'Female']);
    
    // Show progress for photo downloads
    if (i % 10 === 0) {
      console.log(`Processing patient ${i + 1}/${count}...`);
    }
    
    // Download patient photo (with some patients having no photo for realism)
    let photoPath = null;
    if (Math.random() > 0.2) { // 80% chance of having a photo
      try {
        photoPath = await downloadPatientPhoto(await generatePatientId(i), sex);
      } catch (error) {
        console.log(`Failed to download photo for patient ${i + 1}, continuing...`);
      }
    }
    
    const patient = {
      patientId: await generatePatientId(i),
      photo: photoPath,
      name: name,
      dateOfBirth: calculateDateOfBirth(age),
      age: age,
      sex: sex,
      address: getRandomElement(addresses),
      phone: generatePhone(),
      emergencyContact: {
        name: `${getRandomElement(firstNames)} ${lastName}`,
        relation: getRandomElement(relations),
        phone: generatePhone()
      },
      medicalHistory: {
        allergies: getRandomElement(allergies),
        chronicIllnesses: getRandomElement(chronicIllnesses),
        pastSurgeries: getRandomElement(pastSurgeries),
        medications: getRandomElement(medications),
        additionalNotes: `Patient has been regular with appointments. ${getRandomElement(['Generally cooperative', 'Needs medication reminders', 'Family support available', 'Lives independently'])}.`
      },
      doctorId: doctorId
    };
    
    patients.push(patient);
  }
  
  return patients;
};

// Generate dummy prescriptions
const generatePrescriptions = async (patients, doctorId, count = 500) => {
  const prescriptionsData = [];
  
  console.log('Generating prescriptions...');
  console.log(`Note: ${Math.floor(count / 2)} prescriptions will have follow-up dates, ${Math.ceil(count / 2)} will not.`);
  
  for (let i = 0; i < count; i++) {
    const patient = getRandomElement(patients);
    const createdDate = getRandomDate(new Date(2024, 0, 1), new Date());
    
    // Show progress
    if (i % 50 === 0) {
      console.log(`Processing prescription ${i + 1}/${count}...`);
    }
    
    // Only first 250 prescriptions (50%) will have follow-up dates
    let followUpDate = null;
    if (i < 250) {
      const followUp = new Date(createdDate);
      followUp.setDate(followUp.getDate() + Math.floor(Math.random() * 24) + 7);
      followUpDate = followUp; // Store as Date object for database
    }
    
    // Generate unique prescription ID with timestamp to ensure uniqueness
    const dateString = createdDate.toISOString().slice(0, 10).replace(/-/g, '');
    const timestamp = Date.now().toString().slice(-6);
    const prescriptionId = `RX${dateString}${timestamp}${i.toString().padStart(3, '0')}`;
    
    const prescription = {
      prescriptionId: prescriptionId,
      patientId: patient._id,
      doctorId: doctorId,
      patientName: patient.name,
      patientAge: patient.age,
      symptoms: getRandomElement(symptoms),
      prescription: getRandomElement(prescriptions),
      nextFollowUp: followUpDate, // Will be null for 250 prescriptions
      notes: getRandomElement(notes),
      createdAt: createdDate // Store as Date object for database
    };
    
    prescriptionsData.push(prescription);
  }
  
  return prescriptionsData;
};

const main = async () => {
  try {
    await connectDB();
    
    console.log('Starting dummy data generation...');
    
    // Get the first doctor from the database
    const doctor = await Doctor.findOne();
    if (!doctor) {
      console.error('No doctor found in database. Please create a doctor first.');
      process.exit(1);
    }
    
    console.log(`Using doctor: ${doctor.name} (${doctor.username})`);
    
    // Check existing data
    const existingPatients = await Patient.countDocuments();
    const existingPrescriptions = await Prescription.countDocuments();
    
    console.log(`Current data - Patients: ${existingPatients}, Prescriptions: ${existingPrescriptions}`);
    
    // Generate and insert patients
    console.log('Generating 150 patients with photos...');
    const patientData = await generatePatients(doctor._id, 150);
    console.log('Inserting patients into database...');
    const insertedPatients = await Patient.insertMany(patientData);
    console.log(`✅ Successfully inserted ${insertedPatients.length} patients`);
    
    // Generate and insert prescriptions
    console.log('Generating 500 prescriptions...');
    const prescriptionData = await generatePrescriptions(insertedPatients, doctor._id, 500);
    console.log('Inserting prescriptions into database...');
    const insertedPrescriptions = await Prescription.insertMany(prescriptionData);
    console.log(`✅ Successfully inserted ${insertedPrescriptions.length} prescriptions`);
    
    // Final counts
    const totalPatients = await Patient.countDocuments();
    const totalPrescriptions = await Prescription.countDocuments();
    const prescriptionsWithFollowUp = await Prescription.countDocuments({ nextFollowUp: { $ne: null } });
    const prescriptionsWithoutFollowUp = await Prescription.countDocuments({ nextFollowUp: null });
    
    console.log('\n📊 Final Database Stats:');
    console.log(`Total Patients: ${totalPatients}`);
    console.log(`Total Prescriptions: ${totalPrescriptions}`);
    console.log(`Prescriptions with Follow-up: ${prescriptionsWithFollowUp}`);
    console.log(`Prescriptions without Follow-up: ${prescriptionsWithoutFollowUp}`);
    console.log(`Doctors: ${await Doctor.countDocuments()}`);
    
    console.log('\n🎉 Dummy data generation completed successfully!');
    
  } catch (error) {
    console.error('Error generating dummy data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = { generatePatients, generatePrescriptions };
