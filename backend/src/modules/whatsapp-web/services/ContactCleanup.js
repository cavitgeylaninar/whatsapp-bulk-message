// THIS SERVICE IS DISABLED - WhatsApp Web contacts should not be saved to database
// They are managed separately from Business API contacts
const { QueryTypes } = require('sequelize');
const sequelize = require('../../../database/connection');
// const WhatsAppContact = require('../../../models/whatsappContact');
const logger = require('../../../utils/logger');

class ContactCleanup {
  /**
   * Remove duplicate contacts from database, keeping only the most recent one
   * @param {string} userId - User ID to clean duplicates for (optional)
   */
  async removeDuplicates(userId = null) {
    try {
      logger.info('[ContactCleanup] Starting duplicate removal...');

      // SQL query to identify and delete duplicates, keeping the most recent one
      let query = `
        WITH duplicates AS (
          SELECT id,
                 phone,
                 created_by,
                 created_at,
                 ROW_NUMBER() OVER (
                   PARTITION BY phone, created_by
                   ORDER BY created_at DESC, id DESC
                 ) as rn
          FROM whatsapp_contacts
          ${userId ? 'WHERE created_by = :userId' : ''}
        )
        DELETE FROM whatsapp_contacts
        WHERE id IN (
          SELECT id FROM duplicates WHERE rn > 1
        )
        RETURNING id;
      `;

      const replacements = userId ? { userId } : {};
      const result = await sequelize.query(query, {
        replacements,
        type: QueryTypes.DELETE
      });

      const deletedCount = result.length;
      logger.info(`[ContactCleanup] Removed ${deletedCount} duplicate contacts`);

      return {
        success: true,
        deletedCount,
        message: `${deletedCount} duplicate contacts removed`
      };
    } catch (error) {
      logger.error('[ContactCleanup] Error removing duplicates:', error);
      throw error;
    }
  }

  /**
   * Get duplicate contacts statistics
   * @param {string} userId - User ID to check duplicates for (optional)
   */
  async getDuplicateStats(userId = null) {
    try {
      let query = `
        SELECT
          phone,
          created_by,
          COUNT(*) as duplicate_count,
          MIN(created_at) as first_created,
          MAX(created_at) as last_created
        FROM whatsapp_contacts
        ${userId ? 'WHERE created_by = :userId' : ''}
        GROUP BY phone, created_by
        HAVING COUNT(*) > 1
        ORDER BY duplicate_count DESC;
      `;

      const replacements = userId ? { userId } : {};
      const duplicates = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
      });

      const totalDuplicates = duplicates.reduce((sum, row) => sum + (row.duplicate_count - 1), 0);

      return {
        success: true,
        totalUniqueNumbers: duplicates.length,
        totalDuplicates,
        duplicates: duplicates.slice(0, 10) // Return top 10 for display
      };
    } catch (error) {
      logger.error('[ContactCleanup] Error getting duplicate stats:', error);
      throw error;
    }
  }

  /**
   * Clean phone numbers to ensure consistent format
   * @param {string} userId - User ID to clean phone numbers for (optional)
   */
  async cleanPhoneNumbers(userId = null) {
    try {
      logger.info('[ContactCleanup] Starting phone number cleanup...');

      // Remove non-digit characters from phone numbers
      let query = `
        UPDATE whatsapp_contacts
        SET phone = REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
        ${userId ? 'WHERE created_by = :userId' : ''};
      `;

      const replacements = userId ? { userId } : {};
      await sequelize.query(query, {
        replacements,
        type: QueryTypes.UPDATE
      });

      logger.info('[ContactCleanup] Phone numbers cleaned');

      // After cleaning, remove any new duplicates that may have been created
      return await this.removeDuplicates(userId);
    } catch (error) {
      logger.error('[ContactCleanup] Error cleaning phone numbers:', error);
      throw error;
    }
  }

  /**
   * Ensure unique constraint exists on database
   */
  async ensureUniqueConstraint() {
    try {
      // Check if unique constraint exists
      const checkQuery = `
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE indexname = 'unique_phone_per_user';
      `;

      const result = await sequelize.query(checkQuery, {
        type: QueryTypes.SELECT
      });

      if (result[0].count === '0') {
        logger.info('[ContactCleanup] Creating unique constraint...');

        // First remove duplicates
        await this.removeDuplicates();

        // Then create unique constraint
        const createQuery = `
          CREATE UNIQUE INDEX IF NOT EXISTS unique_phone_per_user
          ON whatsapp_contacts (phone, created_by);
        `;

        await sequelize.query(createQuery, {
          type: QueryTypes.RAW
        });

        logger.info('[ContactCleanup] Unique constraint created');
        return { success: true, message: 'Unique constraint created' };
      } else {
        logger.info('[ContactCleanup] Unique constraint already exists');
        return { success: true, message: 'Unique constraint already exists' };
      }
    } catch (error) {
      logger.error('[ContactCleanup] Error ensuring unique constraint:', error);
      throw error;
    }
  }

  /**
   * Full cleanup process
   * @param {string} userId - User ID to perform cleanup for (optional)
   */
  async performFullCleanup(userId = null) {
    try {
      logger.info('[ContactCleanup] Starting full cleanup process...');

      // Get stats before cleanup
      const beforeStats = await this.getDuplicateStats(userId);
      logger.info(`[ContactCleanup] Before cleanup: ${beforeStats.totalDuplicates} duplicates found`);

      // Clean phone numbers
      const cleanResult = await this.cleanPhoneNumbers(userId);

      // Ensure unique constraint
      await this.ensureUniqueConstraint();

      // Get stats after cleanup
      const afterStats = await this.getDuplicateStats(userId);
      logger.info(`[ContactCleanup] After cleanup: ${afterStats.totalDuplicates} duplicates remaining`);

      return {
        success: true,
        before: {
          duplicates: beforeStats.totalDuplicates,
          uniqueNumbers: beforeStats.totalUniqueNumbers
        },
        after: {
          duplicates: afterStats.totalDuplicates,
          uniqueNumbers: afterStats.totalUniqueNumbers
        },
        cleaned: cleanResult.deletedCount
      };
    } catch (error) {
      logger.error('[ContactCleanup] Error in full cleanup:', error);
      throw error;
    }
  }
}

module.exports = new ContactCleanup();