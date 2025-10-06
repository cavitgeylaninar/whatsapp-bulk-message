const logger = require('../../../utils/logger');

/**
 * Rate Limiter for WhatsApp Web Messages
 * Implements multiple strategies to prevent bans
 */
class WhatsAppRateLimiter {
  constructor() {
    // Rate limit configurations
    this.config = {
      // Message limits
      messagesPerMinute: 20,
      messagesPerHour: 100,
      messagesPerDay: 1000,

      // Bulk message limits
      bulkBatchSize: 10,
      bulkBatchDelay: 5000, // 5 seconds between batches

      // Contact-specific limits
      messagesPerContactPerDay: 5,
      messagesPerNewContact: 1,

      // Delays
      minMessageDelay: 1000, // 1 second minimum between messages
      maxMessageDelay: 3000, // 3 seconds max
      randomDelay: true,

      // Typing simulation
      simulateTyping: true,
      typingDelayPerChar: 50, // 50ms per character
      maxTypingDelay: 5000, // Max 5 seconds typing

      // Media delays
      mediaUploadDelay: 3000, // Extra delay for media

      // Group message delays
      groupMessageDelay: 5000, // Extra delay for group messages

      // Anti-spam patterns
      duplicateMessageCooldown: 300000, // 5 minutes for same message
      maxConsecutiveSameMessages: 3
    };

    // Tracking structures
    this.messageHistory = new Map(); // sessionId -> message timestamps
    this.contactHistory = new Map(); // sessionId -> contact -> timestamps
    this.duplicateTracker = new Map(); // sessionId -> message hash -> last sent
    this.sessionQueues = new Map(); // sessionId -> message queue
    this.processing = new Map(); // sessionId -> isProcessing

    // Initialize cleanup interval
    this.startCleanup();
  }

  /**
   * Check if message can be sent according to rate limits
   */
  async canSendMessage(sessionId, to, message, options = {}) {
    const now = Date.now();
    const history = this.getSessionHistory(sessionId);

    // Check global limits
    if (!this.checkGlobalLimits(history, now)) {
      return { allowed: false, reason: 'Global rate limit exceeded', waitTime: this.getWaitTime(history) };
    }

    // Check contact-specific limits
    if (!this.checkContactLimits(sessionId, to, now)) {
      return { allowed: false, reason: 'Contact rate limit exceeded', waitTime: 60000 };
    }

    // Check duplicate message
    if (!this.checkDuplicateMessage(sessionId, message, now)) {
      return { allowed: false, reason: 'Duplicate message cooldown', waitTime: this.config.duplicateMessageCooldown };
    }

    // Check if it's a new contact (no previous messages)
    const isNewContact = !this.hasContactHistory(sessionId, to);
    if (isNewContact && history.length > 10) {
      // Extra caution with new contacts if sending many messages
      return { allowed: false, reason: 'Too many new contacts', waitTime: 30000 };
    }

    return { allowed: true };
  }

  /**
   * Get appropriate delay before sending message
   */
  calculateDelay(sessionId, message, options = {}) {
    let delay = this.config.minMessageDelay;

    // Add random delay
    if (this.config.randomDelay) {
      delay += Math.random() * (this.config.maxMessageDelay - this.config.minMessageDelay);
    }

    // Add typing simulation delay
    if (this.config.simulateTyping && message) {
      const typingDelay = Math.min(
        message.length * this.config.typingDelayPerChar,
        this.config.maxTypingDelay
      );
      delay += typingDelay;
    }

    // Add media upload delay
    if (options.hasMedia) {
      delay += this.config.mediaUploadDelay;
    }

    // Add group message delay
    if (options.isGroup) {
      delay += this.config.groupMessageDelay;
    }

    // Progressive delay based on recent activity
    const history = this.getSessionHistory(sessionId);
    const recentMessages = history.filter(t => Date.now() - t < 60000).length;
    if (recentMessages > 10) {
      delay += (recentMessages - 10) * 1000; // Add 1 second per message over 10
    }

    return Math.round(delay);
  }

