const express = require('express');
const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const auth = require('../middleware/auth');

const router = express.Router();

// Utility function to clean up orphaned prescriptions
const cleanupOrphanedPrescriptions = async (doctorId) => {
  try {
    // Find all prescriptions for this doctor
    const prescriptions = await Prescription.find({ doctorId });
    
    // Check which prescriptions have invalid patient references
    const orphanedPrescriptions = [];
    
    for (const prescription of prescriptions) {
      const patient = await Patient.findById(prescription.patientId);
      if (!patient) {
        orphanedPrescriptions.push(prescription._id);
      }
    }
    
    // Delete orphaned prescriptions
    if (orphanedPrescriptions.length > 0) {
      await Prescription.deleteMany({ _id: { $in: orphanedPrescriptions } });
      console.log(`Cleaned up ${orphanedPrescriptions.length} orphaned prescriptions`);
    }
    
    return orphanedPrescriptions.length;
  } catch (error) {
    console.error('Error cleaning up orphaned prescriptions:', error);
    return 0;
  }
};

// Create new prescription
router.post('/', auth, async (req, res) => {
  try {
    const {
      patientId,
      symptoms,
      prescription,
      nextFollowUp,
      notes,
      originalPrescriptionId // New field for follow-up prescriptions
    } = req.body;

    // Validate mandatory fields
    if (!patientId) {
      return res.status(400).json({ message: 'Patient is mandatory. Please select a patient.' });
    }

    if (!symptoms) {
      return res.status(400).json({ message: 'Symptoms are required.' });
    }

    if (!prescription) {
      return res.status(400).json({ message: 'Prescription details are required.' });
    }

    // Get patient details
    const patient = await Patient.findOne({
      _id: patientId,
      doctorId: req.doctor._id
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found or does not belong to this doctor.' });
    }

    const newPrescription = new Prescription({
      patientId: patient._id,
      doctorId: req.doctor._id,
      patientName: patient.name,
      patientAge: patient.age,
      symptoms,
      prescription,
      nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null,
      digitalSignature: req.doctor.digitalSignature,
      notes,
      originalPrescriptionId: originalPrescriptionId || null
    });

    // Generate prescription ID manually
    if (!newPrescription.prescriptionId) {
      const date = new Date();
      const dateString = date.toISOString().slice(0, 10).replace(/-/g, '');
      const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      newPrescription.prescriptionId = `RX${dateString}${randomNum}`;
    }

    await newPrescription.save();

    // If this is a follow-up prescription, update the original prescription status
    if (originalPrescriptionId) {
      try {
        await Prescription.findByIdAndUpdate(
          originalPrescriptionId,
          { status: 'follow_up_completed' },
          { new: true }
        );
        console.log(`Updated original prescription ${originalPrescriptionId} status to follow_up_completed`);
      } catch (updateError) {
        console.error('Error updating original prescription status:', updateError);
        // Don't fail the request if status update fails
      }
    }

    // Populate doctor and patient details for response
    await newPrescription.populate('doctorId', 'name specialization licenseNumber clinicName clinicAddress');
    await newPrescription.populate('patientId', 'name age phone address');

    res.status(201).json({
      message: 'Prescription created successfully',
      prescription: newPrescription
    });
  } catch (error) {
    console.error('Create prescription error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all prescriptions for the doctor
router.get('/', auth, async (req, res) => {
  try {
    // Clean up orphaned prescriptions first
    await cleanupOrphanedPrescriptions(req.doctor._id);
    
    // Parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Parse filter parameter
    const filter = req.query.filter;

    // Build query based on filter
    let query = { doctorId: req.doctor._id };
    
    if (filter === 'followups') {
      // Only get prescriptions that have a follow-up date
      query.nextFollowUp = { $exists: true, $ne: null };
    }

    // Get total count of prescriptions for this doctor with filter applied
    const totalPrescriptions = await Prescription.countDocuments(query);

    // Get paginated prescriptions with filter applied
    const prescriptions = await Prescription.find(query)
      .populate('patientId', 'name age phone patientId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Filter out prescriptions where patient doesn't exist anymore (double check)
    const validPrescriptions = prescriptions.filter(prescription => prescription.patientId !== null);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalPrescriptions / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({ 
      prescriptions: validPrescriptions,
      pagination: {
        currentPage: page,
        totalPages,
        totalPrescriptions,
        limit,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error('Get prescriptions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get prescriptions for a specific patient
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;

    // Verify patient belongs to doctor
    const patient = await Patient.findOne({
      _id: patientId,
      doctorId: req.doctor._id
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const prescriptions = await Prescription.find({
      patientId: patientId,
      doctorId: req.doctor._id
    })
    .populate('doctorId', 'name specialization licenseNumber clinicName clinicAddress')
    .sort({ createdAt: -1 });

    res.json({ 
      patient,
      prescriptions 
    });
  } catch (error) {
    console.error('Get patient prescriptions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search prescriptions - MUST be before /:id route to avoid conflicts
router.get('/search/:query', auth, async (req, res) => {
  try {
    const { query } = req.params;
    console.log('🔍 Backend search for:', query);

    // Escape special regex characters to prevent regex errors
    const escapeRegex = (string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    const escapedQuery = escapeRegex(query);
    
    // Only search by phone if the query looks like a phone number (contains digits)
    let patientIds = [];
    const hasDigits = /\d/.test(query);
    
    if (hasDigits) {
      // Clean and normalize the search query for phone numbers
      const phoneRegex = query.replace(/[^\d]/g, ''); // Extract only numbers for phone search
      
      if (phoneRegex.length > 0) {
        const matchingPatients = await Patient.find({
          doctorId: req.doctor._id,
          phone: { $regex: phoneRegex, $options: 'i' }
        });
        patientIds = matchingPatients.map(patient => patient._id);
        console.log('📞 Matching patients by phone:', matchingPatients.length);
      }
    }

    // Build search conditions
    const searchConditions = [
      { patientName: { $regex: escapedQuery, $options: 'i' } },
      { symptoms: { $regex: escapedQuery, $options: 'i' } },
      { prescription: { $regex: escapedQuery, $options: 'i' } },
      { prescriptionId: { $regex: escapedQuery, $options: 'i' } }
    ];

    // Only add patient ID search if we found matching patients
    if (patientIds.length > 0) {
      searchConditions.push({ patientId: { $in: patientIds } });
    }

    const searchQuery = {
      doctorId: req.doctor._id,
      $or: searchConditions
    };

    console.log('🔍 Search conditions count:', searchConditions.length);
    console.log('🔍 Patient IDs to search:', patientIds.length);

    const prescriptions = await Prescription.find(searchQuery)
    .populate('patientId', 'name age phone patientId')
    .sort({ createdAt: -1 });

    console.log('📊 Found prescriptions:', prescriptions.length);

    // Log first few results for debugging
    if (prescriptions.length > 0) {
      console.log('📋 Sample results:');
      prescriptions.slice(0, 3).forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.patientName} - ${p.prescriptionId}`);
      });
    }

    res.json({ prescriptions });
  } catch (error) {
    console.error('Search prescriptions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single prescription
router.get('/:id', auth, async (req, res) => {
  try {
    const prescription = await Prescription.findOne({
      _id: req.params.id,
      doctorId: req.doctor._id
    })
    .populate('patientId', 'name age phone patientId address photo')
    .populate('doctorId', 'name specialization licenseNumber clinicName clinicAddress phone');

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    res.json({ prescription });
  } catch (error) {
    console.error('Get prescription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update prescription
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      symptoms,
      prescription,
      nextFollowUp,
      notes
    } = req.body;

    // Validate mandatory fields
    if (!symptoms) {
      return res.status(400).json({ message: 'Symptoms are required.' });
    }

    if (!prescription) {
      return res.status(400).json({ message: 'Prescription details are required.' });
    }

    const prescriptionDoc = await Prescription.findOne({
      _id: req.params.id,
      doctorId: req.doctor._id
    });

    if (!prescriptionDoc) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    prescriptionDoc.symptoms = symptoms;
    prescriptionDoc.prescription = prescription;
    prescriptionDoc.nextFollowUp = nextFollowUp ? new Date(nextFollowUp) : null;
    prescriptionDoc.notes = notes;

    await prescriptionDoc.save();

    await prescriptionDoc.populate('patientId', 'name age phone patientId');
    await prescriptionDoc.populate('doctorId', 'name specialization licenseNumber clinicName clinicAddress');

    res.json({
      message: 'Prescription updated successfully',
      prescription: prescriptionDoc
    });
  } catch (error) {
    console.error('Update prescription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete prescription
router.delete('/:id', auth, async (req, res) => {
  try {
    const prescription = await Prescription.findOne({
      _id: req.params.id,
      doctorId: req.doctor._id
    });

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    await Prescription.findByIdAndDelete(req.params.id);

    res.json({ message: 'Prescription deleted successfully' });
  } catch (error) {
    console.error('Delete prescription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cleanup orphaned prescriptions endpoint
router.post('/cleanup', auth, async (req, res) => {
  try {
    const deletedCount = await cleanupOrphanedPrescriptions(req.doctor._id);
    res.json({ 
      message: 'Cleanup completed successfully', 
      deletedOrphanedPrescriptions: deletedCount 
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
