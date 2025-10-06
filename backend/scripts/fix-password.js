require('dotenv').config();
const bcrypt = require('bcryptjs');
const { User } = require('../src/models');
const sequelize = require('../src/database/connection');

async function fixPassword() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established');
    
    // Generate correct hash
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);
    console.log('Generated hash for admin123:', hash);
    
    // Update directly in database
    const [updated] = await User.update(
      { password: hash },
      { where: { username: 'admin' } }
    );
    
    if (updated) {
      console.log('Password updated successfully');
      
      // Verify it works
      const admin = await User.findOne({ where: { username: 'admin' } });
      const isValid = await admin.validatePassword('admin123');
      console.log('Verification test:', isValid ? 'SUCCESS' : 'FAILED');
    } else {
      console.log('No user updated');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixPassword();