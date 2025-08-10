const express = require('express');
const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');
const auth = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', auth, async (req, res) => {
  try {
    // Get total counts for the doctor
    const totalPatients = await Patient.countDocuments({ 
      doctorId: req.doctor._id 
    });

    const totalPrescriptions = await Prescription.countDocuments({ 
      doctorId: req.doctor._id 
    });

    // Calculate today's prescriptions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayPrescriptions = await Prescription.countDocuments({
      doctorId: req.doctor._id,
      createdAt: { $gte: today, $lt: tomorrow }
    });

    // Calculate this week's prescriptions
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekPrescriptions = await Prescription.countDocuments({
      doctorId: req.doctor._id,
      createdAt: { $gte: weekStart }
    });

    // Calculate this month's prescriptions
    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth() - 1);
    monthStart.setHours(0, 0, 0, 0);

    const monthPrescriptions = await Prescription.countDocuments({
      doctorId: req.doctor._id,
      createdAt: { $gte: monthStart }
    });

    // Calculate follow-up statistics
    const totalFollowUps = await Prescription.countDocuments({
      doctorId: req.doctor._id,
      nextFollowUp: { $exists: true, $ne: null }
    });

    const followUpsToday = await Prescription.countDocuments({
      doctorId: req.doctor._id,
      nextFollowUp: { $gte: today, $lt: tomorrow }
    });

    const overdueFollowUps = await Prescription.countDocuments({
      doctorId: req.doctor._id,
      nextFollowUp: { $exists: true, $lt: today }
    });

    res.json({
      totalPatients,
      totalPrescriptions,
      todayPrescriptions,
      weekPrescriptions,
      monthPrescriptions,
      totalFollowUps,
      followUpsToday,
      overdueFollowUps
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
