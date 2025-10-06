require('dotenv').config();
const bcrypt = require('bcryptjs');
const { User, Customer, Message, Campaign, Template } = require('../src/models');
const sequelize = require('../src/database/connection');

async function seedData() {
  try {
    // Database bağlantısını test et
    await sequelize.authenticate();
    console.log('Database connection established');
    
    // Admin kullanıcısını bul veya oluştur
    let admin = await User.findOne({ where: { username: 'admin' } });
    
    if (!admin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      admin = await User.create({
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        company_name: 'Cavit Geylani Nar',
        phone: '+905555555555',
        whatsapp_number: '+905555555555',
        is_active: true,
        two_factor_enabled: false
      });
      console.log('Admin user created');
    }
    
    // Müşteriler oluştur
    const customers = [
      {
        name: 'Ahmet Yılmaz',
        phone: '+905321234567',
        whatsapp_number: '+905321234567',
        email: 'ahmet@example.com',
        tags: ['vip', 'istanbul'],
        is_subscribed: true,
        bayi_id: admin.id
      },
      {
        name: 'Ayşe Demir',
        phone: '+905339876543',
        whatsapp_number: '+905339876543',
        email: 'ayse@example.com',
        tags: ['yeni', 'ankara'],
        is_subscribed: true,
        bayi_id: admin.id
      },
      {
        name: 'Mehmet Kaya',
        phone: '+905425554433',
        whatsapp_number: '+905425554433',
        email: 'mehmet@example.com',
        tags: ['potansiyel', 'izmir'],
        is_subscribed: true,
        bayi_id: admin.id
      },
      {
        name: 'Fatma Öztürk',
        phone: '+905551112233',
        whatsapp_number: '+905551112233',
        email: 'fatma@example.com',
        tags: ['sadik', 'bursa'],
        is_subscribed: true,
        bayi_id: admin.id
      },
      {
        name: 'Ali Çelik',
        phone: '+905057778899',
        whatsapp_number: '+905057778899',
        email: 'ali@example.com',
        tags: ['kurumsal', 'antalya'],
        is_subscribed: false,
        bayi_id: admin.id
      }
    ];
    
    const createdCustomers = [];
    for (const customerData of customers) {
      const [customer, created] = await Customer.findOrCreate({
        where: { phone: customerData.phone },
        defaults: customerData
      });
      createdCustomers.push(customer);
      if (created) {
        console.log(`Customer created: ${customer.name}`);
      }
    }
    
    // Template oluştur
    const [template] = await Template.findOrCreate({
      where: { name: 'Hoşgeldin Mesajı' },
      defaults: {
        name: 'Hoşgeldin Mesajı',
        body_content: 'Merhaba {{name}}, aramıza hoş geldiniz! 🎉',
        category: 'greeting',
        language: 'tr',
        variables: ['name'],
        bayi_id: admin.id,
        meta_template_id: 'welcome_template_001',
        meta_template_name: 'welcome_message',
        approval_status: 'APPROVED',
        is_approved: true
      }
    });
    
    // Kampanya oluştur
    const [campaign] = await Campaign.findOrCreate({
      where: { name: 'Hoşgeldin Kampanyası' },
      defaults: {
        name: 'Hoşgeldin Kampanyası',
        description: 'Yeni müşteriler için hoşgeldin kampanyası',
        message_template: `Merhaba {{name}}, aramıza hoş geldiniz! 🎉`,
        scheduled_date: new Date(),
        status: 'completed',
        total_recipients: createdCustomers.length,
        sent_count: createdCustomers.length,
        delivered_count: createdCustomers.length - 1,
        read_count: 3,
        failed_count: 0,
        bayi_id: admin.id
      }
    });
    
    // Mesajlar oluştur
    const messages = [
      // Ahmet Yılmaz ile konuşma
      {
        customer_id: createdCustomers[0].id,
        campaign_id: campaign.id,
        direction: 'outbound',
        message_type: 'text',
        content: 'Merhaba Ahmet Yılmaz, aramıza hoş geldiniz! 🎉',
        status: 'read',
        sent_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        delivered_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 5000),
        read_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60000),
        bayi_id: admin.id
      },
      {
        customer_id: createdCustomers[0].id,
        direction: 'inbound',
        message_type: 'text',
        content: 'Teşekkürler, memnun oldum!',
        status: 'delivered',
        sent_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 120000),
        bayi_id: admin.id
      },
      {
        customer_id: createdCustomers[0].id,
        direction: 'outbound',
        message_type: 'text',
        content: 'Size nasıl yardımcı olabilirim?',
        status: 'delivered',
        sent_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        delivered_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 5000),
        bayi_id: admin.id
      },
      
      // Ayşe Demir ile konuşma
      {
        customer_id: createdCustomers[1].id,
        campaign_id: campaign.id,
        direction: 'outbound',
        message_type: 'text',
        content: 'Merhaba Ayşe Demir, aramıza hoş geldiniz! 🎉',
        status: 'read',
        sent_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        delivered_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 5000),
        read_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 30000),
        bayi_id: admin.id
      },
      {
        customer_id: createdCustomers[1].id,
        direction: 'inbound',
        message_type: 'text',
        content: 'Merhaba, ürünleriniz hakkında bilgi alabilir miyim?',
        status: 'delivered',
        sent_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 60000),
        bayi_id: admin.id
      },
      {
        customer_id: createdCustomers[1].id,
        direction: 'outbound',
        message_type: 'text',
        content: 'Tabii ki! Hangi ürünümüz hakkında bilgi almak istersiniz?',
        status: 'read',
        sent_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 120000),
        delivered_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 125000),
        read_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 180000),
        bayi_id: admin.id
      },
      {
        customer_id: createdCustomers[1].id,
        direction: 'inbound',
        message_type: 'text',
        content: 'Fiyat listesi gönderebilir misiniz?',
        status: 'delivered',
        sent_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
        bayi_id: admin.id
      },
      
      // Mehmet Kaya ile konuşma
      {
        customer_id: createdCustomers[2].id,
        campaign_id: campaign.id,
        direction: 'outbound',
        message_type: 'text',
        content: 'Merhaba Mehmet Kaya, aramıza hoş geldiniz! 🎉',
        status: 'delivered',
        sent_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        delivered_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 5000),
        bayi_id: admin.id
      },
      {
        customer_id: createdCustomers[2].id,
        direction: 'outbound',
        message_type: 'text',
        content: 'Yeni kampanyamızdan haberdar olmak ister misiniz?',
        status: 'sent',
        sent_at: new Date(Date.now() - 30 * 60 * 1000),
        bayi_id: admin.id
      },
      
      // Fatma Öztürk ile konuşma
      {
        customer_id: createdCustomers[3].id,
        campaign_id: campaign.id,
        direction: 'outbound',
        message_type: 'text',
        content: 'Merhaba Fatma Öztürk, aramıza hoş geldiniz! 🎉',
        status: 'read',
        sent_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        delivered_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 5000),
        read_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 60000),
        bayi_id: admin.id
      },
      {
        customer_id: createdCustomers[3].id,
        direction: 'inbound',
        message_type: 'text',
        content: 'Teşekkür ederim',
        status: 'delivered',
        sent_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 120000),
        bayi_id: admin.id
      },
      {
        customer_id: createdCustomers[3].id,
        direction: 'outbound',
        message_type: 'text',
        content: 'Rica ederim. Size nasıl yardımcı olabiliriz?',
        status: 'delivered',
        sent_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        delivered_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 5000),
        bayi_id: admin.id
      },
      {
        customer_id: createdCustomers[3].id,
        direction: 'inbound',
        message_type: 'text',
        content: 'Siparişim ne zaman gelir?',
        status: 'delivered',
        sent_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
        bayi_id: admin.id
      },
      {
        customer_id: createdCustomers[3].id,
        direction: 'outbound',
        message_type: 'text',
        content: 'Siparişinizi kontrol ediyorum, birazdan bilgi vereceğim.',
        status: 'sent',
        sent_at: new Date(Date.now() - 45 * 60 * 1000),
        bayi_id: admin.id
      },
      
      // Ali Çelik ile konuşma (başarısız mesaj örneği)
      {
        customer_id: createdCustomers[4].id,
        campaign_id: campaign.id,
        direction: 'outbound',
        message_type: 'text',
        content: 'Merhaba Ali Çelik, aramıza hoş geldiniz! 🎉',
        status: 'failed',
        error_message: 'Kullanıcı WhatsApp aboneliğini iptal etmiş',
        sent_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        bayi_id: admin.id
      }
    ];
    
    // Mesajları oluştur
    for (const messageData of messages) {
      await Message.create(messageData);
    }
    
    console.log('Seed data created successfully!');
    console.log('-----------------------------------');
    console.log('Created:');
    console.log(`- ${createdCustomers.length} customers`);
    console.log(`- ${messages.length} messages`);
    console.log(`- 1 campaign`);
    console.log(`- 1 template`);
    console.log('-----------------------------------');
    console.log('Login credentials:');
    console.log('Username: admin');
    console.log('Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating seed data:', error);
    process.exit(1);
  }
}

seedData();