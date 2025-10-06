require('dotenv').config();
const sequelize = require('../src/database/connection');

async function syncDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established');
    
    // Force sync all models (drop and recreate)
    await sequelize.sync({ force: true });
    console.log('Database synchronized successfully (all tables recreated)');
    
    process.exit(0);
  } catch (error) {
    console.error('Error syncing database:', error);
    process.exit(1);
  }
}

syncDatabase();