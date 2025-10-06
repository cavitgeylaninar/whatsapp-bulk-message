const SessionManager = require('./SessionManager');
const logger = require('../../../utils/logger');

class SocketHandler {
  constructor() {
    this.io = null;
    this.setupEventListeners();
  }

  /**
   * Initialize Socket.io
   * @param {object} io - Socket.io instance
   */
  initialize(io) {
    this.io = io;
    logger.info('WhatsApp Web Socket Handler initialized');

    // Setup socket connections
    io.on('connection', (socket) => {
      logger.info(`New socket connection: ${socket.id}`);
      logger.info(`Socket auth data: ${JSON.stringify(socket.handshake.auth)}`);

      // Join session room
      socket.on('join-session', (sessionId) => {
        socket.join(`whatsapp-${sessionId}`);
        logger.info(`Socket ${socket.id} joined session ${sessionId}`);
      });

      // Leave session room
      socket.on('leave-session', (sessionId) => {
        socket.leave(`whatsapp-${sessionId}`);
        logger.info(`Socket ${socket.id} left session ${sessionId}`);
      });

      // Request session status
      socket.on('get-session-status', (sessionId) => {
        const status = SessionManager.getSessionStatus(sessionId);
        socket.emit('session-status', { sessionId, ...status });
      });

      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Setup event listeners for SessionManager events
   */
  setupEventListeners() {
    // QR Code generated
    SessionManager.on('qr', ({ sessionId, qr }) => {
      if (this.io) {
        this.io.to(`whatsapp-${sessionId}`).emit('qr-code', {
          sessionId,
          qr,
          timestamp: new Date()
        });

        // Broadcast to admin room
        this.io.to('admin').emit('session-qr', { sessionId, qr });
      }
    });

    // Session authenticated
    SessionManager.on('authenticated', ({ sessionId }) => {
      logger.info(`Emitting authenticated event for session ${sessionId}`);
      if (this.io) {
        const data = {
          sessionId,
          timestamp: new Date()
        };

        // Emit to session-specific room
        this.io.to(`whatsapp-${sessionId}`).emit('authenticated', data);
        logger.info(`Emitted to room whatsapp-${sessionId}: authenticated`);

        // Also broadcast to all sockets for debugging
        this.io.emit('authenticated', data);
        logger.info(`Broadcast to all sockets: authenticated`);
      }
    });

    // Session ready
    SessionManager.on('ready', ({ sessionId, info }) => {
      logger.info(`Emitting ready event for session ${sessionId}`);
      if (this.io) {
        const data = {
          sessionId,
          info,
          timestamp: new Date()
        };

        // Emit to session-specific room
        this.io.to(`whatsapp-${sessionId}`).emit('ready', data);
        logger.info(`Emitted to room whatsapp-${sessionId}: ready`);

        // Also broadcast to all sockets for debugging
        this.io.emit('ready', data);
        logger.info(`Broadcast to all sockets: ready`);

        // Broadcast to admin room
        this.io.to('admin').emit('session-ready', { sessionId, info });
      }
    });

    // Session disconnected
    SessionManager.on('disconnected', ({ sessionId, reason }) => {
      if (this.io) {
        this.io.to(`whatsapp-${sessionId}`).emit('disconnected', {
          sessionId,
          reason,
          timestamp: new Date()
        });

        // Broadcast to admin room
        this.io.to('admin').emit('session-disconnected', { sessionId, reason });
      }
    });

    // Auth failure
    SessionManager.on('auth_failure', ({ sessionId, message }) => {
      if (this.io) {
        this.io.to(`whatsapp-${sessionId}`).emit('auth-failure', {
          sessionId,
          message,
          timestamp: new Date()
        });
      }
    });

    // New message received
    SessionManager.on('processed_message', (messageData) => {
      if (this.io) {
        // Emit to session room
        this.io.to(`whatsapp-${messageData.sessionId}`).emit('new-message', messageData);

        // Emit to specific user room if authenticated
        if (messageData.userId) {
          this.io.to(`user-${messageData.userId}`).emit('whatsapp-message', messageData);
        }

        // Emit to admin room
        this.io.to('admin').emit('message-received', messageData);
      }
    });

    // Message status update
    SessionManager.on('message_status_update', (statusData) => {
      if (this.io) {
        this.io.to(`whatsapp-${statusData.sessionId}`).emit('message-status', statusData);
      }
    });

    // Contact update
    SessionManager.on('contact_update', (contactData) => {
      if (this.io) {
        this.io.to(`whatsapp-${contactData.sessionId}`).emit('contact-update', contactData);
      }
    });

    // Group events
    SessionManager.on('group_join', ({ sessionId, notification }) => {
      if (this.io) {
        this.io.to(`whatsapp-${sessionId}`).emit('group-join', {
          sessionId,
          notification,
          timestamp: new Date()
        });
      }
    });

    SessionManager.on('group_leave', ({ sessionId, notification }) => {
      if (this.io) {
        this.io.to(`whatsapp-${sessionId}`).emit('group-leave', {
          sessionId,
          notification,
          timestamp: new Date()
        });
      }
    });

    // Session destroyed
    SessionManager.on('session_destroyed', ({ sessionId }) => {
      if (this.io) {
        this.io.to(`whatsapp-${sessionId}`).emit('session-destroyed', {
          sessionId,
          timestamp: new Date()
        });

        // Clear room
        this.io.in(`whatsapp-${sessionId}`).socketsLeave(`whatsapp-${sessionId}`);
      }
    });
  }

  /**
   * Emit custom event to session room
   * @param {string} sessionId
   * @param {string} event
   * @param {object} data
   */
  emitToSession(sessionId, event, data) {
    if (this.io) {
      this.io.to(`whatsapp-${sessionId}`).emit(event, {
        sessionId,
        ...data,
        timestamp: new Date()
      });
    }
  }

  /**
   * Emit to specific user
   * @param {string} userId
   * @param {string} event
   * @param {object} data
   */
  emitToUser(userId, event, data) {
    if (this.io) {
      this.io.to(`user-${userId}`).emit(event, {
        ...data,
        timestamp: new Date()
      });
    }
  }

  /**
   * Broadcast to all connected clients
   * @param {string} event
   * @param {object} data
   */
  broadcast(event, data) {
    if (this.io) {
      this.io.emit(event, {
        ...data,
        timestamp: new Date()
      });
    }
  }

  /**
   * Get connected socket count for a session
   * @param {string} sessionId
   */
  async getSessionSocketCount(sessionId) {
    if (!this.io) return 0;

    const sockets = await this.io.in(`whatsapp-${sessionId}`).allSockets();
    return sockets.size;
  }

  /**
   * Send typing indicator
   * @param {string} sessionId
   * @param {string} chatId
   * @param {boolean} isTyping
   */
  sendTypingIndicator(sessionId, chatId, isTyping) {
    if (this.io) {
      this.io.to(`whatsapp-${sessionId}`).emit('typing-indicator', {
        sessionId,
        chatId,
        isTyping,
        timestamp: new Date()
      });
    }
  }

  /**
   * Send notification
   * @param {string} sessionId
   * @param {object} notification
   */
  sendNotification(sessionId, notification) {
    if (this.io) {
      this.io.to(`whatsapp-${sessionId}`).emit('notification', {
        sessionId,
        ...notification,
        timestamp: new Date()
      });
    }
  }
}

module.exports = new SocketHandler();