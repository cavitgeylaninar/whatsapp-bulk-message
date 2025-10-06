const axios = require('axios');
const logger = require('../utils/logger');

// Test konfigürasyonu
const config = {
  baseUrl: process.env.API_URL || 'http://localhost:3000/api',
  webhookUrl: '/webhook/whatsapp',
  testDuration: 30000, // 30 saniye
  concurrentUsers: 10,
  messagesPerBatch: 10
};

// Örnek webhook verisi oluştur
function generateWebhookData(phoneNumberId, messageCount = 1) {
  const messages = [];
  const statuses = [];
  
  for (let i = 0; i < messageCount; i++) {
    messages.push({
      from: `90532${Math.floor(Math.random() * 10000000)}`,
      id: `wamid.${Date.now()}_${i}`,
      timestamp: Math.floor(Date.now() / 1000),
      type: 'text',
      text: {
        body: `Test mesajı ${i + 1} - ${new Date().toISOString()}`
      },
      profile: {
        name: `Test User ${i + 1}`
      }
    });
    
    // %30 ihtimalle status update ekle
    if (Math.random() < 0.3) {
      statuses.push({
        id: `wamid.${Date.now() - 10000}_${i}`,
        status: ['sent', 'delivered', 'read'][Math.floor(Math.random() * 3)],
        timestamp: Math.floor(Date.now() / 1000)
      });
    }
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
            phone_number_id: phoneNumberId
          },
          messages: messages.length > 0 ? messages : undefined,
          statuses: statuses.length > 0 ? statuses : undefined
        },
        field: 'messages'
      }]
    }]
  };
}

