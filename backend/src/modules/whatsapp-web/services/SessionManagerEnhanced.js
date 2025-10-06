const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../../utils/logger');
const EventEmitter = require('events');

class SessionManagerEnhanced extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.sessionPath = path.join(__dirname, '../../../../.wwebjs_auth');
    this.keepAliveIntervals = new Map();
    this.reconnectAttempts = new Map();
    this.healthCheckIntervals = new Map();

    // Configuration
    this.config = {
      maxReconnectAttempts: 5,
      reconnectDelay: 5000,
      keepAliveInterval: 30000,
      healthCheckInterval: 60000,
      sessionTimeout: 60 * 60 * 1000, // 60 minutes
      cleanupInterval: 30 * 60 * 1000, // 30 minutes
      memoryCleanupInterval: 15 * 60 * 1000 // 15 minutes
    };

    // Auto cleanup inactive sessions
    this.cleanupInterval = setInterval(() => {
      this.cleanInactiveSessions();
    }, this.config.cleanupInterval);

    // Memory optimization cleanup
    this.memoryCleanupInterval = setInterval(() => {
      this.performMemoryCleanup();
    }, this.config.memoryCleanupInterval);

    // Graceful shutdown handler
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  /**
   * Create new WhatsApp session with enhanced stability
   */
  async createSession(sessionId, options = {}) {
    try {
      if (this.sessions.has(sessionId)) {
        const existingSession = this.sessions.get(sessionId);

        // Check if existing session is healthy
        if (await this.isSessionHealthy(sessionId)) {
          logger.info(`Reusing existing healthy session: ${sessionId}`);
          return existingSession;
        } else {
          // Destroy unhealthy session before creating new one
          logger.warn(`Destroying unhealthy session before recreating: ${sessionId}`);
          await this.destroySession(sessionId);
        }
      }

      logger.info(`Creating enhanced WhatsApp session: ${sessionId}`);

      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: sessionId,
          dataPath: this.sessionPath
        }),
        puppeteer: {
          headless: 'new',
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
            // Memory optimization flags
            '--memory-pressure-off',
            '--max_old_space_size=2048', // Reduced from 4096
            '--single-process',
            '--disable-web-security',
            '--disable-features=site-per-process',
            '--disable-blink-features=AutomationControlled'
          ],
          ...(process.platform === 'darwin' ? {
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
          } : {}),
          timeout: 60000,
          protocolTimeout: 180000,
          slowMo: 0,
          devtools: false,
          // Memory optimization
          handleSIGTERM: true,
          handleSIGINT: true,
          handleSIGHUP: true
        },
        ...options
      });

      // Setup enhanced event handlers
      this.setupEnhancedClientEvents(client, sessionId);

      // Store session with enhanced metadata
      this.sessions.set(sessionId, {
        client,
        status: 'INITIALIZING',
        qr: null,
        info: null,
        userId: options.userId || null,
        createdAt: new Date(),
        lastActivity: new Date(),
        reconnectCount: 0,
        healthScore: 100,
        metrics: {
          messagesSent: 0,
          messagesReceived: 0,
          errors: 0,
          lastError: null
        }
      });

      // Reset reconnect attempts
      this.reconnectAttempts.set(sessionId, 0);

      // Initialize client with timeout
      await this.initializeWithTimeout(client, sessionId);

      return this.sessions.get(sessionId);
    } catch (error) {
      logger.error(`Error creating enhanced session ${sessionId}:`, error);
      this.handleSessionError(sessionId, error);
      throw error;
    }
  }

  /**
   * Initialize client with timeout
   */
  async initializeWithTimeout(client, sessionId, timeout = 120000) {
    return Promise.race([
      client.initialize(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Session initialization timeout')), timeout)
      )
    ]);
  }

  /**
   * Setup enhanced client event handlers
   */
  setupEnhancedClientEvents(client, sessionId) {
    // QR Code generation with retry logic
    client.on('qr', async (qr) => {
      logger.info(`QR Code generated for session ${sessionId}`);
      try {
        const qrDataUrl = await qrcode.toDataURL(qr);
        const session = this.sessions.get(sessionId);
        if (session) {
          session.qr = qrDataUrl;
          session.status = 'QR_CODE';
          session.healthScore = 50; // QR means not authenticated
        }
        this.emit('qr', { sessionId, qr: qrDataUrl });
      } catch (error) {
        logger.error(`Error generating QR code for ${sessionId}:`, error);
      }
    });

    // Authentication success
    client.on('authenticated', () => {
      logger.info(`Session ${sessionId} authenticated`);
      const session = this.sessions.get(sessionId);
      if (session) {
        session.status = 'AUTHENTICATED';
        session.qr = null;
        session.healthScore = 75;
        session.reconnectCount = 0; // Reset on successful auth
      }
      this.reconnectAttempts.set(sessionId, 0);
      this.emit('authenticated', { sessionId });
    });

    // Ready state
    client.on('ready', async () => {
      logger.info(`Session ${sessionId} ready`);

      try {
        const info = client.info;
        const session = this.sessions.get(sessionId);
        if (session) {
          session.status = 'READY';
          session.healthScore = 100;
          session.info = {
            id: info.wid._serialized,
            pushname: info.pushname,
            platform: info.platform,
            phone: info.wid.user
          };
        }

        this.emit('ready', { sessionId, info, userId: session?.userId });

        // Start enhanced monitoring
        this.startHealthCheck(sessionId);
        this.startKeepAlive(sessionId);
      } catch (error) {
        logger.error(`Error in ready handler for ${sessionId}:`, error);
      }
    });

    // Enhanced disconnection handler
    client.on('disconnected', async (reason) => {
      logger.warn(`Session ${sessionId} disconnected: ${reason}`);

      this.stopKeepAlive(sessionId);
      this.stopHealthCheck(sessionId);

      const session = this.sessions.get(sessionId);
      if (session) {
        session.status = 'DISCONNECTED';
        session.healthScore = 0;

        // Auto-reconnect logic
        if (reason !== 'LOGOUT' && this.shouldReconnect(sessionId)) {
          await this.attemptReconnect(sessionId, client);
        } else if (reason === 'LOGOUT') {
          // Clean logout, remove session
          await this.destroySession(sessionId);
        }
      }

      this.emit('disconnected', { sessionId, reason });
    });

    // Authentication failure with retry
    client.on('auth_failure', async (message) => {
      logger.error(`Session ${sessionId} auth failure: ${message}`);
      const session = this.sessions.get(sessionId);
      if (session) {
        session.status = 'AUTH_FAILURE';
        session.healthScore = 0;
        session.metrics.errors++;
        session.metrics.lastError = message;
      }

      // Try to clear auth and restart
      if (this.shouldReconnect(sessionId)) {
        await this.clearAuthAndRestart(sessionId);
      }

      this.emit('auth_failure', { sessionId, message });
    });

    // Message handling with metrics
    client.on('message', async (message) => {
      const session = this.sessions.get(sessionId);
      if (session) {
        session.lastActivity = new Date();
        session.metrics.messagesReceived++;
      }
      this.emit('message', { sessionId, message });
    });

    // Message acknowledgment
    client.on('message_ack', (message, ack) => {
      const session = this.sessions.get(sessionId);
      if (session && ack === 1) { // 1 = sent
        session.metrics.messagesSent++;
      }
      this.emit('message_ack', { sessionId, message, ack });
    });

    // Error handling
    client.on('error', (error) => {
      logger.error(`Session ${sessionId} error:`, error);
      this.handleSessionError(sessionId, error);
    });
  }

  /**
   * Check if session should reconnect
   */
  shouldReconnect(sessionId) {
    const attempts = this.reconnectAttempts.get(sessionId) || 0;
    return attempts < this.config.maxReconnectAttempts;
  }

  /**
   * Attempt to reconnect session
   */
  async attemptReconnect(sessionId, client) {
    const attempts = this.reconnectAttempts.get(sessionId) || 0;
    this.reconnectAttempts.set(sessionId, attempts + 1);

    const delay = this.config.reconnectDelay * Math.pow(2, attempts); // Exponential backoff

    logger.info(`Attempting reconnect ${attempts + 1}/${this.config.maxReconnectAttempts} for session ${sessionId} after ${delay}ms`);

    setTimeout(async () => {
      try {
        const session = this.sessions.get(sessionId);
        if (session) {
          session.status = 'RECONNECTING';
          session.reconnectCount++;
        }

        await this.initializeWithTimeout(client, sessionId);
      } catch (error) {
        logger.error(`Reconnect attempt ${attempts + 1} failed for ${sessionId}:`, error.message);

        if (attempts + 1 >= this.config.maxReconnectAttempts) {
          logger.error(`Max reconnect attempts reached for ${sessionId}, destroying session`);
          await this.destroySession(sessionId);
        }
      }
    }, delay);
  }

  /**
   * Clear authentication and restart session
   */
  async clearAuthAndRestart(sessionId) {
    try {
      logger.info(`Clearing auth and restarting session ${sessionId}`);

      // Destroy current session
      await this.destroySession(sessionId);

      // Clear auth files
      const authPath = path.join(this.sessionPath, `session-${sessionId}`);
      try {
        await fs.rmdir(authPath, { recursive: true });
      } catch (error) {
        logger.warn(`Could not clear auth files for ${sessionId}:`, error.message);
      }

      // Wait before creating new session
      setTimeout(async () => {
        try {
          await this.createSession(sessionId);
        } catch (error) {
          logger.error(`Failed to restart session ${sessionId}:`, error);
        }
      }, 5000);
    } catch (error) {
      logger.error(`Error clearing auth for ${sessionId}:`, error);
    }
  }

  /**
   * Start health check for session
   */
  startHealthCheck(sessionId) {
    this.stopHealthCheck(sessionId);

    const interval = setInterval(async () => {
      try {
        const health = await this.checkSessionHealth(sessionId);
        const session = this.sessions.get(sessionId);

        if (session) {
          session.healthScore = health.score;

          if (health.score < 50 && session.status === 'READY') {
            logger.warn(`Session ${sessionId} health degraded: ${health.score}`);

            // Try to recover
            if (health.issues.includes('NOT_CONNECTED')) {
              await this.attemptReconnect(sessionId, session.client);
            }
          }
        }
      } catch (error) {
        logger.error(`Health check failed for ${sessionId}:`, error.message);
      }
    }, this.config.healthCheckInterval);

    this.healthCheckIntervals.set(sessionId, interval);
  }

  /**
   * Stop health check for session
   */
  stopHealthCheck(sessionId) {
    const interval = this.healthCheckIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(sessionId);
    }
  }

  /**
   * Check session health
   */
  async checkSessionHealth(sessionId) {
    const session = this.sessions.get(sessionId);
    const client = this.getClient(sessionId);
    const health = { score: 0, issues: [] };

    if (!session || !client) {
      health.issues.push('NO_SESSION');
      return health;
    }

    // Check connection state
    try {
      const state = await client.getState();
      if (state === 'CONNECTED') {
        health.score += 50;
      } else {
        health.issues.push('NOT_CONNECTED');
      }
    } catch (error) {
      health.issues.push('STATE_CHECK_FAILED');
    }

    // Check session status
    if (session.status === 'READY') {
      health.score += 25;
    } else {
      health.issues.push(`STATUS_${session.status}`);
    }

    // Check activity
    const inactiveTime = Date.now() - session.lastActivity.getTime();
    if (inactiveTime < this.config.sessionTimeout) {
      health.score += 15;
    } else {
      health.issues.push('INACTIVE');
    }

    // Check error rate
    if (session.metrics.errors < 5) {
      health.score += 10;
    } else {
      health.issues.push('HIGH_ERROR_RATE');
    }

    return health;
  }

  /**
   * Check if session is healthy
   */
  async isSessionHealthy(sessionId) {
    const health = await this.checkSessionHealth(sessionId);
    return health.score >= 75;
  }

  /**
   * Enhanced keep-alive mechanism
   */
  startKeepAlive(sessionId) {
    this.stopKeepAlive(sessionId);

    const client = this.getClient(sessionId);
    if (!client) return;

    const interval = setInterval(async () => {
      try {
        const session = this.sessions.get(sessionId);
        if (session && session.status === 'READY') {
          session.lastActivity = new Date();

          // Check connection state
          const state = await client.getState();
          if (state === 'CONNECTED') {
            // Send keep-alive ping
            await client.pupPage.evaluate(() => {
              return true; // Simple page evaluation to keep connection alive
            });
          } else {
            logger.warn(`Session ${sessionId} not connected during keep-alive, state: ${state}`);

            // Try to recover connection
            if (this.shouldReconnect(sessionId)) {
              await this.attemptReconnect(sessionId, client);
            }
          }
        } else {
          this.stopKeepAlive(sessionId);
        }
      } catch (error) {
        logger.warn(`Keep-alive failed for ${sessionId}:`, error.message);
        this.handleSessionError(sessionId, error);
      }
    }, this.config.keepAliveInterval);

    this.keepAliveIntervals.set(sessionId, interval);
    logger.info(`Enhanced keep-alive started for session ${sessionId}`);
  }

  /**
   * Stop keep-alive mechanism
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
   * Handle session errors
   */
  handleSessionError(sessionId, error) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.metrics.errors++;
      session.metrics.lastError = error.message;
      session.healthScore = Math.max(0, session.healthScore - 10);

      // Log error with context
      logger.error(`Session ${sessionId} error:`, {
        message: error.message,
        status: session.status,
        healthScore: session.healthScore,
        errorCount: session.metrics.errors
      });
    }
  }

  /**
   * Perform memory cleanup
   */
  async performMemoryCleanup() {
    try {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        logger.info('Manual garbage collection performed');
      }

      // Clean up inactive sessions
      for (const [sessionId, session] of this.sessions.entries()) {
        const inactiveTime = Date.now() - session.lastActivity.getTime();

        if (inactiveTime > this.config.sessionTimeout && session.status !== 'READY') {
          logger.info(`Cleaning up inactive session ${sessionId}`);
          await this.destroySession(sessionId);
        }
      }

      // Log memory usage
      const memUsage = process.memoryUsage();
      logger.info('Memory usage:', {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
      });
    } catch (error) {
      logger.error('Error during memory cleanup:', error);
    }
  }

  /**
   * Clean inactive sessions
   */
  async cleanInactiveSessions() {
    const now = Date.now();
    const sessionsToClean = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const inactiveTime = now - session.lastActivity.getTime();

      if (inactiveTime > this.config.sessionTimeout) {
        sessionsToClean.push(sessionId);
      }
    }

    for (const sessionId of sessionsToClean) {
      logger.info(`Cleaning up inactive session ${sessionId}`);
      await this.destroySession(sessionId);
    }

    if (sessionsToClean.length > 0) {
      logger.info(`Cleaned up ${sessionsToClean.length} inactive sessions`);
    }
  }

  /**
   * Destroy session
   */
  async destroySession(sessionId) {
    try {
      logger.info(`Destroying session ${sessionId}`);

      // Stop all monitors
      this.stopKeepAlive(sessionId);
      this.stopHealthCheck(sessionId);

      // Get client and logout
      const client = this.getClient(sessionId);
      if (client) {
        try {
          await client.logout();
        } catch (error) {
          logger.warn(`Error logging out session ${sessionId}:`, error.message);
        }

        try {
          await client.destroy();
        } catch (error) {
          logger.warn(`Error destroying client ${sessionId}:`, error.message);
        }
      }

      // Remove from sessions
      this.sessions.delete(sessionId);
      this.reconnectAttempts.delete(sessionId);

      this.emit('session-destroyed', { sessionId });
      logger.info(`Session ${sessionId} destroyed successfully`);
    } catch (error) {
      logger.error(`Error destroying session ${sessionId}:`, error);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info('Shutting down SessionManager...');

    // Clear all intervals
    clearInterval(this.cleanupInterval);
    clearInterval(this.memoryCleanupInterval);

    // Destroy all sessions
    const destroyPromises = [];
    for (const sessionId of this.sessions.keys()) {
      destroyPromises.push(this.destroySession(sessionId));
    }

    await Promise.allSettled(destroyPromises);

    logger.info('SessionManager shutdown complete');
    process.exit(0);
  }

  // Existing methods remain the same
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  getAllSessions() {
    const sessionsArray = [];
    this.sessions.forEach((session, id) => {
      sessionsArray.push({
        id,
        status: session.status,
        info: session.info,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        healthScore: session.healthScore,
        metrics: session.metrics,
        reconnectCount: session.reconnectCount
      });
    });
    return sessionsArray;
  }

  getClient(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? session.client : null;
  }

  isSessionReady(sessionId) {
    const session = this.sessions.get(sessionId);
    return session && session.status === 'READY' && session.healthScore >= 75;
  }

  /**
   * Get session metrics
   */
  getSessionMetrics(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      status: session.status,
      healthScore: session.healthScore,
      uptime: Date.now() - session.createdAt.getTime(),
      lastActivity: session.lastActivity,
      metrics: session.metrics,
      reconnectCount: session.reconnectCount
    };
  }
}

module.exports = SessionManagerEnhanced;