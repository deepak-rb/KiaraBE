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

// Generate unique patient ID starting from P1000
const generatePatientId = async () => {
  // Find the highest existing patient ID that follows the P{number} format
  const lastPatient = await Patient.findOne(
    { patientId: { $regex: /^P\d+$/ } },
    {},
    { sort: { patientId: -1 } }
  );
  
  let nextNumber = 1000; // Start from P1000 by default
  
  if (lastPatient && lastPatient.patientId) {
    // Extract the number from the last patient ID (e.g., "P1005" -> 1005)
    const lastNumber = parseInt(lastPatient.patientId.substring(1));
    if (!isNaN(lastNumber)) {
      nextNumber = Math.max(lastNumber + 1, 1000); // Ensure we don't go below P1000
    }
  }
  
  let patientId;
  let attempts = 0;
  
  do {
    patientId = `P${nextNumber}`;
    const existingPatient = await Patient.findOne({ patientId });
    if (!existingPatient) break;
    nextNumber++;
    attempts++;
  } while (attempts < 10000); // Safety limit
  
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
    // Parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get total count of patients for this doctor
    const totalPatients = await Patient.countDocuments({ 
      doctorId: req.doctor._id 
    });

    // Get paginated patients
    const patients = await Patient.find({ doctorId: req.doctor._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalPatients / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    res.json({ 
      patients,
      pagination: {
        currentPage: page,
        totalPages,
        totalPatients,
        limit,
        hasNextPage,
        hasPrevPage
      }
    });
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

    // First try exact/regex search for better precision
    const searchTerm = query.toLowerCase().trim();
    const regexResults = patients.filter(patient => {
      const name = patient.name.toLowerCase();
      const patientId = patient.patientId.toLowerCase();
      const phone = patient.phone?.toLowerCase() || '';
      const emergencyName = patient.emergencyContact?.name?.toLowerCase() || '';
      
      // Check for exact matches or contains matches
      return name.includes(searchTerm) || 
             patientId.includes(searchTerm) ||
             phone.includes(searchTerm) ||
             emergencyName.includes(searchTerm) ||
             // Check if search term matches multiple words (like "Rakesh Gupta")
             searchTerm.split(' ').every(word => name.includes(word));
    });

    // If regex search finds results, use those (more precise)
    if (regexResults.length > 0) {
      // Sort by relevance - exact name matches first
      regexResults.sort((a, b) => {
        const aNameLower = a.name.toLowerCase();
        const bNameLower = b.name.toLowerCase();
        
        // Exact match gets highest priority
        if (aNameLower === searchTerm) return -1;
        if (bNameLower === searchTerm) return 1;
        
        // Starts with gets second priority
        if (aNameLower.startsWith(searchTerm)) return -1;
        if (bNameLower.startsWith(searchTerm)) return 1;
        
        // Default to alphabetical
        return aNameLower.localeCompare(bNameLower);
      });
      
      return res.json({ patients: regexResults });
    }

    // If no exact matches, fall back to fuzzy search with stricter threshold
    const fuseOptions = {
      keys: [
        { name: 'name', weight: 0.5 },
        { name: 'patientId', weight: 0.3 },
        { name: 'phone', weight: 0.15 },
        { name: 'emergencyContact.name', weight: 0.05 }
      ],
      threshold: 0.2, // Much stricter threshold (lower = more strict)
      includeScore: true,
      minMatchCharLength: 2 // Minimum characters to match
    };

    const fuse = new Fuse(patients, fuseOptions);
    const searchResults = fuse.search(query);

    // Filter results with good scores (score closer to 0 is better)
    const filteredResults = searchResults
      .filter(result => result.score < 0.3) // Only include good matches
      .map(result => result.item);

    res.json({ patients: filteredResults });
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
