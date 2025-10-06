const axios = require('axios');
const colors = require('colors');

// Test konfigürasyonu
const config = {
  baseUrl: process.env.API_URL || 'http://localhost:3000/api',
  webhookUrl: '/webhook/whatsapp',
  phoneNumberId: 'test_phone_number_id' // Test için sabit ID
};

// Test sonuçları
let results = {
  totalSent: 0,
  totalSuccess: 0,
  totalFailed: 0,
  startTime: null,
  endTime: null,
  errors: []
};

// Örnek webhook verisi oluştur
function generateWebhookData(messageCount = 1) {
  const messages = [];
  
  for (let i = 0; i < messageCount; i++) {
    messages.push({
      from: `90532${Math.floor(Math.random() * 10000000)}`,
      id: `wamid.${Date.now()}_${i}_${Math.random()}`,
      timestamp: Math.floor(Date.now() / 1000),
      type: 'text',
      text: {
        body: `Test mesajı ${i + 1} - ${new Date().toISOString()}`
      },
      profile: {
        name: `Test User ${i + 1}`
      }
    });
  }
  
  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '15551234567',
            phone_number_id: config.phoneNumberId
          },
          messages: messages
        },
        field: 'messages'
      }]
    }]
  };
}

// Tek webhook gönder
async function sendWebhook(data) {
  try {
    const response = await axios.post(`${config.baseUrl}${config.webhookUrl}`, data, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    results.totalSuccess++;
    return { success: true, status: response.status };
  } catch (error) {
    results.totalFailed++;
    results.errors.push(error.message);
    return { success: false, error: error.message };
  }
}

// Test 1: Tek mesaj testi
async function singleMessageTest() {
  console.log('\n' + '='.repeat(50).cyan);
  console.log('TEST 1: TEK MESAJ TESTİ'.yellow.bold);
  console.log('='.repeat(50).cyan);
  
  const data = generateWebhookData(1);
  const startTime = Date.now();
  const result = await sendWebhook(data);
  const duration = Date.now() - startTime;
  
  if (result.success) {
    console.log('✅ BAŞARILI'.green + ` - Süre: ${duration}ms`);
  } else {
    console.log('❌ BAŞARISIZ'.red + ` - Hata: ${result.error}`);
  }
  
  return duration;
}

// Test 2: 100 mesaj aynı anda
async function hundredMessagesTest() {
  console.log('\n' + '='.repeat(50).cyan);
  console.log('TEST 2: 100 MESAJ TESTİ (Tek Webhook)'.yellow.bold);
  console.log('='.repeat(50).cyan);
  
  const data = generateWebhookData(100);
  console.log('📤 100 mesajlı webhook gönderiliyor...'.gray);
  
  const startTime = Date.now();
  const result = await sendWebhook(data);
  const duration = Date.now() - startTime;
  
  if (result.success) {
    console.log('✅ BAŞARILI'.green + ` - 100 mesaj ${duration}ms'de işlendi`);
    console.log(`⚡ Hız: ${(100000 / duration).toFixed(2)} mesaj/saniye`.cyan);
  } else {
    console.log('❌ BAŞARISIZ'.red + ` - Hata: ${result.error}`);
  }
  
  return duration;
}

// Test 3: Paralel webhook testi
async function parallelWebhooksTest(count = 10, messagesPerWebhook = 10) {
  console.log('\n' + '='.repeat(50).cyan);
  console.log(`TEST 3: ${count} PARALEL WEBHOOK (${messagesPerWebhook} mesaj/webhook)`.yellow.bold);
  console.log('='.repeat(50).cyan);
  
  const promises = [];
  
  for (let i = 0; i < count; i++) {
    const data = generateWebhookData(messagesPerWebhook);
    promises.push(sendWebhook(data));
  }
  
  console.log(`📤 ${count} webhook paralel gönderiliyor...`.gray);
  const startTime = Date.now();
  const results = await Promise.all(promises);
  const duration = Date.now() - startTime;
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalMessages = successful * messagesPerWebhook;
  
  console.log(`✅ Başarılı: ${successful}/${count}`.green);
  if (failed > 0) {
    console.log(`❌ Başarısız: ${failed}`.red);
  }
  console.log(`📊 Toplam mesaj: ${totalMessages}`.cyan);
  console.log(`⏱️  Süre: ${duration}ms`.gray);
  console.log(`⚡ Hız: ${(totalMessages * 1000 / duration).toFixed(2)} mesaj/saniye`.cyan.bold);
  
  return { successful, failed, duration, totalMessages };
}

// Test 4: Yük testi (30 saniye)
async function loadTest(durationSeconds = 30) {
  console.log('\n' + '='.repeat(50).cyan);
  console.log(`TEST 4: YÜK TESTİ (${durationSeconds} saniye)`.yellow.bold);
  console.log('='.repeat(50).cyan);
  
  const startTime = Date.now();
  const endTime = startTime + (durationSeconds * 1000);
  let batchNumber = 0;
  let totalMessages = 0;
  
  console.log('🚀 Yük testi başlatılıyor...'.gray);
  
  while (Date.now() < endTime) {
    batchNumber++;
    
    // Her batch'te 10 paralel webhook, her biri 50 mesaj
    const promises = [];
    for (let i = 0; i < 10; i++) {
      const data = generateWebhookData(50);
      promises.push(sendWebhook(data));
    }
    
    const batchStart = Date.now();
    const results = await Promise.all(promises);
    const batchDuration = Date.now() - batchStart;
    
    const successful = results.filter(r => r.success).length;
    const batchMessages = successful * 50;
    totalMessages += batchMessages;
    
    const elapsed = (Date.now() - startTime) / 1000;
    const messagesPerSecond = totalMessages / elapsed;
    
    // Her 5 batch'te bir durum göster
    if (batchNumber % 5 === 0) {
      console.log(`📈 Batch #${batchNumber}: ${batchMessages} mesaj, Toplam: ${totalMessages}, Hız: ${messagesPerSecond.toFixed(2)} msg/sn`.gray);
    }
    
    // Sistem zorlanıyorsa biraz bekle
    if (batchDuration > 2000) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  const totalDuration = (Date.now() - startTime) / 1000;
  const avgMessagesPerSecond = totalMessages / totalDuration;
  
  console.log('\n' + '📊 YÜK TESTİ SONUÇLARI:'.green.bold);
  console.log(`✅ Toplam mesaj: ${totalMessages}`.green);
  console.log(`⏱️  Süre: ${totalDuration.toFixed(2)} saniye`.gray);
  console.log(`⚡ Ortalama hız: ${avgMessagesPerSecond.toFixed(2)} mesaj/saniye`.cyan.bold);
  
  return { totalMessages, totalDuration, avgMessagesPerSecond };
}

// Test 5: Maksimum kapasite testi
async function maxCapacityTest() {
  console.log('\n' + '='.repeat(50).cyan);
  console.log('TEST 5: MAKSİMUM KAPASİTE TESTİ'.yellow.bold);
  console.log('='.repeat(50).cyan);
  
  console.log('🔥 1000 mesajlı tek webhook gönderiliyor...'.gray);
  
  const data = generateWebhookData(1000);
  const startTime = Date.now();
  const result = await sendWebhook(data);
  const duration = Date.now() - startTime;
  
  if (result.success) {
    console.log('✅ BAŞARILI'.green + ` - 1000 mesaj ${duration}ms'de işlendi`);
    console.log(`⚡ Hız: ${(1000000 / duration).toFixed(2)} mesaj/saniye`.cyan.bold);
    
    if (duration < 1000) {
      console.log('🏆 MÜKEMMEL! 1 saniyenin altında!'.green.bold);
    } else if (duration < 5000) {
      console.log('✅ İYİ! 5 saniyenin altında.'.green);
    } else {
      console.log('⚠️  Performans iyileştirmesi gerekebilir.'.yellow);
    }
  } else {
    console.log('❌ BAŞARISIZ'.red + ` - Hata: ${result.error}`);
  }
  
  return duration;
}

// Ana test fonksiyonu
async function runAllTests() {
  console.clear();
  console.log('🚀 WEBHOOK MAKSİMUM PERFORMANS TEST SUITE'.cyan.bold);
  console.log('📊 Hedef: 10,000 mesaj/saniye kapasitesi'.gray);
  
  results.startTime = Date.now();
  
  try {
    // Test 1
    await singleMessageTest();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2
    await hundredMessagesTest();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3
    await parallelWebhooksTest(20, 50); // 20 webhook, 50 mesaj = 1000 mesaj
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 4
    const loadResult = await loadTest(10); // 10 saniyelik yük testi
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 5
    await maxCapacityTest();
    
    results.endTime = Date.now();
    
    // Final sonuçlar
    console.log('\n' + '='.repeat(50).cyan);
    console.log('📊 GENEL TEST SONUÇLARI'.green.bold);
    console.log('='.repeat(50).cyan);
    console.log(`✅ Başarılı webhook: ${results.totalSuccess}`.green);
    console.log(`❌ Başarısız webhook: ${results.totalFailed}`.red);
    console.log(`⏱️  Toplam süre: ${((results.endTime - results.startTime) / 1000).toFixed(2)} saniye`.gray);
    
    // Performans değerlendirmesi
    console.log('\n' + '🎯 PERFORMANS DEĞERLENDİRMESİ:'.cyan.bold);
    if (loadResult.avgMessagesPerSecond >= 1000) {
      console.log('🏆 MÜKEMMEL! Sistem 1000+ mesaj/saniye işleyebiliyor!'.green.bold);
    } else if (loadResult.avgMessagesPerSecond >= 500) {
      console.log('✅ ÇOK İYİ! Sistem 500-1000 mesaj/saniye işleyebiliyor.'.green);
    } else if (loadResult.avgMessagesPerSecond >= 100) {
      console.log('👍 İYİ! Sistem 100-500 mesaj/saniye işleyebiliyor.'.yellow);
    } else {
      console.log('⚠️  Sistem 100 mesaj/saniyenin altında.'.red);
    }
    
    if (results.totalFailed > 0) {
      console.log('\n⚠️  Bazı hatalar oluştu:'.yellow);
      console.log(results.errors.slice(0, 5).join('\n'));
    }
    
  } catch (error) {
    console.error('\n❌ Test hatası:'.red, error.message);
  }
}

// Tek test çalıştırma
async function runSingleTest(testName) {
  console.clear();
  
  switch(testName) {
    case 'single':
      await singleMessageTest();
      break;
    case '100':
      await hundredMessagesTest();
      break;
    case 'parallel':
      await parallelWebhooksTest(50, 100); // 50 webhook, 100 mesaj = 5000 mesaj
      break;
    case 'load':
      await loadTest(30); // 30 saniye
      break;
    case 'max':
      await maxCapacityTest();
      break;
    default:
      console.log('Geçersiz test adı. Kullanılabilir testler:');
      console.log('- single: Tek mesaj testi');
      console.log('- 100: 100 mesaj testi');
      console.log('- parallel: Paralel webhook testi');
      console.log('- load: Yük testi');
      console.log('- max: Maksimum kapasite testi');
  }
}

// Komut satırı argümanları
const args = process.argv.slice(2);

if (args.length > 0) {
  runSingleTest(args[0]);
} else {
  runAllTests();
}

module.exports = {
  generateWebhookData,
  sendWebhook,
  runAllTests
};