const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  prescriptionId: {
    type: String,
    unique: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  patientName: {
    type: String,
    required: true
  },
  patientAge: {
    type: Number,
    required: true
  },
  symptoms: {
    type: String,
    required: true
  },
  prescription: {
    type: String,
    required: true
  },
  nextFollowUp: {
    type: Date,
    default: null
  },
  digitalSignature: {
    type: String, // Doctor's digital signature
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'follow_up_completed', 'completed'],
    default: 'active'
  },
  originalPrescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
    default: null
  }
}, {
  timestamps: true
});

// Generate prescription ID
prescriptionSchema.pre('save', function(next) {
  if (!this.prescriptionId) {
    const date = new Date();
    const dateString = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.prescriptionId = `RX${dateString}${randomNum}`;
  }
  next();
});

module.exports = mongoose.model('Prescription', prescriptionSchema);
