require('dotenv').config();
const { Customer, Message, Campaign, Template, Media } = require('../src/models');

async function showRealStats() {
  try {
    console.log('\n📊 Gerçek Veritabanı İstatistikleri:');
    console.log('=====================================');
    
    const stats = {
      customers: await Customer.count(),
      messages: await Message.count(),
      campaigns: await Campaign.count(),
      templates: await Template.count(),
      media: await Media.count()
    };
    
    console.log('👥 Müşteriler:', stats.customers);
    console.log('💬 Mesajlar:', stats.messages);
    console.log('📢 Kampanyalar:', stats.campaigns);
    console.log('📝 Şablonlar:', stats.templates);
    console.log('📁 Medya Dosyaları:', stats.media);
    console.log('=====================================\n');
    
    // Son mesajları göster
    const recentMessages = await Message.findAll({
      limit: 5,
      order: [['created_at', 'DESC']],
      attributes: ['id', 'content', 'status', 'created_at']
    });
    
    if (recentMessages.length > 0) {
      console.log('📮 Son Gönderilen Mesajlar:');
      recentMessages.forEach((msg, i) => {
        const content = msg.content ? msg.content.substring(0, 50) + '...' : 'N/A';
        console.log(`${i + 1}. ${content} (${msg.status})`);
      });
    } else {
      console.log('📮 Henüz mesaj gönderilmemiş.');
    }
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    process.exit(0);
  }
}

showRealStats();