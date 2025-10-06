require('dotenv').config();
const { Sequelize } = require('sequelize');
const { Customer, Message, Campaign, Template, Media } = require('../src/models');

async function cleanSeedData() {
  try {
    console.log('🧹 Seed data temizleniyor...');
    
    // Seed data'yı temizle (sadece test verilerini)
    await Message.destroy({
      where: {
        content: {
          [Sequelize.Op.like]: '%Test%'
        }
      }
    });
    
    await Customer.destroy({
      where: {
        name: {
          [Sequelize.Op.in]: ['Ahmet Yılmaz', 'Mehmet Demir', 'Ayşe Kaya', 'Fatma Çelik', 'Ali Öztürk']
        }
      }
    });
    
    await Campaign.destroy({
      where: {
        name: {
          [Sequelize.Op.like]: '%Test%'
        }
      }
    });
    
    await Template.destroy({
      where: {
        name: {
          [Sequelize.Op.in]: ['welcome_message', 'order_confirmation', 'appointment_reminder']
        }
      }
    });
    
    await Media.destroy({
      where: {
        file_name: {
          [Sequelize.Op.like]: '%sample%'
        }
      }
    });
    
    console.log('✅ Seed data temizlendi!');
    
    // Gerçek istatistikleri göster
    const stats = {
      customers: await Customer.count(),
      messages: await Message.count(),
      campaigns: await Campaign.count(),
      templates: await Template.count(),
      media: await Media.count()
    };
    
    console.log('\n📊 Mevcut Gerçek Veriler:');
    console.log('Müşteriler:', stats.customers);
    console.log('Mesajlar:', stats.messages);
    console.log('Kampanyalar:', stats.campaigns);
    console.log('Şablonlar:', stats.templates);
    console.log('Medya:', stats.media);
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    process.exit(0);
  }
}

cleanSeedData();