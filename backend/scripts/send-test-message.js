require('dotenv').config();
const axios = require('axios');

async function sendTestMessage() {
  const API_URL = 'http://localhost:3000/api';
  
  // First, login to get token
  try {
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Send message
    console.log('📤 Sending test message to Cavit...');
    const messageResponse = await axios.post(
      `${API_URL}/messages/send`,
      {
        customer_id: '24c3b959-190e-45dc-9d92-0963f98f0a22', // Cavit's ID
        content: 'Test mesajı - ' + new Date().toLocaleString('tr-TR'),
        message_type: 'text'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Message sent successfully!');
    console.log('Response:', JSON.stringify(messageResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

sendTestMessage();