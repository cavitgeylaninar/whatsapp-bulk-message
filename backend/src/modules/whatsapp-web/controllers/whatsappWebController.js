const SessionManager = require('../services/SessionManager');
const MessageHandler = require('../services/MessageHandler');
const ContactManager = require('../services/ContactManager');
const ContactCleanup = require('../services/ContactCleanup');
const logger = require('../../../utils/logger');

class WhatsAppWebController {
  /**
   * Create new session and get QR code
   */
  async createSession(req, res, next) {
    try {
      const { sessionId } = req.body;
      const userId = req.user?.id || 'default';
      const finalSessionId = sessionId || `session-${userId}`;

      // Check if session already exists
      const existingSession = SessionManager.getSession(finalSessionId);
      if (existingSession && existingSession.status === 'READY') {
        return res.json({
          success: true,
          message: 'Session already active',
          session: {
            id: finalSessionId,
            status: existingSession.status,
            info: existingSession.info
          }
        });
      }

      // Force cleanup any existing Chrome processes first
      await SessionManager.forceCleanupChromeProcesses();

      // Create new session with user context
      await SessionManager.createSession(finalSessionId, {
        userId: userId
      });

      // Wait for QR code or ready status - increased timeout to 60 seconds
      const session = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Session initialization timeout'));
        }, 60000);

