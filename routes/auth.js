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

// Get all users (Danger Zone)
router.get('/all-users', auth, async (req, res) => {
  try {
    const users = await Doctor.find({}, '-password');
    res.json({ users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new user (Danger Zone)
router.post('/create-user', auth, async (req, res) => {
  try {
    const { username, password, name, email, specialization, clinicName, clinicAddress, phone } = req.body;

    // Check if user already exists
    const existingUser = await Doctor.findOne({ 
      $or: [{ username }, { email }] 
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this username or email' });
    }

    const newUser = new Doctor({
      username,
      password,
      name,
      email,
      specialization: specialization || 'General',
      clinicName: clinicName || 'Default Clinic',
      clinicAddress: clinicAddress || '',
      phone: phone || '',
      licenseNumber: `LIC-${Date.now()}` // Auto-generate license number
    });

    await newUser.save();

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser._id,
        username: newUser.username,
        name: newUser.name,
        email: newUser.email,
        specialization: newUser.specialization,
        clinicName: newUser.clinicName,
        clinicAddress: newUser.clinicAddress,
        phone: newUser.phone
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (Danger Zone)
router.delete('/delete-user/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent deleting self
    if (id === req.doctor._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Check total user count before deletion
    const totalUsers = await Doctor.countDocuments();
    if (totalUsers <= 1) {
      return res.status(400).json({ message: 'Cannot delete the last user in the system' });
    }

    const deletedUser = await Doctor.findByIdAndDelete(id);
    
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
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

// Edit user (Danger Zone)
router.put('/edit-user/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, specialization, clinicName, clinicAddress, phone } = req.body;
    
    const user = await Doctor.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await Doctor.findOne({ email, _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    // Update user fields
    user.name = name || user.name;
    user.email = email || user.email;
    user.specialization = specialization || user.specialization;
    user.clinicName = clinicName || user.clinicName;
    user.clinicAddress = clinicAddress || user.clinicAddress;
    user.phone = phone || user.phone;

    await user.save();

    res.json({
      message: 'User updated successfully',
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        specialization: user.specialization,
        clinicName: user.clinicName,
        clinicAddress: user.clinicAddress,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Edit user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
