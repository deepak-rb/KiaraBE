const express = require('express');
const jwt = require('jsonwebtoken');
const Doctor = require('../models/Doctor');
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

module.exports = router;
