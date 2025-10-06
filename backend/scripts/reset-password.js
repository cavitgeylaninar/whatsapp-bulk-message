require('dotenv').config();
const bcrypt = require('bcryptjs');
const { User } = require('../src/models');
const sequelize = require('../src/database/connection');

async function resetPassword() {
  try {
    // Database bağlantısını test et
    await sequelize.authenticate();
    console.log('Database connection established');
    
    // Admin kullanıcısını bul
    const admin = await User.findOne({ where: { username: 'admin' } });
    
    if (!admin) {
      console.log('Admin user not found!');
      process.exit(1);
    }
    
    // Yeni şifreyi hashle
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Şifreyi güncelle
    await admin.update({ 
      password: hashedPassword,
      is_active: true 
    });
    
    console.log('Password reset successful!');
    console.log('Username: admin');
    console.log('New Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error resetting password:', error);
    process.exit(1);
  }
}

resetPassword();