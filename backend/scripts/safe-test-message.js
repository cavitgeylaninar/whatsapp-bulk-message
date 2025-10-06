require('dotenv').config();
const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function sendTestMessage() {
  console.log('⚠️  WhatsApp Test Mesajı Gönderme');
  console.log('=====================================\n');
  
  const phoneNumber = await askQuestion('📱 Mesaj gönderilecek numara (örn: 905431555634): ');
  const messageType = await askQuestion('📝 Mesaj tipi (1: Hello World Template, 2: Özel Mesaj): ');
  
  let messageContent = '';
  if (messageType === '2') {
    messageContent = await askQuestion('✍️  Mesaj içeriği: ');
  }
  
  console.log('\n📋 Gönderilecek Mesaj Özeti:');
  console.log(`Numara: ${phoneNumber}`);
  console.log(`Tip: ${messageType === '1' ? 'Hello World Template' : 'Özel Mesaj'}`);
  if (messageContent) console.log(`İçerik: ${messageContent}`);
  
  const confirm = await askQuestion('\n✅ Mesajı göndermek istiyor musunuz? (E/H): ');
  
  if (confirm.toLowerCase() !== 'e') {
    console.log('❌ İptal edildi.');
    rl.close();
    return;
  }
  
  const url = `${process.env.WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  
  let data;
  if (messageType === '1') {
    // Hello World Template
    data = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'template',
      template: {
        name: 'hello_world',
        language: {
          code: 'en_US'
        }
      }
    };
  } else {
    // Özel text mesajı (24 saat penceresi gerekir)
    data = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'text',
      text: {
        preview_url: false,
        body: messageContent
      }
    };
  }
  
  const headers = {
    'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  };
  
  try {
    console.log('\n📤 Mesaj gönderiliyor...');
    const response = await axios.post(url, data, { headers });
    
    console.log('✅ BAŞARILI! Mesaj gönderildi.');
    console.log('Message ID:', response.data.messages[0].id);
    
  } catch (error) {
    console.error('❌ HATA:', error.response?.data?.error?.message || error.message);
    
    if (error.response?.data?.error?.code === 131030) {
      console.log('\n⚠️  24 saat penceresi dışındasınız. Template mesaj kullanmalısınız.');
    }
  }
  
  rl.close();
}

sendTestMessage();