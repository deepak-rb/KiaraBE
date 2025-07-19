const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Doctor = require('../models/Doctor');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for digital signature uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/signatures/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'signature-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Update doctor profile
router.put('/profile', auth, async (req, res) => {
  try {
    const {
      name,
      email,
      specialization,
      licenseNumber,
      clinicName,
      clinicAddress,
      phone
    } = req.body;

    const doctor = await Doctor.findById(req.doctor._id);
    
    if (name) doctor.name = name;
    if (email) doctor.email = email;
    if (specialization) doctor.specialization = specialization;
    if (licenseNumber) doctor.licenseNumber = licenseNumber;
    if (clinicName) doctor.clinicName = clinicName;
    if (clinicAddress) doctor.clinicAddress = clinicAddress;
    if (phone) doctor.phone = phone;

    await doctor.save();

    res.json({
      message: 'Profile updated successfully',
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
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload digital signature
router.post('/signature', auth, upload.single('signature'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No signature file uploaded' });
    }

    const doctor = await Doctor.findById(req.doctor._id);
    
    // Delete old signature if exists
    if (doctor.digitalSignature && fs.existsSync(doctor.digitalSignature)) {
      fs.unlinkSync(doctor.digitalSignature);
    }

    doctor.digitalSignature = req.file.path;
    await doctor.save();

    res.json({
      message: 'Digital signature uploaded successfully',
      signaturePath: req.file.path
    });
  } catch (error) {
    console.error('Upload signature error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete digital signature
router.delete('/signature', auth, async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.doctor._id);
    
    if (!doctor.digitalSignature) {
      return res.status(404).json({ message: 'No digital signature found' });
    }

    // Delete signature file if exists
    const fs = require('fs');
    if (fs.existsSync(doctor.digitalSignature)) {
      fs.unlinkSync(doctor.digitalSignature);
    }

    doctor.digitalSignature = null;
    await doctor.save();

    res.json({
      message: 'Digital signature deleted successfully'
    });
  } catch (error) {
    console.error('Delete signature error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
