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
        digitalSignature: doctor.digitalSignature
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
        digitalSignature: req.doctor.digitalSignature
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
    const doctors = await Doctor.find({}).select('-password');
    const patients = await Patient.find({});
    const prescriptions = await Prescription.find({});

    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      data: {
        doctors,
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
  try {
    const { data } = req.body;

    if (!data || !data.doctors || !data.patients || !data.prescriptions) {
      return res.status(400).json({ message: 'Invalid data format' });
    }

    // Clear existing data
    await Doctor.deleteMany({});
    await Patient.deleteMany({});
    await Prescription.deleteMany({});

    // Import new data
    const importedDoctors = await Doctor.insertMany(data.doctors);
    const importedPatients = await Patient.insertMany(data.patients);
    const importedPrescriptions = await Prescription.insertMany(data.prescriptions);

    res.json({
      message: 'Data imported successfully',
      imported: {
        doctors: importedDoctors.length,
        patients: importedPatients.length,
        prescriptions: importedPrescriptions.length,
        total: importedDoctors.length + importedPatients.length + importedPrescriptions.length
      }
    });
  } catch (error) {
    console.error('Import data error:', error);
    res.status(500).json({ message: 'Failed to import data' });
  }
});

module.exports = router;
