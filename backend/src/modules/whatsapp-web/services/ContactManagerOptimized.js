const logger = require('../../../utils/logger');
const { WhatsAppContact } = require('../../../models');
const { Op } = require('sequelize');

/**
 * Optimized Contact Manager with pagination and batch processing
 */
class ContactManagerOptimized {
  constructor() {
    this.config = {
      batchSize: 50, // Process contacts in batches of 50
      maxConcurrent: 3, // Max concurrent batch operations
      syncTimeout: 30000, // 30 seconds per batch
      cacheExpiry: 300000, // 5 minutes cache
      maxRetries: 3,
      retryDelay: 2000
    };

    // Contact cache
    this.contactCache = new Map();
    this.syncProgress = new Map();
  }

  /**
   * Sync contacts with pagination and progress tracking
   */
  async syncContacts(sessionId, client, userId, options = {}) {
    const startTime = Date.now();
    const syncId = `${sessionId}-${startTime}`;

    try {
      logger.info(`Starting optimized contact sync for session ${sessionId}`);

      // Initialize progress tracking
      this.syncProgress.set(syncId, {
        sessionId,
        userId,
        status: 'initializing',
        total: 0,
        processed: 0,
        saved: 0,
        errors: 0,
        startTime,
        currentBatch: 0
      });

      // Get all contacts with retry logic
      const allContacts = await this.getContactsWithRetry(client);

      if (!allContacts || allContacts.length === 0) {
        logger.info(`No contacts found for session ${sessionId}`);
        return {
          success: true,
          total: 0,
          synced: 0,
          duration: Date.now() - startTime
        };
      }

      // Update progress
      const progress = this.syncProgress.get(syncId);
      progress.total = allContacts.length;
      progress.status = 'processing';

      logger.info(`Found ${allContacts.length} contacts, starting batch processing`);

      // Process contacts in batches
      const results = await this.processBatches(allContacts, client, sessionId, userId, syncId);

      // Final progress update
      progress.status = 'completed';
      progress.endTime = Date.now();

      // Cache results
      this.updateCache(sessionId, results.contacts);

      // Clean up progress tracking after delay
      setTimeout(() => this.syncProgress.delete(syncId), 60000);

      const duration = Date.now() - startTime;
      logger.info(`Contact sync completed for ${sessionId}: ${results.saved}/${allContacts.length} in ${duration}ms`);

      return {
        success: true,
        total: allContacts.length,
        synced: results.saved,
        errors: results.errors,
        duration
      };

    } catch (error) {
      logger.error(`Contact sync failed for ${sessionId}:`, error);

      const progress = this.syncProgress.get(syncId);
      if (progress) {
        progress.status = 'failed';
        progress.error = error.message;
      }

      throw error;
    }
  }