  /**
   * Record message sent
   */
  recordMessage(sessionId, to, message) {
    const now = Date.now();

    // Record in global history
    if (!this.messageHistory.has(sessionId)) {
      this.messageHistory.set(sessionId, []);
    }
    this.messageHistory.get(sessionId).push(now);

    // Record contact history
    if (!this.contactHistory.has(sessionId)) {
      this.contactHistory.set(sessionId, new Map());
    }
    const contacts = this.contactHistory.get(sessionId);
    if (!contacts.has(to)) {
      contacts.set(to, []);
    }
    contacts.get(to).push(now);

    // Record duplicate tracking
    const messageHash = this.hashMessage(message);
    const duplicateKey = `${sessionId}-${messageHash}`;
    this.duplicateTracker.set(duplicateKey, now);

    // Cleanup old entries
    this.cleanupOldEntries(sessionId);
  }

  /**
   * Queue message for rate-limited sending
   */
  async queueMessage(sessionId, to, message, sendFunction, options = {}) {
    // Initialize queue if needed
    if (!this.sessionQueues.has(sessionId)) {
      this.sessionQueues.set(sessionId, []);
      this.processing.set(sessionId, false);
    }

    // Add to queue
    return new Promise((resolve, reject) => {
      this.sessionQueues.get(sessionId).push({
        to,
        message,
        sendFunction,
        options,
        resolve,
        reject,
        addedAt: Date.now()
      });

      // Start processing if not already running
      if (!this.processing.get(sessionId)) {
        this.processQueue(sessionId);
      }
    });
  }

  /**
   * Process message queue for session
   */
  async processQueue(sessionId) {
    if (this.processing.get(sessionId)) return;

    this.processing.set(sessionId, true);
    const queue = this.sessionQueues.get(sessionId);

    while (queue && queue.length > 0) {
      const item = queue[0];

      try {
        // Check rate limits
        const canSend = await this.canSendMessage(sessionId, item.to, item.message, item.options);

        if (!canSend.allowed) {
          logger.warn(`Rate limit hit for session ${sessionId}: ${canSend.reason}`);

          // Wait before retry
          await this.sleep(canSend.waitTime || 5000);
          continue;
        }

        // Calculate delay
        const delay = this.calculateDelay(sessionId, item.message, item.options);

        // Log rate limit info
        logger.debug(`Sending message after ${delay}ms delay (session: ${sessionId})`);

        // Wait calculated delay
        await this.sleep(delay);

        // Send message
        const result = await item.sendFunction();

        // Record successful send
        this.recordMessage(sessionId, item.to, item.message);

        // Remove from queue and resolve
        queue.shift();
        item.resolve(result);

      } catch (error) {
        logger.error(`Error processing queued message for ${sessionId}:`, error);

        // Remove from queue and reject
        queue.shift();
        item.reject(error);
      }
    }

    this.processing.set(sessionId, false);
  }

  /**
   * Check global rate limits
   */
  checkGlobalLimits(history, now) {
    if (!history || history.length === 0) return true;

    // Messages per minute
    const lastMinute = history.filter(t => now - t < 60000).length;
    if (lastMinute >= this.config.messagesPerMinute) return false;

    // Messages per hour
    const lastHour = history.filter(t => now - t < 3600000).length;
    if (lastHour >= this.config.messagesPerHour) return false;

    // Messages per day
    const lastDay = history.filter(t => now - t < 86400000).length;
    if (lastDay >= this.config.messagesPerDay) return false;

    return true;
  }

  /**
   * Check contact-specific limits
   */
  checkContactLimits(sessionId, to, now) {
    if (!this.contactHistory.has(sessionId)) return true;

    const contacts = this.contactHistory.get(sessionId);
    if (!contacts.has(to)) return true;

    const contactMessages = contacts.get(to);
    const todayMessages = contactMessages.filter(t => now - t < 86400000).length;

    return todayMessages < this.config.messagesPerContactPerDay;
  }

  /**
   * Check duplicate message cooldown
   */
  checkDuplicateMessage(sessionId, message, now) {
    const messageHash = this.hashMessage(message);
    const duplicateKey = `${sessionId}-${messageHash}`;

    if (!this.duplicateTracker.has(duplicateKey)) return true;

    const lastSent = this.duplicateTracker.get(duplicateKey);
    return (now - lastSent) > this.config.duplicateMessageCooldown;
  }

