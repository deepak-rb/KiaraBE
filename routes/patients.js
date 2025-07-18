const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');
const auth = require('../middleware/auth');
const Fuse = require('fuse.js');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/patients/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'patient-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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

// Generate unique patient ID
const generatePatientId = async () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  let counter = 1;
  let patientId;
  
  do {
    const counterStr = counter.toString().padStart(4, '0');
    patientId = `P${year}${month}${counterStr}`;
    const existingPatient = await Patient.findOne({ patientId });
    if (!existingPatient) break;
    counter++;
  } while (counter < 10000);
  
  return patientId;
};

// Add new patient
router.post('/', auth, upload.single('photo'), async (req, res) => {
  try {
    const {
      patientId: customPatientId,
      name,
      dateOfBirth,
      age,
      sex,
      address,
      phone,
      emergencyContactName,
      emergencyContactRelation,
      emergencyContactPhone,
      allergies,
      chronicIllnesses,
      pastSurgeries,
      medications,
      additionalNotes
    } = req.body;

    // Generate patient ID if not provided
    const patientId = customPatientId || await generatePatientId();

    // Check if patient ID already exists
    const existingPatient = await Patient.findOne({ patientId });
    if (existingPatient) {
      return res.status(400).json({ message: 'Patient ID already exists' });
    }

    const patient = new Patient({
      patientId,
      photo: req.file ? req.file.path.replace(/\\/g, '/') : null,
      name,
      dateOfBirth: new Date(dateOfBirth),
      age: parseInt(age),
      sex,
      address,
      phone,
      emergencyContact: {
        name: emergencyContactName,
        relation: emergencyContactRelation,
        phone: emergencyContactPhone
      },
      medicalHistory: {
        allergies,
        chronicIllnesses,
        pastSurgeries,
        medications,
        additionalNotes
      },
      doctorId: req.doctor._id
    });

    await patient.save();

    res.status(201).json({
      message: 'Patient added successfully',
      patient
    });
  } catch (error) {
    console.error('Add patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all patients for the doctor
router.get('/', auth, async (req, res) => {
  try {
    const patients = await Patient.find({ doctorId: req.doctor._id })
      .sort({ createdAt: -1 });
    
    res.json({ patients });
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search patients with fuzzy search
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Get all patients for the doctor
    const patients = await Patient.find({ doctorId: req.doctor._id });

    // Configure Fuse.js for fuzzy search
    const fuseOptions = {
      keys: [
        { name: 'name', weight: 0.4 },
        { name: 'patientId', weight: 0.3 },
        { name: 'phone', weight: 0.2 },
        { name: 'emergencyContact.name', weight: 0.1 }
      ],
      threshold: 0.4, // Lower threshold means more strict matching
      includeScore: true
    };

    const fuse = new Fuse(patients, fuseOptions);
    const searchResults = fuse.search(query);

    // Extract the actual patient objects
    const results = searchResults.map(result => result.item);

    res.json({ patients: results });
  } catch (error) {
    console.error('Search patients error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get patient by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const patient = await Patient.findOne({
      _id: req.params.id,
      doctorId: req.doctor._id
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json({ patient });
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update patient
router.put('/:id', auth, upload.single('photo'), async (req, res) => {
  try {
    const patient = await Patient.findOne({
      _id: req.params.id,
      doctorId: req.doctor._id
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Update fields
    const updateFields = { ...req.body };
    if (req.body.emergencyContactName) {
      updateFields.emergencyContact = {
        name: req.body.emergencyContactName,
        relation: req.body.emergencyContactRelation,
        phone: req.body.emergencyContactPhone
      };
    }

    if (req.body.allergies !== undefined) {
      updateFields.medicalHistory = {
        allergies: req.body.allergies,
        chronicIllnesses: req.body.chronicIllnesses,
        pastSurgeries: req.body.pastSurgeries,
        medications: req.body.medications,
        additionalNotes: req.body.additionalNotes
      };
    }

    if (req.file) {
      // Delete old photo if exists
      if (patient.photo && fs.existsSync(patient.photo)) {
        fs.unlinkSync(patient.photo);
      }
      updateFields.photo = req.file.path.replace(/\\/g, '/');
    }

    Object.assign(patient, updateFields);
    await patient.save();

    res.json({
      message: 'Patient updated successfully',
      patient
    });
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete patient
router.delete('/:id', auth, async (req, res) => {
  try {
    const patient = await Patient.findOne({
      _id: req.params.id,
      doctorId: req.doctor._id
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Delete all prescriptions associated with this patient
    const deletedPrescriptions = await Prescription.deleteMany({
      patientId: req.params.id,
      doctorId: req.doctor._id
    });

    console.log(`Deleted ${deletedPrescriptions.deletedCount} prescriptions for patient ${patient.name}`);

    // Delete photo if exists
    if (patient.photo && fs.existsSync(patient.photo)) {
      fs.unlinkSync(patient.photo);
    }

    await Patient.findByIdAndDelete(req.params.id);

    res.json({ 
      message: 'Patient deleted successfully', 
      deletedPrescriptions: deletedPrescriptions.deletedCount 
    });
  } catch (error) {
    console.error('Delete patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
