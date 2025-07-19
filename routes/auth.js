const express = require('express');
const jwt = require('jsonwebtoken');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');
const auth = require('../middleware/auth');

const router = express.Router();

// Register doctor (for initial setup)
router.post('/register', async (req, res) => {
  try {
    const { username, password, name, email, specialization, licenseNumber, phone, clinicName, clinicAddress } = req.body;

    // Check if doctor already exists
    const existingDoctor = await Doctor.findOne({ 
      $or: [{ username }, { email }, { licenseNumber }] 
    });

    if (existingDoctor) {
      return res.status(400).json({ message: 'Doctor already exists' });
    }

    const doctor = new Doctor({
      username,
      password,
      name,
      email,
      specialization,
      licenseNumber,
      phone,
      clinicName,
      clinicAddress
    });

    await doctor.save();

    const token = jwt.sign(
      { doctorId: doctor._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Doctor registered successfully',
      token,
      doctor: {
        id: doctor._id,
        username: doctor.username,
        name: doctor.name,
        email: doctor.email,
        specialization: doctor.specialization,
        licenseNumber: doctor.licenseNumber,
        clinicName: doctor.clinicName,
        clinicAddress: doctor.clinicAddress,
        phone: doctor.phone
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login doctor
router.post('/login', async (req, res) => {
  try {
    console.log('Login route hit');
    const { username, password } = req.body;
    console.log(`Attempting to log in user: ${username}`);

    console.log('Searching for doctor...');
    const doctor = await Doctor.findOne({ username });
    
    if (!doctor) {
      console.log('Doctor not found');
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    console.log('Doctor found, comparing password...');

    const isMatch = await doctor.comparePassword(password);
    if (!isMatch) {
      console.log('Password does not match');
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    console.log('Password matches, creating token...');

    const token = jwt.sign(
      { doctorId: doctor._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Login successful, sending response.');
    res.json({
      message: 'Login successful',
      token,
      doctor: {
        id: doctor._id,
        username: doctor.username,
        name: doctor.name,
        email: doctor.email,
        specialization: doctor.specialization,
        licenseNumber: doctor.licenseNumber,
        clinicName: doctor.clinicName,
        clinicAddress: doctor.clinicAddress,
        phone: doctor.phone,
        digitalSignature: doctor.digitalSignature,
        requirePasswordChange: doctor.requirePasswordChange || false
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current doctor
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      doctor: {
        id: req.doctor._id,
        username: req.doctor.username,
        name: req.doctor.name,
        email: req.doctor.email,
        specialization: req.doctor.specialization,
        licenseNumber: req.doctor.licenseNumber,
        clinicName: req.doctor.clinicName,
        clinicAddress: req.doctor.clinicAddress,
        phone: req.doctor.phone,
        digitalSignature: req.doctor.digitalSignature,
        requirePasswordChange: req.doctor.requirePasswordChange || false
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Danger Zone Authentication
router.post('/danger-zone-auth', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const doctor = await Doctor.findOne({ username });
    if (!doctor) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await doctor.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({ success: true, message: 'Authentication successful' });
  } catch (error) {
    console.error('Danger zone auth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password (Danger Zone)
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const doctor = await Doctor.findById(req.doctor._id);
    const isMatch = await doctor.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    doctor.password = newPassword;
    await doctor.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Force password change for imported users
router.post('/force-change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
    }

    const doctor = await Doctor.findById(req.doctor._id);
    const isMatch = await doctor.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password and remove requirePasswordChange flag
    doctor.password = newPassword;
    doctor.requirePasswordChange = false;
    await doctor.save();

    res.json({ 
      message: 'Password changed successfully. Please login with your new password.',
      requirePasswordChange: false
    });
  } catch (error) {
    console.error('Force change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get data counts (Danger Zone)
router.get('/data-counts', auth, async (req, res) => {
  try {
    // For single-doctor context, show 1 doctor (the current one)
    const doctorCount = 1;
    // Count only patients and prescriptions for the current doctor
    const patientCount = await Patient.countDocuments({ doctorId: req.doctor._id });
    const prescriptionCount = await Prescription.countDocuments({ doctorId: req.doctor._id });

    res.json({
      doctors: doctorCount,
      patients: patientCount,
      prescriptions: prescriptionCount,
      total: doctorCount + patientCount + prescriptionCount
    });
  } catch (error) {
    console.error('Get data counts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export all data (Danger Zone)
router.get('/export-data', auth, async (req, res) => {
  try {
    const doctors = await Doctor.find({});
    const patients = await Patient.find({});
    const prescriptions = await Prescription.find({});

    // Process doctors to include default password and mark for password reset
    const processedDoctors = doctors.map(doctor => {
      const { password, ...doctorWithoutPassword } = doctor.toObject();
      return {
        ...doctorWithoutPassword,
        password: 'Hello@123', // Default password for import
        requirePasswordChange: true // Flag to force password change on first login
      };
    });

    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      data: {
        doctors: processedDoctors,
        patients,
        prescriptions
      },
      counts: {
        doctors: doctors.length,
        patients: patients.length,
        prescriptions: prescriptions.length,
        total: doctors.length + patients.length + prescriptions.length
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="clinic-backup-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(exportData);
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Import and restore data (Danger Zone)
router.post('/import-data', auth, async (req, res) => {
  console.log('=== IMPORT ROUTE HIT ===');
  console.log('Request body keys:', Object.keys(req.body));
  console.log('Request body data keys:', req.body.data ? Object.keys(req.body.data) : 'NO DATA');
  
  try {
    const { data } = req.body;

    if (!data || !data.doctors || !data.patients || !data.prescriptions) {
      return res.status(400).json({ message: 'Invalid data format' });
    }

    console.log('Starting import process...');
    console.log('Data counts:', {
      doctors: data.doctors.length,
      patients: data.patients.length,
      prescriptions: data.prescriptions.length
    });

    // Step 1: Backup existing data before clearing
    console.log('Creating backup of existing data...');
    const existingDoctors = await Doctor.find({});
    const existingPatients = await Patient.find({});
    const existingPrescriptions = await Prescription.find({});
    
    console.log('Backup created with counts:', {
      doctors: existingDoctors.length,
      patients: existingPatients.length,
      prescriptions: existingPrescriptions.length
    });
    
    // Step 2: Process and validate imported data
    console.log('Processing and validating import data...');
    
    // Process doctor data - use default password and set requirePasswordChange flag
    const processedDoctors = data.doctors.map((doctor, index) => {
      const { _id, __v, createdAt, updatedAt, ...cleanDoctor } = doctor;
      
      return {
        ...cleanDoctor,
        password: 'Hello@123', // Use default password for all imported doctors
        requirePasswordChange: true, // Force password change on first login
        digitalSignature: null // Reset digitalSignature field to null during import
      };
    });

    // Process patient data - remove _id, __v and reset photo fields to null
    const processedPatients = data.patients.map(patient => {
      const { _id, __v, createdAt, updatedAt, ...cleanPatient } = patient;
      return {
        ...cleanPatient,
        photo: null // Reset photo field to null during import
      };
    });

    // Process prescription data - remove _id, __v and reset digitalSignature fields to null
    const processedPrescriptions = data.prescriptions.map(prescription => {
      const { _id, __v, createdAt, updatedAt, ...cleanPrescription } = prescription;
      return {
        ...cleanPrescription,
        digitalSignature: null // Reset digitalSignature field to null during import
      };
    });

    console.log('Processed data counts:', {
      doctors: processedDoctors.length,
      patients: processedPatients.length,
      prescriptions: processedPrescriptions.length
    });

    // Log a sample of processed data for debugging
    if (processedDoctors.length > 0) {
      console.log('Sample processed doctor:', JSON.stringify(processedDoctors[0], null, 2));
    }
    if (processedPatients.length > 0) {
      console.log('Sample processed patient:', JSON.stringify(processedPatients[0], null, 2));
    }
    if (processedPrescriptions.length > 0) {
      console.log('Sample processed prescription:', JSON.stringify(processedPrescriptions[0], null, 2));
    }

    // Step 3: Validate data before import by testing with mongoose validation
    console.log('Validating data structure...');
    
    try {
      // Test validation on a few sample documents
      if (processedDoctors.length > 0) {
        console.log('Testing doctor validation with sample:', JSON.stringify(processedDoctors[0], null, 2));
        const testDoctor = new Doctor(processedDoctors[0]);
        // Skip password hashing for validation test
        testDoctor.isModified = () => false;
        await testDoctor.validate();
        console.log('Doctor data validation passed');
      }
      
      if (processedPatients.length > 0) {
        // For patient validation, we need a valid doctor ID
        let testPatientData = { ...processedPatients[0] };
        if (processedDoctors.length > 0) {
          // Create a temporary doctor to get a valid ObjectId
          const tempDoctor = new Doctor(processedDoctors[0]);
          testPatientData.doctorId = tempDoctor._id;
        }
        console.log('Testing patient validation with sample:', JSON.stringify(testPatientData, null, 2));
        const testPatient = new Patient(testPatientData);
        await testPatient.validate();
        console.log('Patient data validation passed');
      }
      
      if (processedPrescriptions.length > 0) {
        // For prescription validation, we need valid doctor and patient IDs
        let testPrescriptionData = { ...processedPrescriptions[0] };
        if (processedDoctors.length > 0) {
          const tempDoctor = new Doctor(processedDoctors[0]);
          testPrescriptionData.doctorId = tempDoctor._id;
        }
        if (processedPatients.length > 0) {
          const tempPatient = new Patient(processedPatients[0]);
          testPrescriptionData.patientId = tempPatient._id;
        }
        console.log('Testing prescription validation with sample:', JSON.stringify(testPrescriptionData, null, 2));
        const testPrescription = new Prescription(testPrescriptionData);
        await testPrescription.validate();
        console.log('Prescription data validation passed');
      }
    } catch (validationError) {
      console.error('Data validation failed:', validationError);
      console.error('Validation error details:', {
        message: validationError.message,
        name: validationError.name,
        errors: validationError.errors,
        stack: validationError.stack
      });
      return res.status(400).json({ 
        message: `Data validation failed: ${validationError.message}`,
        details: 'The imported data does not match the expected format or is missing required fields',
        validationErrors: validationError.errors || validationError.message
      });
    }

    // Step 4: Clear existing data only after validation passes
    console.log('Validation passed, clearing existing data...');
    await Doctor.deleteMany({});
    await Patient.deleteMany({});
    await Prescription.deleteMany({});
    console.log('Existing data cleared');

    // Step 5: Import new data with error handling and rollback capability
    console.log('Starting data import...');
    let importedDoctors = [];
    let importedPatients = [];
    let importedPrescriptions = [];
    let importSuccess = true;
    let errorMessage = '';
    let doctorIdMapping = {}; // Map old doctor IDs to new ones

    try {
      // Import doctors first
      if (processedDoctors.length > 0) {
        console.log(`Importing ${processedDoctors.length} doctors...`);
        console.log('First doctor sample:', JSON.stringify(processedDoctors[0], null, 2));
        
        // Import doctors one by one to control password hashing
        for (let i = 0; i < processedDoctors.length; i++) {
          const doctorData = processedDoctors[i];
          const newDoctor = new Doctor(doctorData);
          
          // Let the password be hashed normally since we're using a plain text default password
          // The pre-save hook will hash 'Hello@123' automatically
          
          const savedDoctor = await newDoctor.save();
          importedDoctors.push(savedDoctor);
          
          console.log(`Imported doctor ${i + 1}: ${savedDoctor.username} with hashed password`);
          
          // Create mapping from old doctor IDs to new ones
          if (data.doctors[i] && data.doctors[i]._id) {
            doctorIdMapping[data.doctors[i]._id] = savedDoctor._id;
          }
        }
        
        console.log(`✓ Successfully imported ${importedDoctors.length} doctors`);
        console.log('Doctor ID mapping created:', doctorIdMapping);
      }

      // Import patients with updated doctor IDs
      if (processedPatients.length > 0) {
        console.log(`Importing ${processedPatients.length} patients...`);
        
        // Update patient doctorId references
        const patientsWithUpdatedDoctorIds = processedPatients.map(patient => {
          if (patient.doctorId && doctorIdMapping[patient.doctorId]) {
            return {
              ...patient,
              doctorId: doctorIdMapping[patient.doctorId]
            };
          } else if (importedDoctors.length > 0) {
            // If no mapping found, assign to first imported doctor
            return {
              ...patient,
              doctorId: importedDoctors[0]._id
            };
          }
          return patient;
        });
        
        console.log('First patient sample with updated doctorId:', JSON.stringify(patientsWithUpdatedDoctorIds[0], null, 2));
        importedPatients = await Patient.insertMany(patientsWithUpdatedDoctorIds, { ordered: false });
        console.log(`✓ Successfully imported ${importedPatients.length} patients`);
      }

      // Import prescriptions with updated doctor and patient IDs
      if (processedPrescriptions.length > 0) {
        console.log(`Importing ${processedPrescriptions.length} prescriptions...`);
        
        // Create patient ID mapping
        let patientIdMapping = {};
        data.patients.forEach((originalPatient, index) => {
          if (originalPatient._id && importedPatients[index]) {
            patientIdMapping[originalPatient._id] = importedPatients[index]._id;
          }
        });
        
        // Update prescription references
        const prescriptionsWithUpdatedIds = processedPrescriptions.map(prescription => {
          let updatedPrescription = { ...prescription };
          
          if (prescription.doctorId && doctorIdMapping[prescription.doctorId]) {
            updatedPrescription.doctorId = doctorIdMapping[prescription.doctorId];
          } else if (importedDoctors.length > 0) {
            updatedPrescription.doctorId = importedDoctors[0]._id;
          }
          
          if (prescription.patientId && patientIdMapping[prescription.patientId]) {
            updatedPrescription.patientId = patientIdMapping[prescription.patientId];
          } else if (importedPatients.length > 0) {
            updatedPrescription.patientId = importedPatients[0]._id;
          }
          
          return updatedPrescription;
        });
        
        console.log('First prescription sample with updated IDs:', JSON.stringify(prescriptionsWithUpdatedIds[0], null, 2));
        importedPrescriptions = await Prescription.insertMany(prescriptionsWithUpdatedIds, { ordered: false });
        console.log(`✓ Successfully imported ${importedPrescriptions.length} prescriptions`);
      }

    } catch (importError) {
      console.error('Import failed:', importError);
      console.error('Import error details:', {
        message: importError.message,
        name: importError.name,
        code: importError.code,
        stack: importError.stack
      });
      importSuccess = false;
      errorMessage = importError.message;

      // Step 6: Rollback - restore original data if import fails
      console.log('Import failed, attempting rollback...');
      try {
        // Clear any partially imported data
        await Doctor.deleteMany({});
        await Patient.deleteMany({});
        await Prescription.deleteMany({});

        // Restore original data
        if (existingDoctors.length > 0) {
          await Doctor.insertMany(existingDoctors);
          console.log(`Restored ${existingDoctors.length} doctors`);
        }
        if (existingPatients.length > 0) {
          await Patient.insertMany(existingPatients);
          console.log(`Restored ${existingPatients.length} patients`);
        }
        if (existingPrescriptions.length > 0) {
          await Prescription.insertMany(existingPrescriptions);
          console.log(`Restored ${existingPrescriptions.length} prescriptions`);
        }

        console.log('Rollback completed successfully');
        return res.status(500).json({ 
          message: `Import failed and data was restored to previous state: ${errorMessage}`,
          rollback: true
        });
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
        return res.status(500).json({ 
          message: `Import failed and rollback also failed. Database may be in inconsistent state: ${errorMessage}`,
          rollback: false,
          critical: true
        });
      }
    }

    if (importSuccess) {
      console.log('Import completed successfully');
      
      // Verify final counts
      const finalCounts = {
        doctors: await Doctor.countDocuments(),
        patients: await Patient.countDocuments(),
        prescriptions: await Prescription.countDocuments()
      };
      
      console.log('Final database counts:', finalCounts);

      // Check if we actually imported anything
      const totalImported = importedDoctors.length + importedPatients.length + importedPrescriptions.length;
      if (totalImported === 0) {
        console.log('WARNING: No data was imported even though import was successful');
        console.log('This might indicate validation or processing issues');
      }

      // Prepare warning message based on password handling
      let passwordWarning = 'All imported doctors have been assigned the default password "Hello@123" and will be required to change it on first login for security.';

      res.json({
        message: 'Data imported successfully.',
        imported: {
          doctors: importedDoctors.length,
          patients: importedPatients.length,
          prescriptions: importedPrescriptions.length,
          total: importedDoctors.length + importedPatients.length + importedPrescriptions.length
        },
        verified: finalCounts,
        warning: passwordWarning
      });
    } else {
      console.log('Import failed but no error was thrown - this should not happen');
      res.status(500).json({ message: 'Import failed due to unknown error' });
    }

  } catch (error) {
    console.error('Import data error:', error);
    res.status(500).json({ message: `Failed to import data: ${error.message}` });
  }
});

module.exports = router;