// Tek webhook gönder
async function sendSingleWebhook(data) {
  try {
    const startTime = Date.now();
    const response = await axios.post(`${config.baseUrl}${config.webhookUrl}`, data, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    const duration = Date.now() - startTime;
    
    return {
      success: response.status === 200,
      duration,
      statusCode: response.status
    };
  } catch (error) {
    return {
      success: false,
      duration: 0,
      error: error.message
    };
  }
}

// Paralel webhook gönder
async function sendParallelWebhooks(count, messagesPerWebhook = 1) {
  const promises = [];
  
  for (let i = 0; i < count; i++) {
    const data = generateWebhookData('test_phone_number_id', messagesPerWebhook);
    promises.push(sendSingleWebhook(data));
  }
  
  const results = await Promise.all(promises);
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgDuration = results
    .filter(r => r.duration > 0)
    .reduce((sum, r) => sum + r.duration, 0) / successful || 0;
  
  return {
    total: count,
    successful,
    failed,
    avgDuration,
    results
  };
}

// Yük testi
async function loadTest() {
  console.log('\n🚀 Webhook Performans Testi Başlatılıyor...\n');
  console.log(`📊 Test Parametreleri:`);
  console.log(`   - Süre: ${config.testDuration / 1000} saniye`);
  console.log(`   - Eşzamanlı kullanıcı: ${config.concurrentUsers}`);
  console.log(`   - Webhook başına mesaj: ${config.messagesPerBatch}`);
  console.log(`   - Hedef: 100+ mesaj/saniye\n`);
  
  const startTime = Date.now();
  const endTime = startTime + config.testDuration;
  const results = [];
  let totalSent = 0;
  let totalMessages = 0;
  let batchNumber = 0;
  
  // Test döngüsü
  while (Date.now() < endTime) {
    batchNumber++;
    const batchStartTime = Date.now();
    
    // Paralel webhook gönder
    const batchResult = await sendParallelWebhooks(
      config.concurrentUsers, 
      config.messagesPerBatch
    );
    
    totalSent += batchResult.successful;
    totalMessages += batchResult.successful * config.messagesPerBatch;
    results.push(batchResult);
    
    // İlerleme göster
    const elapsed = (Date.now() - startTime) / 1000;
    const messagesPerSecond = totalMessages / elapsed;
    
    console.log(`📈 Batch #${batchNumber}:`);
    console.log(`   ✅ Başarılı: ${batchResult.successful}/${batchResult.total}`);
    console.log(`   ⏱️  Ortalama süre: ${batchResult.avgDuration.toFixed(2)}ms`);
    console.log(`   📊 Toplam mesaj: ${totalMessages}`);
    console.log(`   ⚡ Hız: ${messagesPerSecond.toFixed(2)} mesaj/saniye`);
    
    // Eğer başarısız webhook varsa, yavaşlat
    if (batchResult.failed > 0) {
      console.log(`   ⚠️  ${batchResult.failed} webhook başarısız!`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Batch arası bekleme (100ms)
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Final sonuçları
  const totalDuration = (Date.now() - startTime) / 1000;
  const avgMessagesPerSecond = totalMessages / totalDuration;
  const avgWebhooksPerSecond = totalSent / totalDuration;
  const successRate = (totalSent / (results.length * config.concurrentUsers)) * 100;
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SONUÇLARI');
  console.log('='.repeat(50));
  console.log(`✅ Toplam başarılı webhook: ${totalSent}`);
  console.log(`📨 Toplam işlenen mesaj: ${totalMessages}`);
  console.log(`⏱️  Test süresi: ${totalDuration.toFixed(2)} saniye`);
  console.log(`⚡ Ortalama webhook/saniye: ${avgWebhooksPerSecond.toFixed(2)}`);
  console.log(`📊 Ortalama mesaj/saniye: ${avgMessagesPerSecond.toFixed(2)}`);
  console.log(`✨ Başarı oranı: ${successRate.toFixed(2)}%`);
  
  // Performans değerlendirmesi
  console.log('\n' + '='.repeat(50));
  console.log('🎯 PERFORMANS DEĞERLENDİRMESİ');
  console.log('='.repeat(50));
  
  if (avgMessagesPerSecond >= 100) {
    console.log('🏆 MÜKEMMEL! Sistem 100+ mesaj/saniye işleyebiliyor!');
  } else if (avgMessagesPerSecond >= 50) {
    console.log('✅ İYİ: Sistem 50-100 mesaj/saniye işleyebiliyor.');
  } else if (avgMessagesPerSecond >= 20) {
    console.log('⚠️  ORTA: Sistem 20-50 mesaj/saniye işleyebiliyor.');
  } else {
    console.log('❌ DÜŞÜK: Sistem 20 mesaj/saniyenin altında.');
  }
  
  // Öneriler
  if (avgMessagesPerSecond < 100) {
    console.log('\n📝 ÖNERİLER:');
    if (avgMessagesPerSecond < 50) {
      console.log('   - Redis cache kullanımını kontrol edin');
      console.log('   - Worker sayısını artırın');
      console.log('   - Veritabanı bağlantı havuzunu genişletin');
    }
    if (successRate < 95) {
      console.log('   - Rate limiting ayarlarını gözden geçirin');
      console.log('   - Sistem kaynaklarını artırın');
    }
  }
  
  return {
    totalWebhooks: totalSent,
    totalMessages,
    duration: totalDuration,
    avgMessagesPerSecond,
    avgWebhooksPerSecond,
    successRate
  };
}

// Stres testi (100 eşzamanlı mesaj)
async function stressTest() {
  console.log('\n🔥 Stres Testi: 100 Eşzamanlı Mesaj Gönderimi\n');
  
  const startTime = Date.now();
  
  // 100 mesajlı tek bir webhook oluştur
  const megaWebhook = generateWebhookData('stress_test_phone', 100);
  
  console.log('📤 100 mesajlı webhook gönderiliyor...');
  const result = await sendSingleWebhook(megaWebhook);
  
  if (result.success) {
    console.log(`✅ BAŞARILI! 100 mesaj ${result.duration}ms'de işlendi`);
    console.log(`⚡ Hız: ${(100000 / result.duration).toFixed(2)} mesaj/saniye`);
    
    if (result.duration < 1000) {
      console.log('🏆 MÜKEMMEL PERFORMANS! 1 saniyenin altında işlendi!');
    } else if (result.duration < 5000) {
      console.log('✅ İYİ PERFORMANS! 5 saniyenin altında işlendi.');
    } else {
      console.log('⚠️  Performans iyileştirmesi gerekebilir.');
    }
  } else {
    console.log(`❌ BAŞARISIZ! Hata: ${result.error}`);
  }
  
  return result;
}

// Kuyruk durumunu kontrol et
async function checkQueueStatus() {
  try {
    const response = await axios.get(`${config.baseUrl}/webhook/queue/status`);
    const status = response.data;
    
    console.log('\n📊 Kuyruk Durumu:');
    console.log(`   Webhook Kuyruğu:`);
    console.log(`     - Bekleyen: ${status.webhook.waiting}`);
    console.log(`     - Aktif: ${status.webhook.active}`);
    console.log(`     - Tamamlanan: ${status.webhook.completed}`);
    console.log(`     - Başarısız: ${status.webhook.failed}`);
    console.log(`   Mesaj Kuyruğu:`);
    console.log(`     - Bekleyen: ${status.message.waiting}`);
    console.log(`     - Aktif: ${status.message.active}`);
    console.log(`     - Tamamlanan: ${status.message.completed}`);
    console.log(`   Performans:`);
    console.log(`     - Ortalama işlem süresi: ${status.performance.avgProcessingTime.toFixed(2)}ms`);
    console.log(`     - Toplam işlenen: ${status.performance.totalProcessed}`);
    console.log(`     - Başarısız: ${status.performance.totalFailed}`);
    
    return status;
  } catch (error) {
    console.error('Kuyruk durumu alınamadı:', error.message);
    return null;
  }
}

// Ana test fonksiyonu
async function runTests() {
  console.log('🚀 WhatsApp Webhook Performans Test Suite\n');
  
  try {
    // 1. Stres testi
    await stressTest();
    
    // Kısa bekleme
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 2. Yük testi
    await loadTest();
    
    // 3. Kuyruk durumunu kontrol et
    await checkQueueStatus();
    
    console.log('\n✅ Tüm testler tamamlandı!');
  } catch (error) {
    console.error('\n❌ Test hatası:', error);
  }
}

// Test komutları
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'stress':
      stressTest();
      break;
    case 'load':
      loadTest();
      break;
    case 'status':
      checkQueueStatus();
      break;
    default:
      runTests();
  }
}

module.exports = {
  generateWebhookData,
  sendSingleWebhook,
  sendParallelWebhooks,
  loadTest,
  stressTest,
  checkQueueStatus,
  runTests
};