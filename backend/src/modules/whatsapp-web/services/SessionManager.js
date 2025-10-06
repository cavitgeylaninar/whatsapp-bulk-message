const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../../utils/logger');
const EventEmitter = require('events');

class SessionManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.sessionPath = path.join(__dirname, '../../../../.wwebjs_auth');
    this.keepAliveIntervals = new Map();

    // Auto cleanup inactive sessions every 30 minutes (increased from 5)
    this.cleanupInterval = setInterval(() => {
      this.cleanInactiveSessions(60); // Increased from 30 to 60 minutes
    }, 30 * 60 * 1000);

    // Graceful shutdown handler
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  /**
   * Create new WhatsApp session
   * @param {string} sessionId - Unique session identifier
   * @param {object} options - Session options
   */
  async createSession(sessionId, options = {}) {
    try {
      if (this.sessions.has(sessionId)) {
        logger.warn(`Session ${sessionId} already exists`);
        return this.sessions.get(sessionId);
      }

      logger.info(`Creating new WhatsApp session: ${sessionId}`);

      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: sessionId,
          dataPath: this.sessionPath
        }),
        puppeteer: {
          headless: 'new', // Use new headless mode for better performance
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--window-size=1280,720',
            '--memory-pressure-off',
            '--max_old_space_size=4096',
            '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          ],
          ...(process.platform === 'darwin' ? {
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
          } : {}),
          timeout: 60000,
          protocolTimeout: 180000,
          slowMo: 0,
          devtools: false
        },
        ...options
      });

      // Session events
      this.setupClientEvents(client, sessionId);

      // Store session with user context
      this.sessions.set(sessionId, {
        client,
        status: 'INITIALIZING',
        qr: null,
        info: null,
        userId: options.userId || null,
        createdAt: new Date(),
        lastActivity: new Date()
      });

      // Initialize client with timeout protection
      const initTimeout = setTimeout(() => {
        logger.error(`Session ${sessionId} initialization taking too long, this might indicate Chrome startup issues`);
      }, 30000);

      try {
        await client.initialize();
        clearTimeout(initTimeout);
        logger.info(`Session ${sessionId} successfully initialized`);
      } catch (initError) {
        clearTimeout(initTimeout);
        logger.error(`Session ${sessionId} initialization failed:`, initError);

        // Clean up failed session
        this.sessions.delete(sessionId);

        throw new Error(`Session initialization failed: ${initError.message}`);
      }

      return this.sessions.get(sessionId);
    } catch (error) {
      logger.error(`Error creating session ${sessionId}:`, error);

      // Clean up any partial session data
      if (this.sessions.has(sessionId)) {
        this.sessions.delete(sessionId);
      }

      throw error;
    }
  }

  /**
   * Setup client event handlers
   */
  setupClientEvents(client, sessionId) {
    // QR Code generation
    client.on('qr', async (qr) => {
      logger.info(`QR Code generated for session ${sessionId}`);
      const qrDataUrl = await qrcode.toDataURL(qr);

      const session = this.sessions.get(sessionId);
      if (session) {
        session.qr = qrDataUrl;
        session.status = 'QR_CODE';
      }

      this.emit('qr', { sessionId, qr: qrDataUrl });
    });

    // Authentication
    client.on('authenticated', () => {
      logger.info(`Session ${sessionId} authenticated`);
      const session = this.sessions.get(sessionId);
      if (session) {
        session.status = 'AUTHENTICATED';
        session.qr = null;
      }
      this.emit('authenticated', { sessionId });
    });

    // Ready
    client.on('ready', async () => {
      logger.info(`Session ${sessionId} ready`);

      const info = client.info;
      const session = this.sessions.get(sessionId);
      if (session) {
        session.status = 'READY';
        session.info = {
          id: info.wid._serialized,
          pushname: info.pushname,
          platform: info.platform,
          phone: info.wid.user
        };
      }

      this.emit('ready', { sessionId, info, userId: session.userId });

      // Start keep-alive mechanism
      this.startKeepAlive(sessionId);
    });

    // Disconnection
    client.on('disconnected', (reason) => {
      logger.warn(`Session ${sessionId} disconnected: ${reason}`);

      // Stop keep-alive on disconnection
      this.stopKeepAlive(sessionId);

      const session = this.sessions.get(sessionId);
      if (session) {
        session.status = 'DISCONNECTED';

        // Try to reconnect if it was not a manual logout
        if (reason !== 'LOGOUT') {
          logger.info(`Attempting to reconnect session ${sessionId}...`);
          setTimeout(async () => {
            try {
              await client.initialize();
            } catch (error) {
              logger.error(`Failed to reconnect session ${sessionId}:`, error.message);
            }
          }, 5000); // Wait 5 seconds before reconnecting
        }
      }
      this.emit('disconnected', { sessionId, reason });
    });

    // Authentication failure
    client.on('auth_failure', (message) => {
      logger.error(`Session ${sessionId} auth failure: ${message}`);
      const session = this.sessions.get(sessionId);
      if (session) {
        session.status = 'AUTH_FAILURE';
      }
      this.emit('auth_failure', { sessionId, message });
    });

    // Message received
    client.on('message', async (message) => {
      const session = this.sessions.get(sessionId);
      if (session) {
        session.lastActivity = new Date();
      }
      this.emit('message', { sessionId, message });
    });

    // Message status update
    client.on('message_ack', (message, ack) => {
      this.emit('message_ack', { sessionId, message, ack });
    });

    // Contact changed
    client.on('contact_changed', async (message, oldId, newId, isContact) => {
      this.emit('contact_changed', { sessionId, message, oldId, newId, isContact });
    });

    // Group events
    client.on('group_join', (notification) => {
      this.emit('group_join', { sessionId, notification });
    });

    client.on('group_leave', (notification) => {
      this.emit('group_leave', { sessionId, notification });
    });
  }

  /**
   * Get session by ID
   * @param {string} sessionId
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions
   */
  getAllSessions() {
    const sessionsArray = [];
    this.sessions.forEach((session, id) => {
      sessionsArray.push({
        id,
        status: session.status,
        info: session.info,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity
      });
    });
    return sessionsArray;
  }

  /**
   * Get client instance
   * @param {string} sessionId
   */
  getClient(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? session.client : null;
  }

  /**
   * Check if session exists and is ready
   * @param {string} sessionId
   */
  isSessionReady(sessionId) {
    const session = this.sessions.get(sessionId);
    return session && session.status === 'READY';
  }

  /**
   * Start keep-alive mechanism for a session
   * @param {string} sessionId
   */
  startKeepAlive(sessionId) {
    // Clear any existing interval
    this.stopKeepAlive(sessionId);

    const client = this.getClient(sessionId);
    if (!client) return;

    // Send a ping every 30 seconds to keep the connection alive
    const interval = setInterval(async () => {
      try {
        const session = this.sessions.get(sessionId);
        if (session && session.status === 'READY') {
          // Update last activity
          session.lastActivity = new Date();

          // Get state to keep connection alive
          const state = await client.getState();
          if (state !== 'CONNECTED') {
            logger.warn(`Session ${sessionId} state: ${state}, attempting to reconnect...`);
          }
        } else {
          // Stop keep-alive if session is not ready
          this.stopKeepAlive(sessionId);
        }
      } catch (error) {
        logger.warn(`Keep-alive failed for session ${sessionId}:`, error.message);
      }
    }, 30000); // Every 30 seconds

    this.keepAliveIntervals.set(sessionId, interval);
    logger.info(`Keep-alive started for session ${sessionId}`);
  }

  /**
   * Stop keep-alive mechanism for a session
   * @param {string} sessionId
   */
  stopKeepAlive(sessionId) {
    const interval = this.keepAliveIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.keepAliveIntervals.delete(sessionId);
      logger.info(`Keep-alive stopped for session ${sessionId}`);
    }
  }

  /**
   * Destroy session
   * @param {string} sessionId
   */
  async destroySession(sessionId) {
    try {
      // Stop keep-alive first
      this.stopKeepAlive(sessionId);

      const session = this.sessions.get(sessionId);
      if (!session) {
        logger.warn(`Session ${sessionId} not found`);
        return false;
      }

      logger.info(`Destroying session ${sessionId}`);

      // Logout from WhatsApp with timeout
      if (session.client) {
        try {
          // Set a timeout for logout to prevent hanging
          await Promise.race([
            session.client.logout(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Logout timeout')), 10000)
            )
          ]);
        } catch (error) {
          logger.warn(`Logout failed for session ${sessionId}, forcing destroy:`, error.message);
        }

        try {
          await session.client.destroy();
        } catch (error) {
          logger.warn(`Destroy failed for session ${sessionId}:`, error.message);
        }
      }

      // Remove session data
      this.sessions.delete(sessionId);

      // Remove auth folder
      const authPath = path.join(this.sessionPath, `session-${sessionId}`);
      try {
        await fs.rmdir(authPath, { recursive: true });
      } catch (error) {
        logger.warn(`Could not remove auth folder for ${sessionId}:`, error.message);
      }

      this.emit('session_destroyed', { sessionId });
      return true;
    } catch (error) {
      logger.error(`Error destroying session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Restart session
   * @param {string} sessionId
   */
  async restartSession(sessionId) {
    try {
      logger.info(`Restarting session ${sessionId}`);

      const session = this.sessions.get(sessionId);
      if (session && session.client) {
        await session.client.destroy();
      }

      this.sessions.delete(sessionId);
      return await this.createSession(sessionId);
    } catch (error) {
      logger.error(`Error restarting session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get session status
   * @param {string} sessionId
   */
  getSessionStatus(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return 'NOT_FOUND';

    return {
      status: session.status,
      qr: session.qr,
      info: session.info,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity
    };
  }

  /**
   * Update session status
   * @param {string} sessionId
   * @param {string} status
   */
  updateSessionStatus(sessionId, status) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      if (status === 'DISCONNECTED') {
        session.qr = null;
        session.info = null;
      }
      logger.info(`Session ${sessionId} status updated to ${status}`);
    }
  }

  /**
   * Clean inactive sessions
   * @param {number} maxInactiveMinutes
   */
  async cleanInactiveSessions(maxInactiveMinutes = 30) {
    const now = new Date();
    const toDestroy = [];

    this.sessions.forEach((session, id) => {
      const inactiveMinutes = (now - session.lastActivity) / (1000 * 60);
      if (inactiveMinutes > maxInactiveMinutes && session.status !== 'READY') {
        toDestroy.push(id);
      }
    });

    for (const sessionId of toDestroy) {
      await this.destroySession(sessionId);
      logger.info(`Cleaned inactive session: ${sessionId}`);
    }

    return toDestroy.length;
  }

  /**
   * Graceful shutdown - destroy all sessions
   */
  async shutdown() {
    try {
      logger.info('Shutting down SessionManager...');

      // Clear cleanup interval
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }

      // Destroy all active sessions
      const sessionIds = Array.from(this.sessions.keys());
      for (const sessionId of sessionIds) {
        try {
          await this.destroySession(sessionId);
        } catch (error) {
          logger.error(`Error destroying session ${sessionId} during shutdown:`, error);
        }
      }

      logger.info('SessionManager shutdown complete');
    } catch (error) {
      logger.error('Error during SessionManager shutdown:', error);
    }
  }

  /**
   * Force cleanup old Chrome processes
   */
  async forceCleanupChromeProcesses() {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);

      logger.info('Starting Chrome process cleanup...');

      if (process.platform === 'darwin') {
        try {
          // Kill all Chrome processes with user-data-dir containing .wwebjs_auth
          await execAsync(`pkill -f "user-data-dir.*\\.wwebjs_auth"`);
          logger.info('Killed Chrome processes with wwebjs_auth user-data-dir');
        } catch (error) {
          // Ignore if no processes found
        }

        try {
          // Also try to kill any remaining Chrome processes that might be stuck
          await execAsync(`pkill -f "Google Chrome.*--no-sandbox"`);
          logger.info('Killed remaining Chrome processes with no-sandbox flag');
        } catch (error) {
          // Ignore if no processes found
        }

        // Wait a moment for processes to fully terminate
        await new Promise(resolve => setTimeout(resolve, 2000));

        logger.info('Chrome process cleanup completed');
      }
    } catch (error) {
      logger.warn('Could not cleanup Chrome processes:', error.message);
    }
  }
}

module.exports = new SessionManager();