const mongoose = require('mongoose');
const Doctor = require('./models/Doctor');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function testPasswordHash() {
  try {
    console.log('=== TESTING PASSWORD HASH ===');
    
    const storedHash = '$2b$10$lXqqQjFAUtQxLC8oUHWhYO5O.51Fvgu36L58xN42QmOSM0SGpobE2';
    
    // Test common passwords that might have been used
    const testPasswords = [
      'Hello@123',
      'Bipincy@123', 
      'TempPassword123!',
      'hello@123',
      'HELLO@123',
      'Hello@1234',
      'Hello123',
      'hello123',
      'password',
      'Password123',
      'Admin@123',
      'admin123',
      ''
    ];
    
    console.log('Testing passwords against stored hash...');
    
    for (let password of testPasswords) {
      const matches = await bcrypt.compare(password, storedHash);
      console.log(`Password '${password}': ${matches}`);
      if (matches) {
        console.log(`*** FOUND MATCH: '${password}' ***`);
        break;
      }
    }
    
    // Also test creating a new hash for Hello@123 to compare
    console.log('\n=== CREATING NEW HASH FOR Hello@123 ===');
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash('Hello@123', salt);
    console.log('New hash for Hello@123:', newHash);
    
    const testNewHash = await bcrypt.compare('Hello@123', newHash);
    console.log('New hash matches Hello@123:', testNewHash);
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Test error:', error);
    mongoose.disconnect();
  }
}

testPasswordHash();
