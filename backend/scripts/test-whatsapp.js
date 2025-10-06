require('dotenv').config();
const axios = require('axios');

async function testWhatsAppMessage() {
  // Test için gönderilecek numara (Meta Dashboard'a eklediğiniz numara)
  const TEST_PHONE_NUMBER = '+90XXXXXXXXXX'; // KENDİ NUMARANIZI YAZIN!
  
  const url = `${process.env.WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  
  const data = {
    messaging_product: 'whatsapp',
    to: TEST_PHONE_NUMBER.replace('+', ''), // + işaretini kaldır
    type: 'text',
    text: {
      body: '🎉 Test mesajı başarılı! WhatsApp Business API çalışıyor.'
    }
  };

  const headers = {
    'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    console.log('📱 Mesaj gönderiliyor...');
    console.log('To:', TEST_PHONE_NUMBER);
    console.log('API URL:', url);
    
    const response = await axios.post(url, data, { headers });
    
    console.log('✅ BAŞARILI! Mesaj gönderildi.');
    console.log('Message ID:', response.data.messages[0].id);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ HATA:', error.response?.data || error.message);
    
    if (error.response?.data?.error) {
      const err = error.response.data.error;
      console.log('\n🔍 Hata Detayı:');
      console.log('Code:', err.code);
      console.log('Message:', err.message);
      
      if (err.code === 100 && err.message.includes('number is not a valid')) {
        console.log('\n⚠️  Çözüm: Bu numarayı Meta Dashboard\'da "To" listesine eklemeniz gerekiyor.');
      }
    }
  }
}

// Test et
testWhatsAppMessage();