  /**
   * Check if has contact history
   */
  hasContactHistory(sessionId, to) {
    if (!this.contactHistory.has(sessionId)) return false;
    return this.contactHistory.get(sessionId).has(to);
  }

  /**
   * Get session message history
   */
  getSessionHistory(sessionId) {
    return this.messageHistory.get(sessionId) || [];
  }

  /**
   * Calculate wait time based on history
   */
  getWaitTime(history) {
    if (!history || history.length === 0) return 0;

    const now = Date.now();
    const lastMinute = history.filter(t => now - t < 60000).length;

    if (lastMinute >= this.config.messagesPerMinute) {
      // Wait until oldest message in last minute expires
      const oldestInMinute = Math.min(...history.filter(t => now - t < 60000));
      return 60000 - (now - oldestInMinute) + 1000; // Add 1 second buffer
    }

    return 5000; // Default 5 seconds
  }

  /**
   * Hash message for duplicate detection
   */
  hashMessage(message) {
    if (!message) return '';
    // Simple hash - in production use crypto.createHash
    return message.substring(0, 50).toLowerCase().replace(/\s+/g, '');
  }

  /**
   * Clean up old entries
   */
  cleanupOldEntries(sessionId) {
    const now = Date.now();
    const dayAgo = now - 86400000;

    // Clean message history
    if (this.messageHistory.has(sessionId)) {
      const history = this.messageHistory.get(sessionId);
      this.messageHistory.set(sessionId, history.filter(t => t > dayAgo));
    }

    // Clean contact history
    if (this.contactHistory.has(sessionId)) {
      const contacts = this.contactHistory.get(sessionId);
      contacts.forEach((timestamps, contact) => {
        const filtered = timestamps.filter(t => t > dayAgo);
        if (filtered.length > 0) {
          contacts.set(contact, filtered);
        } else {
          contacts.delete(contact);
        }
      });
    }
  }

  /**
   * Start periodic cleanup
   */
  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      const dayAgo = now - 86400000;

      // Clean duplicate tracker
      for (const [key, timestamp] of this.duplicateTracker.entries()) {
        if (timestamp < dayAgo) {
          this.duplicateTracker.delete(key);
        }
      }

      // Clean empty queues
      for (const [sessionId, queue] of this.sessionQueues.entries()) {
        if (queue.length === 0 && !this.processing.get(sessionId)) {
          this.sessionQueues.delete(sessionId);
          this.processing.delete(sessionId);
        }
      }

      logger.debug('Rate limiter cleanup completed');
    }, 3600000); // Every hour
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get rate limit status for session
   */
  getStatus(sessionId) {
    const now = Date.now();
    const history = this.getSessionHistory(sessionId);

    const lastMinute = history.filter(t => now - t < 60000).length;
    const lastHour = history.filter(t => now - t < 3600000).length;
    const lastDay = history.filter(t => now - t < 86400000).length;

    return {
      messagesLastMinute: lastMinute,
      messagesLastHour: lastHour,
      messagesLastDay: lastDay,
      limits: {
        perMinute: this.config.messagesPerMinute,
        perHour: this.config.messagesPerHour,
        perDay: this.config.messagesPerDay
      },
      queueLength: this.sessionQueues.get(sessionId)?.length || 0,
      isProcessing: this.processing.get(sessionId) || false
    };
  }

  /**
   * Reset rate limits for session
   */
  resetSession(sessionId) {
    this.messageHistory.delete(sessionId);
    this.contactHistory.delete(sessionId);

    // Clear duplicate tracker for session
    for (const key of this.duplicateTracker.keys()) {
      if (key.startsWith(`${sessionId}-`)) {
        this.duplicateTracker.delete(key);
      }
    }

    // Clear queue
    if (this.sessionQueues.has(sessionId)) {
      const queue = this.sessionQueues.get(sessionId);
      queue.forEach(item => {
        item.reject(new Error('Session rate limits reset'));
      });
      this.sessionQueues.delete(sessionId);
    }

    this.processing.delete(sessionId);

    logger.info(`Rate limits reset for session ${sessionId}`);
  }
}

module.exports = new WhatsAppRateLimiter();