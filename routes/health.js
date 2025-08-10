const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Health check endpoint
router.get('/', (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    port: process.env.PORT || 5000,
    cors_origin: process.env.CORS_ORIGIN || 'Not set'
  };
  
  try {
    res.status(200).json(healthCheck);
  } catch (error) {
    res.status(503).json({
      message: 'Service Unavailable',
      error: error.message
    });
  }
});

module.exports = router;
