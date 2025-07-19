const axios = require('axios');

async function testImport() {
  try {
    console.log('Testing import functionality...');
    
    // First, login to get a token
    console.log('1. Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'bipincysp',
      password: 'Bipincy@123'
    });
    
    const token = loginResponse.data.token;
    console.log('✓ Login successful');
    
    // Get current data counts
    console.log('2. Getting current data counts...');
    const countsResponse = await axios.get('http://localhost:5000/api/auth/data-counts', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Current counts:', countsResponse.data);
    
    // Export data
    console.log('3. Exporting data...');
    const exportResponse = await axios.get('http://localhost:5000/api/auth/export-data', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Export successful, data structure:', {
      exportDate: exportResponse.data.exportDate,
      version: exportResponse.data.version,
      counts: exportResponse.data.counts,
      dataKeys: Object.keys(exportResponse.data.data),
      doctorsCount: exportResponse.data.data.doctors?.length || 0,
      patientsCount: exportResponse.data.data.patients?.length || 0,
      prescriptionsCount: exportResponse.data.data.prescriptions?.length || 0
    });
    
    // Test import with the same data
    console.log('4. Testing import...');
    const importResponse = await axios.post('http://localhost:5000/api/auth/import-data', {
      data: exportResponse.data.data
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✓ Import successful:', importResponse.data);
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testImport();
