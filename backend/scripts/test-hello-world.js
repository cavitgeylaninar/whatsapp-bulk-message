require('dotenv').config();
const axios = require('axios');

async function testHelloWorldTemplate() {
  // Test numarası - sizin curl komutunuzdan
  const TEST_PHONE_NUMBER = '905431555634';
  
  const url = `${process.env.WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  
  const data = {
    messaging_product: 'whatsapp',
    to: TEST_PHONE_NUMBER,
    type: 'template',
    template: {
      name: 'hello_world',
      language: {
        code: 'en_US'
      }
    }
  };

  const headers = {
    'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    console.log('📱 Hello World template gönderiliyor...');
    console.log('To:', TEST_PHONE_NUMBER);
    console.log('Template: hello_world');
    console.log('API URL:', url);
    
    const response = await axios.post(url, data, { headers });
    
    console.log('✅ BAŞARILI! Template mesajı gönderildi.');
    console.log('Message ID:', response.data.messages[0].id);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ HATA:', error.response?.data || error.message);
    
    if (error.response?.data?.error) {
      const err = error.response.data.error;
      console.log('\n🔍 Hata Detayı:');
      console.log('Code:', err.code);
      console.log('Message:', err.message);
      
      if (err.error_subcode === 132000) {
        console.log('\n⚠️  Template bulunamadı. Meta Dashboard\'da "hello_world" template\'i var mı kontrol edin.');
      }
    }
  }
}

// Test et
testHelloWorldTemplate();