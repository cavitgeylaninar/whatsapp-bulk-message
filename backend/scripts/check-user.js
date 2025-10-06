require('dotenv').config();
const bcrypt = require('bcryptjs');
const { User } = require('../src/models');
const sequelize = require('../src/database/connection');

async function checkUser() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established');
    
    const admin = await User.findOne({ where: { username: 'admin' } });
    
    if (!admin) {
      console.log('Admin user not found!');
      return;
    }
    
    console.log('Admin user found:');
    console.log('- ID:', admin.id);
    console.log('- Username:', admin.username);
    console.log('- Email:', admin.email);
    console.log('- Role:', admin.role);
    console.log('- Active:', admin.is_active);
    console.log('- Password hash:', admin.password);
    
    // Test password
    const testPassword = 'admin123';
    const isValid = await bcrypt.compare(testPassword, admin.password);
    console.log(`\nPassword test for "${testPassword}":`, isValid ? 'VALID' : 'INVALID');
    
    // Also test with the instance method
    const isValidMethod = await admin.validatePassword(testPassword);
    console.log(`Password test with validatePassword method:`, isValidMethod ? 'VALID' : 'INVALID');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUser();