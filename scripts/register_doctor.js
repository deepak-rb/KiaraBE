const axios = require('axios');

async function registerDoctor() {
  try {
    const response = await axios.post('http://localhost:5000/api/auth/register', {
      username: 'deepak',
      email: 'deepak@gmail.com',
      password: 'deepak123',
      name: 'Dr. Deepak',
      specialization: 'General Medicine',
      licenseNumber: 'MED001234',
      phone: '+1234567890',
      clinicName: 'Deepak Medical Clinic',
      clinicAddress: '123 Health Street, Medical City'
    });
    
    console.log('Doctor registered successfully!');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Registration failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

registerDoctor();
