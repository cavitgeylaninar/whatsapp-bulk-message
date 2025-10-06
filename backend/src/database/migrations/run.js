const sequelize = require('../connection');
const models = require('../../models');
const logger = require('../../utils/logger');

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');
    
    await sequelize.authenticate();
    logger.info('Database connection established');
    
    await sequelize.sync({ force: false, alter: true });
    logger.info('Database synchronized successfully');
    
    logger.info('Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();