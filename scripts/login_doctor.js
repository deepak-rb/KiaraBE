const axios = require('axios');

async function loginDoctor() {
  try {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'bipincysp',
      password: 'Bipincy@123'
    });
    
    console.log('Doctor logged in successfully!');
    console.log('Response:', response.data);
    console.log('Token:', response.data.token);
    console.log('Doctor Info:', response.data.doctor);
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

loginDoctor();
