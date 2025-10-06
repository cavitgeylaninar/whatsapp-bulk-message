require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { User } = require('../src/models');
const sequelize = require('../src/database/connection');

async function createAdminUser() {
  try {
    // Database bağlantısını test et
    await sequelize.authenticate();
    console.log('Database connection established');
    
    // Admin kullanıcısı oluştur
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({
      where: { username: 'admin' }
    });

    if (existingAdmin) {
      console.log('Admin user already exists. Updating password...');
      await existingAdmin.update({
        password: hashedPassword,
        role: 'admin',
        is_active: true,
        subscription_type: 'enterprise',
        subscription_status: 'active',
        max_messages_per_month: 999999,
        max_contacts: 999999,
        subscription_end_date: new Date('2099-12-31')
      });
      console.log('Admin password updated to: admin123');
      process.exit(0);
      return;
    }

    const admin = await User.create({
      id: uuidv4(),
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      company_name: 'Cavit Geylani Nar',
      phone: '+905555555555',
      whatsapp_number: '+905555555555',
      is_active: true,
      two_factor_enabled: false,
      subscription_type: 'enterprise',
      subscription_status: 'active',
      max_messages_per_month: 999999,
      max_contacts: 999999,
      subscription_start_date: new Date(),
      subscription_end_date: new Date('2099-12-31'),
      is_trial: false,
      trial_days: 0,
      used_messages_this_month: 0
    });
    
    console.log('Admin user created successfully!');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('User ID:', admin.id);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();