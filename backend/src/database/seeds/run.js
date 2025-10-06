const sequelize = require('../connection');
const { User, Customer, Campaign, Message } = require('../../models');
const logger = require('../../utils/logger');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');
    
    await sequelize.authenticate();
    logger.info('Database connection established');

    // Create Admin User
    const adminUser = await User.findOrCreate({
      where: { username: 'admin' },
      defaults: {
        username: 'admin',
        email: 'admin@whatsapp-api.com',
        password: 'Admin123!',
        role: 'admin',
        company_name: 'WhatsApp API Admin',
        phone: '5551234567',
        is_active: true
      }
    });
    logger.info('Admin user created/found');

    // Create Bayi Users
    const bayi1 = await User.findOrCreate({
      where: { username: 'bayi1' },
      defaults: {
        username: 'bayi1',
        email: 'bayi1@example.com',
        password: 'Bayi123!',
        role: 'bayi',
        company_name: 'ABC Teknoloji',
        phone: '5551234568',
        is_active: true
      }
    });

    const bayi2 = await User.findOrCreate({
      where: { username: 'bayi2' },
      defaults: {
        username: 'bayi2',
        email: 'bayi2@example.com',
        password: 'Bayi123!',
        role: 'bayi',
        company_name: 'XYZ Yazılım',
        phone: '5551234569',
        is_active: true
      }
    });
    logger.info('Bayi users created/found');

    // Create Customer User for Bayi1
    const customer1 = await User.findOrCreate({
      where: { username: 'musteri1' },
      defaults: {
        username: 'musteri1',
        email: 'musteri1@example.com',
        password: 'Musteri123!',
        role: 'musteri',
        parent_id: bayi1[0].id,
        phone: '5551234570',
        is_active: true
      }
    });
    logger.info('Customer user created/found');

    // Create Customers for Bayi1
    const customers = [
      {
        bayi_id: bayi1[0].id,
        name: 'Ahmet Yılmaz',
        phone: '5551234571',
        whatsapp_number: '5551234571',
        email: 'ahmet@example.com',
        is_subscribed: true,
        tags: ['vip', 'istanbul']
      },
      {
        bayi_id: bayi1[0].id,
        name: 'Ayşe Kaya',
        phone: '5551234572',
        whatsapp_number: '5551234572',
        email: 'ayse@example.com',
        is_subscribed: true,
        tags: ['regular', 'ankara']
      },
      {
        bayi_id: bayi1[0].id,
        name: 'Mehmet Demir',
        phone: '5551234573',
        whatsapp_number: '5551234573',
        email: 'mehmet@example.com',
        is_subscribed: false,
        tags: ['inactive']
      },
      {
        bayi_id: bayi2[0].id,
        name: 'Fatma Çelik',
        phone: '5551234574',
        whatsapp_number: '5551234574',
        email: 'fatma@example.com',
        is_subscribed: true,
        tags: ['vip', 'izmir']
      },
      {
        bayi_id: bayi2[0].id,
        name: 'Ali Öz',
        phone: '5551234575',
        whatsapp_number: '5551234575',
        email: 'ali@example.com',
        is_subscribed: true,
        tags: ['regular', 'bursa']
      }
    ];

    for (const customerData of customers) {
      await Customer.findOrCreate({
        where: { phone: customerData.phone },
        defaults: customerData
      });
    }
    logger.info('Customer records created');

    // Create Sample Campaigns
    const campaign1 = await Campaign.findOrCreate({
      where: { name: 'Hoş Geldiniz Kampanyası' },
      defaults: {
        bayi_id: bayi1[0].id,
        name: 'Hoş Geldiniz Kampanyası',
        description: 'Yeni müşteriler için hoş geldiniz mesajı',
        message_template: 'Merhaba {{name}}, aramıza hoş geldiniz! Özel kampanyalarımızdan haberdar olmak için takipte kalın.',
        message_type: 'text',
        status: 'completed',
        total_recipients: 2,
        sent_count: 2,
        delivered_count: 2,
        read_count: 1,
        failed_count: 0,
        response_count: 1,
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      }
    });

    const campaign2 = await Campaign.findOrCreate({
      where: { name: 'Yaz İndirimleri' },
      defaults: {
        bayi_id: bayi1[0].id,
        name: 'Yaz İndirimleri',
        description: 'Yaz sezonu indirim kampanyası',
        message_template: 'Sayın {{name}}, yaz indirimleri başladı! %50\'ye varan indirimlerden yararlanmak için mağazamızı ziyaret edin.',
        message_type: 'text',
        status: 'running',
        total_recipients: 3,
        sent_count: 1,
        delivered_count: 1,
        read_count: 0,
        failed_count: 0,
        response_count: 0,
        start_date: new Date()
      }
    });

    const campaign3 = await Campaign.findOrCreate({
      where: { name: 'Doğum Günü Kutlaması' },
      defaults: {
        bayi_id: bayi2[0].id,
        name: 'Doğum Günü Kutlaması',
        description: 'Doğum günü olan müşteriler için özel kampanya',
        message_template: 'Mutlu yıllar {{name}}! Doğum gününüze özel %30 indirim kazandınız.',
        message_type: 'text',
        status: 'scheduled',
        scheduled_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        total_recipients: 2,
        sent_count: 0,
        delivered_count: 0,
        read_count: 0,
        failed_count: 0,
        response_count: 0
      }
    });
    logger.info('Sample campaigns created');

    // Create Sample Messages
    const customerRecords = await Customer.findAll();
    
    if (customerRecords.length > 0) {
      const messages = [
        {
          campaign_id: campaign1[0].id,
          bayi_id: bayi1[0].id,
          customer_id: customerRecords[0].id,
          direction: 'outbound',
          message_type: 'text',
          content: `Merhaba ${customerRecords[0].name}, aramıza hoş geldiniz! Özel kampanyalarımızdan haberdar olmak için takipte kalın.`,
          status: 'delivered',
          sent_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          delivered_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 30000)
        },
        {
          campaign_id: campaign1[0].id,
          bayi_id: bayi1[0].id,
          customer_id: customerRecords[0].id,
          direction: 'inbound',
          message_type: 'text',
          content: 'Teşekkürler, kampanyalarınızı takip edeceğim.',
          status: 'delivered',
          delivered_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
        },
        {
          campaign_id: campaign2[0].id,
          bayi_id: bayi1[0].id,
          customer_id: customerRecords[1].id,
          direction: 'outbound',
          message_type: 'text',
          content: `Sayın ${customerRecords[1].name}, yaz indirimleri başladı! %50'ye varan indirimlerden yararlanmak için mağazamızı ziyaret edin.`,
          status: 'sent',
          sent_at: new Date()
        }
      ];

      for (const messageData of messages) {
        await Message.findOrCreate({
          where: { 
            customer_id: messageData.customer_id,
            content: messageData.content 
          },
          defaults: messageData
        });
      }
      logger.info('Sample messages created');
    }

    logger.info('Database seeding completed successfully');
    logger.info('\n=== Login Credentials ===');
    logger.info('Admin: username: admin, password: Admin123!');
    logger.info('Bayi 1: username: bayi1, password: Bayi123!');
    logger.info('Bayi 2: username: bayi2, password: Bayi123!');
    logger.info('Müşteri: username: musteri1, password: Musteri123!');
    logger.info('========================\n');
    
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();