  /**
   * Get contacts with retry logic
   */
  async getContactsWithRetry(client, retries = 0) {
    try {
      // Set a timeout for getting contacts
      const contactsPromise = client.getContacts();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout getting contacts')), this.config.syncTimeout)
      );

      const contacts = await Promise.race([contactsPromise, timeoutPromise]);
      return contacts;

    } catch (error) {
      if (retries < this.config.maxRetries) {
        logger.warn(`Retrying get contacts (attempt ${retries + 1}/${this.config.maxRetries})`);
        await this.sleep(this.config.retryDelay * (retries + 1));
        return this.getContactsWithRetry(client, retries + 1);
      }
      throw error;
    }
  }

  /**
   * Process contacts in batches
   */
  async processBatches(contacts, client, sessionId, userId, syncId) {
    const batches = this.createBatches(contacts);
    const results = {
      contacts: [],
      saved: 0,
      errors: 0
    };

    // Process batches with concurrency control
    const batchPromises = [];
    const progress = this.syncProgress.get(syncId);

    for (let i = 0; i < batches.length; i += this.config.maxConcurrent) {
      const concurrentBatches = batches.slice(i, i + this.config.maxConcurrent);

      const batchResults = await Promise.allSettled(
        concurrentBatches.map((batch, index) =>
          this.processSingleBatch(batch, i + index, batches.length, client, sessionId, userId, syncId)
        )
      );

      // Aggregate results
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.contacts.push(...result.value.contacts);
          results.saved += result.value.saved;
          results.errors += result.value.errors;
        } else {
          results.errors += batch.length;
          logger.error(`Batch processing failed:`, result.reason);
        }
      }

      // Update progress
      if (progress) {
        progress.processed = Math.min(results.saved + results.errors, contacts.length);
        progress.saved = results.saved;
        progress.errors = results.errors;
        progress.currentBatch = Math.min(i + this.config.maxConcurrent, batches.length);
      }

      // Small delay between concurrent batch groups
      if (i + this.config.maxConcurrent < batches.length) {
        await this.sleep(1000);
      }
    }

    return results;
  }

  /**
   * Process a single batch of contacts
   */
  async processSingleBatch(batch, batchIndex, totalBatches, client, sessionId, userId, syncId) {
    const batchResults = {
      contacts: [],
      saved: 0,
      errors: 0
    };

    logger.debug(`Processing batch ${batchIndex + 1}/${totalBatches} with ${batch.length} contacts`);

    for (const contact of batch) {
      try {
        // Skip invalid contacts
        if (!this.isValidContact(contact)) continue;

        // Get additional contact info if needed
        const contactInfo = await this.enrichContactInfo(contact, client);

        // Prepare contact data
        const contactData = {
          whatsappId: contact.id._serialized || contact.id,
          name: contact.name || contact.pushname || '',
          phone: this.extractPhoneNumber(contact),
          pushname: contact.pushname || '',
          isMyContact: contact.isMyContact || false,
          isUser: contact.isUser || false,
          isGroup: contact.isGroup || false,
          isBlocked: contact.isBlocked || false,
          profilePicUrl: contactInfo.profilePicUrl || null,
          status: contactInfo.status || null,
          metadata: {
            hasName: !!contact.name,
            syncedAt: new Date(),
            sessionId
          },
          lastSeen: contact.lastSeen || null,
          created_by: userId
        };

        // Save to database with upsert
        await this.saveContact(contactData);
        batchResults.contacts.push(contactData);
        batchResults.saved++;

      } catch (error) {
        logger.warn(`Failed to process contact:`, error.message);
        batchResults.errors++;
      }
    }

    return batchResults;
  }

  /**
   * Create batches from contacts array
   */
  createBatches(contacts) {
    const batches = [];
    for (let i = 0; i < contacts.length; i += this.config.batchSize) {
      batches.push(contacts.slice(i, i + this.config.batchSize));
    }
    return batches;
  }

  /**
   * Validate contact
   */
  isValidContact(contact) {
    if (!contact) return false;
    if (!contact.id) return false;
    if (contact.isGroup) return false; // Skip groups for now
    if (!contact.isUser) return false; // Only process WhatsApp users
    return true;
  }

  /**
   * Extract phone number from contact
   */
  extractPhoneNumber(contact) {
    if (contact.number) return contact.number;
    if (contact.id && contact.id.user) return contact.id.user;
    if (contact.id && contact.id._serialized) {
      const parts = contact.id._serialized.split('@');
      if (parts[0]) return parts[0];
    }
    return null;
  }

  /**
   * Enrich contact with additional info
   */
  async enrichContactInfo(contact, client) {
    const info = {
      profilePicUrl: null,
      status: null
    };

    try {
      // Get profile picture with timeout
      if (contact.id && client.getProfilePicUrl) {
        const picPromise = client.getProfilePicUrl(contact.id._serialized);
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve(null), 5000)
        );
        info.profilePicUrl = await Promise.race([picPromise, timeoutPromise]);
      }

      // Get status/about
      if (contact.getAbout && typeof contact.getAbout === 'function') {
        const aboutPromise = contact.getAbout();
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve(null), 5000)
        );
        info.status = await Promise.race([aboutPromise, timeoutPromise]);
      }
    } catch (error) {
      // Silently fail for enrichment errors
      logger.debug(`Failed to enrich contact info:`, error.message);
    }

    return info;
  }

  /**
   * Save contact to database
   */
  async saveContact(contactData) {
    try {
      // Use upsert to avoid duplicates
      const [contact, created] = await WhatsAppContact.findOrCreate({
        where: {
          phone: contactData.phone,
          created_by: contactData.created_by
        },
        defaults: contactData
      });

      // Update if exists and has new data
      if (!created && contactData.name && contactData.name !== contact.name) {
        await contact.update({
          name: contactData.name,
          pushname: contactData.pushname,
          profilePicUrl: contactData.profilePicUrl,
          status: contactData.status,
          metadata: contactData.metadata
        });
      }

      return contact;
    } catch (error) {
      logger.error(`Failed to save contact:`, error);
      throw error;
    }
  }

  /**
   * Get paginated contacts from database
   */
  async getContacts(userId, options = {}) {
    const {
      page = 1,
      limit = 50,
      search = '',
      sortBy = 'name',
      sortOrder = 'ASC',
      filter = {}
    } = options;

    try {
      // Check cache first
      const cacheKey = `${userId}-${JSON.stringify(options)}`;
      if (this.contactCache.has(cacheKey)) {
        const cached = this.contactCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.config.cacheExpiry) {
          return cached.data;
        }
      }

      // Build query
      const where = {
        created_by: userId
      };

      // Add search condition
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
          { pushname: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Add filters
      if (filter.isMyContact !== undefined) {
        where.isMyContact = filter.isMyContact;
      }
      if (filter.isBlocked !== undefined) {
        where.isBlocked = filter.isBlocked;
      }

      // Execute query with pagination
      const { count, rows } = await WhatsAppContact.findAndCountAll({
        where,
        limit,
        offset: (page - 1) * limit,
        order: [[sortBy, sortOrder]]
      });

      const result = {
        contacts: rows,
        total: count,
        page,
        pages: Math.ceil(count / limit),
        limit
      };

      // Cache result
      this.contactCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      logger.error(`Failed to get contacts:`, error);
      throw error;
    }
  }

  /**
   * Get sync progress
   */
  getSyncProgress(syncId) {
    return this.syncProgress.get(syncId);
  }

  /**
   * Get all active sync operations
   */
  getActiveSyncs() {
    const active = [];
    for (const [id, progress] of this.syncProgress.entries()) {
      if (progress.status === 'processing') {
        active.push({ id, ...progress });
      }
    }
    return active;
  }

  /**
   * Cancel sync operation
   */
  cancelSync(syncId) {
    const progress = this.syncProgress.get(syncId);
    if (progress) {
      progress.status = 'cancelled';
      return true;
    }
    return false;
  }

  /**
   * Update cache
   */
  updateCache(sessionId, contacts) {
    // Implement cache update logic if needed
    // For now, clear related cache entries
    for (const [key] of this.contactCache.entries()) {
      if (key.includes(sessionId)) {
        this.contactCache.delete(key);
      }
    }
  }

  /**
   * Clear cache
   */
  clearCache(userId = null) {
    if (userId) {
      // Clear cache for specific user
      for (const [key] of this.contactCache.entries()) {
        if (key.startsWith(userId)) {
          this.contactCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.contactCache.clear();
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get contact statistics
   */
  async getStatistics(userId) {
    try {
      const stats = await WhatsAppContact.findAll({
        where: { created_by: userId },
        attributes: [
          [require('sequelize').fn('COUNT', '*'), 'total'],
          [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN "isMyContact" = true THEN 1 END')), 'myContacts'],
          [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN "isBlocked" = true THEN 1 END')), 'blocked'],
          [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN "isGroup" = true THEN 1 END')), 'groups']
        ],
        raw: true
      });

      return stats[0] || {
        total: 0,
        myContacts: 0,
        blocked: 0,
        groups: 0
      };
    } catch (error) {
      logger.error(`Failed to get contact statistics:`, error);
      throw error;
    }
  }
}

module.exports = ContactManagerOptimized;