#!/usr/bin/env node

const ContactCleanup = require('../modules/whatsapp-web/services/ContactCleanup');
const sequelize = require('../database/connection');
const logger = require('../utils/logger');

async function runCleanup() {
  try {
    logger.info('=== Starting Contact Cleanup Process ===');

    // Connect to database
    await sequelize.authenticate();
    logger.info('Database connection established');

    // Get initial stats
    logger.info('Checking for duplicates...');
    const initialStats = await ContactCleanup.getDuplicateStats();
    logger.info(`Found ${initialStats.totalDuplicates} duplicate contacts`);

    if (initialStats.totalDuplicates > 0) {
      logger.info('Starting cleanup...');

      // Perform full cleanup
      const result = await ContactCleanup.performFullCleanup();

      logger.info('=== Cleanup Results ===');
      logger.info(`Before: ${result.before.duplicates} duplicates`);
      logger.info(`After: ${result.after.duplicates} duplicates`);
      logger.info(`Cleaned: ${result.cleaned} contacts removed`);
    } else {
      logger.info('No duplicates found!');
    }

    // Ensure unique constraint
    logger.info('Ensuring unique constraint...');
    await ContactCleanup.ensureUniqueConstraint();

    logger.info('=== Cleanup Complete ===');
    process.exit(0);
  } catch (error) {
    logger.error('Cleanup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runCleanup();
}

module.exports = runCleanup;