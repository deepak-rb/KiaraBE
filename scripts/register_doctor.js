const axios = require('axios');

async function registerDoctor() {
  try {
    const response = await axios.post('http://localhost:5000/api/auth/register', {
      username: 'bipincysp',
      email: 'bipincyalen1993@gmail.com',
      password: 'Bipincy@123',
      name: 'Bipincy S P',
      specialization: 'Homeopathic Consultant',
      licenseNumber: 'Reg No: 11841',
      phone: '8281704219',
      clinicName: 'Kiara Homeopathic Speciality Clinic',
      clinicAddress: 'Kannaravila Pin:695524'
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