        const checkSession = setInterval(() => {
          const currentSession = SessionManager.getSession(finalSessionId);
          if (currentSession && (currentSession.qr || currentSession.status === 'READY')) {
            clearInterval(checkSession);
            clearTimeout(timeout);
            resolve(currentSession);
          }
        }, 1000);
      });

      res.json({
        success: true,
        session: {
          id: finalSessionId,
          status: session.status,
          qr: session.qr,
          info: session.info
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get session status
   */
  async getSessionStatus(req, res, next) {
    try {
      const { sessionId } = req.params;
      const status = SessionManager.getSessionStatus(sessionId);

      if (status === 'NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      // Verify the actual client state if session claims to be READY
      if (status.status === 'READY') {
        const client = SessionManager.getClient(sessionId);
        if (client) {
          try {
            // Try to get the actual client state with a timeout
            const statePromise = client.getState();
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('State check timeout')), 3000)
            );

            const actualState = await Promise.race([statePromise, timeoutPromise]);

            // If client is not connected, reset the session status
            if (actualState !== 'CONNECTED') {
              logger.warn(`Session ${sessionId} claimed READY but actual state is ${actualState}`);
              // Update the session status to reflect the actual state
              SessionManager.updateSessionStatus(sessionId, 'DISCONNECTED');
              status.status = 'DISCONNECTED';
              status.qr = null;
              status.info = null;
            }
          } catch (error) {
            // If we can't get the state, assume disconnected
            logger.warn(`Session ${sessionId} state check failed: ${error.message}`);
            SessionManager.updateSessionStatus(sessionId, 'DISCONNECTED');
            status.status = 'DISCONNECTED';
            status.qr = null;
            status.info = null;
          }
        } else {
          // No client found, session is not actually ready
          status.status = 'NOT_FOUND';
          status.qr = null;
          status.info = null;
        }
      }

      res.json({
        success: true,
        data: status,
        session: status
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all sessions
   */
  async getAllSessions(req, res, next) {
    try {
      const sessions = SessionManager.getAllSessions();

      res.json({
        success: true,
        total: sessions.length,
        sessions
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Destroy session
   */
  async destroySession(req, res, next) {
    try {
      const { sessionId } = req.params;
      const result = await SessionManager.destroySession(sessionId);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      res.json({
        success: true,
        message: 'Session destroyed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send text message
   */
  async sendMessage(req, res, next) {
    try {
      const { sessionId } = req.params;
      const { phoneNumber, message, options } = req.body;

      if (!SessionManager.isSessionReady(sessionId)) {
        return res.status(400).json({
          success: false,
          error: 'Session not ready'
        });
      }

      const result = await MessageHandler.sendTextMessage(
        sessionId,
        phoneNumber,
        message,
        options
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send media message
   */
  async sendMedia(req, res, next) {
    try {
      const { sessionId } = req.params;
      const { phoneNumber, mediaUrl, caption, options } = req.body;

      if (!SessionManager.isSessionReady(sessionId)) {
        return res.status(400).json({
          success: false,
          error: 'Session not ready'
        });
      }

      const result = await MessageHandler.sendMediaMessage(
        sessionId,
        phoneNumber,
        mediaUrl,
        caption,
        options
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send bulk messages
   */
  async sendBulkMessages(req, res, next) {
    try {
      const { sessionId } = req.params;
      const { recipients, message, personalizedMessages, options } = req.body;

      // Debug log
      console.log('=== BULK MESSAGE DEBUG ===');
      console.log('Recipients:', recipients);
      console.log('Message:', message);
      console.log('Personalized Messages:', JSON.stringify(personalizedMessages, null, 2));
      console.log('========================');

      if (!SessionManager.isSessionReady(sessionId)) {
        return res.status(400).json({
          success: false,
          error: 'Session not ready'
        });
      }

      const result = await MessageHandler.sendBulkMessages(
        sessionId,
        recipients,
        message,
        options,
        personalizedMessages
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get chat history
   */
  async getChatHistory(req, res, next) {
    try {
      const { sessionId } = req.params;
      const { phoneNumber, limit = 50 } = req.query;

      if (!SessionManager.isSessionReady(sessionId)) {
        return res.status(400).json({
          success: false,
          error: 'Session not ready'
        });
      }

      const messages = await MessageHandler.getChatHistory(
        sessionId,
        phoneNumber,
        parseInt(limit)
      );

      res.json({
        success: true,
        total: messages.length,
        messages
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search messages
   */
  async searchMessages(req, res, next) {
    try {
      const { sessionId } = req.params;
      const { query, options } = req.body;

      if (!SessionManager.isSessionReady(sessionId)) {
        return res.status(400).json({
          success: false,
          error: 'Session not ready'
        });
      }

      const results = await MessageHandler.searchMessages(
        sessionId,
        query,
        options
      );

      res.json({
        success: true,
        results
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get contacts
   */
  async getContacts(req, res, next) {
    try {
      const { sessionId } = req.params;
      const options = req.query;

      if (!SessionManager.isSessionReady(sessionId)) {
        return res.status(400).json({
          success: false,
          error: 'Session not ready'
        });
      }

      logger.info(`[getContacts] Optimized mode - session: ${sessionId}, options:`, options);

      // Add timeout to prevent hanging requests - increased to 30 seconds for large contact lists
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
      );

      const contactsPromise = ContactManager.getContacts(sessionId, options);

      try {
        const result = await Promise.race([contactsPromise, timeoutPromise]);
        logger.info(`[getContacts] Success: ${result.contacts?.length || 0} contacts in ${result.total} total`);
        res.json({
          success: true,
          ...result
        });
      } catch (error) {
        // If timeout or error, return quick response
        logger.warn(`[getContacts] Timeout/Error: ${error.message}, returning quick response`);

        const limit = parseInt(options.limit) || 50;
        const page = parseInt(options.page) || 1;

        res.json({
          success: true,
          contacts: [],
          total: 0,
          page: parseInt(page),
          totalPages: 0,
          message: 'Kişiler yükleniyor... Lütfen birkaç saniye bekleyin ve sayfayı yenileyin.',
          loading: true,
          fromTimeout: true
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single contact
   */
  async getContact(req, res, next) {
    try {
      const { sessionId, phoneNumber } = req.params;

      if (!SessionManager.isSessionReady(sessionId)) {
        return res.status(400).json({
          success: false,
          error: 'Session not ready'
        });
      }

      const contact = await ContactManager.getContact(sessionId, phoneNumber);

      res.json({
        success: true,
        contact
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check WhatsApp numbers
   */
  async checkNumbers(req, res, next) {
    try {
      const { sessionId } = req.params;
      const { phoneNumbers } = req.body;

      if (!SessionManager.isSessionReady(sessionId)) {
        return res.status(400).json({
          success: false,
          error: 'Session not ready'
        });
      }

      const result = await ContactManager.checkWhatsAppNumbers(
        sessionId,
        phoneNumbers
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get chats
   */
  async getChats(req, res, next) {
    try {
      const { sessionId } = req.params;
      const options = {
        ...req.query,
        limit: parseInt(req.query.limit) || 30,  // Default 30 chats
        offset: parseInt(req.query.offset) || 0
      };

      if (!SessionManager.isSessionReady(sessionId)) {
        return res.status(400).json({
          success: false,
          error: 'Session not ready'
        });
      }

      const result = await ContactManager.getChats(sessionId, options);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get groups
   */
  async getGroups(req, res, next) {
    try {
      const { sessionId } = req.params;

      if (!SessionManager.isSessionReady(sessionId)) {
        return res.status(400).json({
          success: false,
          error: 'Session not ready'
        });
      }

      const result = await ContactManager.getGroups(sessionId);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Block/Unblock contact
   */
  async blockContact(req, res, next) {
    try {
      const { sessionId, phoneNumber } = req.params;
      const { block = true } = req.body;

      if (!SessionManager.isSessionReady(sessionId)) {
        return res.status(400).json({
          success: false,
          error: 'Session not ready'
        });
      }

      const result = await ContactManager.blockContact(
        sessionId,
        phoneNumber,
        block
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sync contacts to database
   */
  async syncContacts(req, res, next) {
    try {
      const { sessionId } = req.params;

      logger.info(`[WhatsAppWebController] syncContacts called for session: ${sessionId}`);
      logger.info(`[WhatsAppWebController] User ID: ${req.user?.id}`);

      if (!SessionManager.isSessionReady(sessionId)) {
        logger.warn(`[WhatsAppWebController] Session ${sessionId} not ready`);
        return res.status(400).json({
          success: false,
          error: 'Session not ready',
          message: 'WhatsApp bağlantısı hazır değil. Lütfen QR kodu tarayın.'
        });
      }

      const userId = req.user?.id || 'default';
      logger.info(`[WhatsAppWebController] Starting sync for userId: ${userId}`);

      const result = await ContactManager.syncContacts(sessionId, userId);

      logger.info(`[WhatsAppWebController] Sync result:`, result);

      res.json(result);
    } catch (error) {
      logger.error(`[WhatsAppWebController] Error in syncContacts:`, error);
      next(error);
    }
  }

  /**
   * Delete message
   */
  async deleteMessage(req, res, next) {
    try {
      const { sessionId, messageId } = req.params;
      const { everyone = false } = req.body;

      if (!SessionManager.isSessionReady(sessionId)) {
        return res.status(400).json({
          success: false,
          error: 'Session not ready'
        });
      }

      const result = await MessageHandler.deleteMessage(
        sessionId,
        messageId,
        everyone
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get presence (online status)
   */
  async getPresence(req, res, next) {
    try {
      const { sessionId, phoneNumber } = req.params;

      if (!SessionManager.isSessionReady(sessionId)) {
        return res.status(400).json({
          success: false,
          error: 'Session not ready'
        });
      }

      const result = await ContactManager.getPresence(sessionId, phoneNumber);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clean duplicate contacts from database
   */
  async cleanupDuplicates(req, res, next) {
    try {
      const userId = req.user?.id || null;
      logger.info(`[WhatsAppWebController] Starting duplicate cleanup for user: ${userId}`);

      const result = await ContactCleanup.performFullCleanup(userId);

      logger.info(`[WhatsAppWebController] Cleanup completed:`, result);

      res.json({
        success: true,
        message: `Temizleme tamamlandı. ${result.cleaned} kopya kişi silindi.`,
        ...result
      });
    } catch (error) {
      logger.error(`[WhatsAppWebController] Error in cleanup:`, error);
      next(error);
    }
  }

  /**
   * Get duplicate contacts statistics
   */
  async getDuplicateStats(req, res, next) {
    try {
      const userId = req.user?.id || null;
      logger.info(`[WhatsAppWebController] Getting duplicate stats for user: ${userId}`);

      const result = await ContactCleanup.getDuplicateStats(userId);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error(`[WhatsAppWebController] Error getting duplicate stats:`, error);
      next(error);
    }
  }

  /**
   * Get all contacts from all sessions
   */
  async getAllContacts(req, res, next) {
    try {
      const userId = req.user?.id;

      // Get all active sessions for the user
      const allSessions = SessionManager.getAllSessions();
      const userSessions = allSessions.filter(session =>
        session.userId === userId && session.status === 'READY'
      );

      if (userSessions.length === 0) {
        return res.json({
          success: true,
          contacts: [],
          total: 0,
          message: 'No active sessions found'
        });
      }

      // Aggregate contacts from all sessions
      let allContacts = [];
      const sessionContacts = {};

      for (const session of userSessions) {
        try {
          const result = await ContactManager.getContacts(session.id, {});
          if (result.contacts && Array.isArray(result.contacts)) {
            // Add sessionId to each contact and collect them
            const contactsWithSession = result.contacts.map(contact => ({
              ...contact,
              sessionId: session.id,
              id: `${session.id}_${contact.id}` // Create unique ID
            }));

            allContacts = allContacts.concat(contactsWithSession);
            sessionContacts[session.id] = result.contacts.length;
          }
        } catch (error) {
          logger.warn(`[WhatsAppWebController] Error getting contacts from session ${session.id}:`, error.message);
          sessionContacts[session.id] = 0;
        }
      }

      // Remove duplicates based on phone number, keeping the most recent
      const uniqueContacts = allContacts.reduce((acc, current) => {
        const existing = acc.find(contact => contact.phone === current.phone);
        if (!existing) {
          acc.push(current);
        } else {
          // Keep the most recent contact (or the one with more information)
          if (current.updatedAt > existing.updatedAt ||
              (!existing.name && current.name) ||
              (!existing.profilePicUrl && current.profilePicUrl)) {
            const index = acc.findIndex(contact => contact.phone === current.phone);
            acc[index] = current;
          }
        }
        return acc;
      }, []);

      // Sort by last activity or creation date
      uniqueContacts.sort((a, b) => {
        const aDate = new Date(a.lastSeen || a.updatedAt || a.createdAt || 0);
        const bDate = new Date(b.lastSeen || b.updatedAt || b.createdAt || 0);
        return bDate - aDate;
      });

      res.json({
        success: true,
        contacts: uniqueContacts,
        total: uniqueContacts.length,
        sessions: userSessions.length,
        sessionBreakdown: sessionContacts
      });
    } catch (error) {
      logger.error(`[WhatsAppWebController] Error getting all contacts:`, error);
      next(error);
    }
  }
}

module.exports = new WhatsAppWebController();