const sequelize = require('./database/connection');

// Import all models to ensure they're registered
require('./models');

async function syncDatabase() {
  try {
    // Use alter: true to add new columns without dropping tables
    await sequelize.sync({ alter: true });
    console.log('SUCCESS: Database synchronized successfully');
    console.log('SUCCESS: New columns (template_name, template_language) added to messages table');
    process.exit(0);
  } catch (error) {
    console.error('ERROR: Database synchronization failed:', error);
    process.exit(1);
  }
}

syncDatabase();