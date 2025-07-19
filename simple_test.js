const fs = require('fs');
const axios = require('axios');

async function testImportStep() {
  try {
    console.log('Starting import test...');
    
    // Read test data
    const testData = JSON.parse(fs.readFileSync('./test_import_data.json', 'utf8'));
    console.log('Test data loaded:', {
      doctors: testData.data.doctors.length,
      patients: testData.data.patients.length,
      prescriptions: testData.data.prescriptions.length
    });
    
    // Login first
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'testuser',
      password: 'Test123!'
    });
    
    console.log('Login successful');
    const token = loginResponse.data.token;
    
    // Test import
    console.log('Testing import...');
    const importResponse = await axios.post('http://localhost:5000/api/auth/import-data', {
      data: testData.data
    }, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Import successful:', importResponse.data);
    
  } catch (error) {
    console.error('Test failed:');
    console.error('Error message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testImportStep();
