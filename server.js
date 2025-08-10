const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Load environment variables based on NODE_ENV
const path = require('path');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
require('dotenv').config({ path: path.resolve(__dirname, envFile) });

// Debug environment variables
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT);
console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);
console.log('CORS Origin:', process.env.CORS_ORIGIN);

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const prescriptionRoutes = require('./routes/prescriptions');
const doctorRoutes = require('./routes/doctors');
const statsRoutes = require('./routes/stats');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "https:", "http:"],
    },
  },
  crossOriginResourcePolicy: false, // Disable global CORP to allow custom headers
}));

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://kiaraclinic.xyz',
        'https://www.kiaraclinic.xyz',
        process.env.CORS_ORIGIN
      ].filter(Boolean)
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
};

app.use(cors(corsOptions));

// Rate limiting - More permissive for Kiara Clinic management
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 500, // limit each IP to 500 requests per minute (increased from 100)
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for static files and uploads
    return req.url.startsWith('/uploads/');
  }
});

// More lenient rate limit for patient operations
const patientLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // limit each IP to 1000 requests per minute for patient operations
  message: { message: 'Too many patient requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// More lenient rate limit for prescription operations
const prescriptionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // limit each IP to 1000 requests per minute for prescription operations
  message: { message: 'Too many prescription requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', (req, res, next) => {
  // Set comprehensive CORS headers for images
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
}, express.static('uploads'));

// Database connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientLimiter, patientRoutes); // Apply more lenient rate limiting to patient routes
app.use('/api/prescriptions', prescriptionLimiter, prescriptionRoutes); // Apply more lenient rate limiting to prescription routes
app.use('/api/doctors', doctorRoutes);
app.use('/api/stats', statsRoutes);

// Specific route for patient images with enhanced CORS
app.get('/patient-image/:filename', (req, res) => {
  const { filename } = req.params;
  const fs = require('fs');
  const path = require('path');
  
  console.log('Image request for:', filename); // Debug log
  
  const imagePath = path.join(__dirname, 'uploads', 'patients', filename);
  console.log('Full image path:', imagePath); // Debug log
  
  // Check if file exists
  if (!fs.existsSync(imagePath)) {
    console.log('Image not found:', imagePath); // Debug log
    return res.status(404).json({ message: 'Image not found' });
  }
  
  console.log('Serving image:', imagePath); // Debug log
  
  // Set minimal headers for maximum compatibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'image/jpeg');
  
  // Send the image
  res.sendFile(imagePath, (err) => {
    if (err) {
      console.error('Error sending image:', err);
      res.status(500).json({ message: 'Error serving image' });
    } else {
      console.log('Image sent successfully:', filename);
    }
  });
});

// Debug endpoint to check patient photos
app.get('/debug/patients', async (req, res) => {
  try {
    const Patient = require('./models/Patient');
    const patients = await Patient.find({}).limit(5).select('name photo patientId');
    res.json({ patients });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
