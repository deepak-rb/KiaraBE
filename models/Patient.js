const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  photo: {
    type: String, // Path to uploaded photo
    default: null
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  sex: {
    type: String,
    required: true,
    enum: ['Male', 'Female', 'Other']
  },
  address: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  emergencyContact: {
    name: {
      type: String,
      required: true
    },
    relation: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    }
  },
  medicalHistory: {
    allergies: String,
    chronicIllnesses: String,
    pastSurgeries: String,
    medications: String,
    additionalNotes: String
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  }
}, {
  timestamps: true
});

// Create text index for fuzzy search
patientSchema.index({
  name: 'text',
  patientId: 'text',
  phone: 'text',
  'emergencyContact.name': 'text'
});

module.exports = mongoose.model('Patient', patientSchema);
