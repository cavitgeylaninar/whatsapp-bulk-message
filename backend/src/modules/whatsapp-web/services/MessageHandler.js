const SessionManager = require('./SessionManager');
const logger = require('../../../utils/logger');
const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs').promises;
const path = require('path');

class MessageHandler {
  constructor() {
    this.messageQueue = new Map();
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for incoming messages
   */
  setupEventListeners() {
    SessionManager.on('message', async ({ sessionId, message }) => {
      await this.handleIncomingMessage(sessionId, message);
    });

    SessionManager.on('message_ack', async ({ sessionId, message, ack }) => {
      await this.handleMessageAck(sessionId, message, ack);
    });
  }

  /**
   * Send text message
   * @param {string} sessionId
   * @param {string} phoneNumber - Format: 905551234567
   * @param {string} text
   * @param {object} options
   */
  async sendTextMessage(sessionId, phoneNumber, text, options = {}) {
    try {
      const client = SessionManager.getClient(sessionId);
      if (!client) {
        throw new Error(`Session ${sessionId} not found or not ready`);
      }

      // Format phone number (add @c.us for individual, @g.us for group)
      const chatId = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;

      // Send message
      const result = await client.sendMessage(chatId, text, options);

      logger.info(`Message sent from session ${sessionId} to ${phoneNumber}`);

      return {
        success: true,
        messageId: result.id.id,
        timestamp: result.timestamp,
        to: phoneNumber
      };
    } catch (error) {
      logger.error(`Error sending message from session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Send media message
   * @param {string} sessionId
   * @param {string} phoneNumber
   * @param {string} mediaPath - File path or URL
   * @param {string} caption
   * @param {object} options
   */
  async sendMediaMessage(sessionId, phoneNumber, mediaPath, caption = '', options = {}) {
    try {
      const client = SessionManager.getClient(sessionId);
      if (!client) {
        throw new Error(`Session ${sessionId} not found or not ready`);
      }

      const chatId = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;

      let media;

      // Check if it's a URL or local file
      if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
        // Download from URL
        media = await MessageMedia.fromUrl(mediaPath);
      } else {
        // Load from local file
        const fileBuffer = await fs.readFile(mediaPath);
        const mimeType = this.getMimeType(mediaPath);
        const filename = path.basename(mediaPath);
        const base64 = fileBuffer.toString('base64');

        media = new MessageMedia(mimeType, base64, filename);
      }

      // Send media message
      const result = await client.sendMessage(chatId, media, {
        caption,
        ...options
      });

      logger.info(`Media message sent from session ${sessionId} to ${phoneNumber}`);

      return {
        success: true,
        messageId: result.id.id,
        timestamp: result.timestamp,
        to: phoneNumber,
        mediaType: media.mimetype
      };
    } catch (error) {
      logger.error(`Error sending media from session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Send message to multiple recipients
   * @param {string} sessionId
   * @param {array} recipients - Array of phone numbers
   * @param {string} text
   * @param {object} options
   * @param {array} personalizedMessages - Array of {recipient, message} objects
   */
  async sendBulkMessages(sessionId, recipients, text, options = {}, personalizedMessages = null) {
    const results = [];

    // Calculate delay based on options
    let getDelay = () => {
      if (options.randomDelay && options.minDelay && options.maxDelay) {
        // Random delay between min and max
        return Math.floor(Math.random() * (options.maxDelay - options.minDelay + 1) + options.minDelay);
      }
      return options.delay || 2000; // Default 2 seconds
    };

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      try {
        // Use personalized message if available, otherwise use default text
        let messageText = text;
        if (personalizedMessages && personalizedMessages.length > 0) {
          // Find the personalized message for this recipient
          const personalizedMsg = personalizedMessages.find(pm => pm.recipient === recipient);
          if (personalizedMsg) {
            messageText = personalizedMsg.message;
            console.log(`Using personalized message for ${recipient}: ${messageText}`);
          }
        }

        const result = await this.sendTextMessage(sessionId, recipient, messageText, options);
        results.push({
          recipient,
          ...result
        });

        // Add delay between messages to avoid rate limiting
        const currentDelay = getDelay();
        if (currentDelay > 0 && i < recipients.length - 1) { // Don't delay after last message
          console.log(`Waiting ${currentDelay}ms before next message...`);
          await new Promise(resolve => setTimeout(resolve, currentDelay));
        }
      } catch (error) {
        results.push({
          recipient,
          success: false,
          error: error.message
        });
      }
    }

    return {
      total: recipients.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Reply to a message
   * @param {string} sessionId
   * @param {string} messageId
   * @param {string} text
   */
  async replyToMessage(sessionId, messageId, text) {
    try {
      const client = SessionManager.getClient(sessionId);
      if (!client) {
        throw new Error(`Session ${sessionId} not found or not ready`);
      }

      const messages = await client.searchMessages(messageId);
      if (messages.length === 0) {
        throw new Error('Message not found');
      }

      const message = messages[0];
      const result = await message.reply(text);

      logger.info(`Reply sent from session ${sessionId} to message ${messageId}`);

      return {
        success: true,
        messageId: result.id.id,
        timestamp: result.timestamp
      };
    } catch (error) {
      logger.error(`Error replying to message from session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Forward message
   * @param {string} sessionId
   * @param {string} messageId
   * @param {string} phoneNumber
   */
  async forwardMessage(sessionId, messageId, phoneNumber) {
    try {
      const client = SessionManager.getClient(sessionId);
      if (!client) {
        throw new Error(`Session ${sessionId} not found or not ready`);
      }

      const chatId = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;

      const messages = await client.searchMessages(messageId);
      if (messages.length === 0) {
        throw new Error('Message not found');
      }

      const message = messages[0];
      const result = await message.forward(chatId);

      logger.info(`Message forwarded from session ${sessionId} to ${phoneNumber}`);

      return {
        success: true,
        messageId: result.id.id,
        timestamp: result.timestamp,
        to: phoneNumber
      };
    } catch (error) {
      logger.error(`Error forwarding message from session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get chat history
   * @param {string} sessionId
   * @param {string} phoneNumber
   * @param {number} limit
   */
  async getChatHistory(sessionId, phoneNumber, limit = 50) {
    try {
      const client = SessionManager.getClient(sessionId);
      if (!client) {
        throw new Error(`Session ${sessionId} not found or not ready`);
      }

      if (!phoneNumber) {
        throw new Error('Phone number is required');
      }
      const chatId = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
      const chat = await client.getChatById(chatId);
      const messages = await chat.fetchMessages({ limit });

      return messages.map(msg => ({
        id: msg.id.id,
        body: msg.body,
        from: msg.from,
        to: msg.to,
        timestamp: msg.timestamp,
        type: msg.type,
        isForwarded: msg.isForwarded,
        hasMedia: msg.hasMedia,
        fromMe: msg.fromMe,
        ack: msg.ack,
        author: msg.author
      }));
    } catch (error) {
      logger.error(`Error fetching chat history from session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Search messages
   * @param {string} sessionId
   * @param {string} query
   * @param {object} options
   */
  async searchMessages(sessionId, query, options = {}) {
    try {
      const client = SessionManager.getClient(sessionId);
      if (!client) {
        throw new Error(`Session ${sessionId} not found or not ready`);
      }

      const chats = await client.getChats();
      const results = [];
      const limit = options.limit || 100;

      for (const chat of chats) {
        const messages = await chat.fetchMessages({ limit });
        const found = messages.filter(m =>
          m.body && m.body.toLowerCase().includes(query.toLowerCase())
        );

        if (found.length > 0) {
          results.push({
            chatId: chat.id._serialized,
            chatName: chat.name,
            messages: found.map(msg => ({
              id: msg.id.id,
              body: msg.body,
              timestamp: msg.timestamp,
              from: msg.from
            }))
          });
        }
      }

      return results;
    } catch (error) {
      logger.error(`Error searching messages in session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Handle incoming message
   * @param {string} sessionId
   * @param {object} message
   */
  async handleIncomingMessage(sessionId, message) {
    try {
      const messageData = {
        sessionId,
        id: message.id.id,
        from: message.from,
        to: message.to,
        body: message.body,
        timestamp: message.timestamp,
        type: message.type,
        isForwarded: message.isForwarded,
        hasMedia: message.hasMedia,
        fromMe: message.fromMe,
        author: message.author
      };

      // Get contact info
      const contact = await message.getContact();
      messageData.contact = {
        id: contact.id._serialized,
        name: contact.name || contact.pushname,
        number: contact.number,
        isMyContact: contact.isMyContact
      };

      // Get chat info
      const chat = await message.getChat();
      messageData.chat = {
        id: chat.id._serialized,
        name: chat.name,
        isGroup: chat.isGroup,
        unreadCount: chat.unreadCount
      };

      // Download media if exists
      if (message.hasMedia) {
        try {
          const media = await message.downloadMedia();
          messageData.media = {
            mimetype: media.mimetype,
            filename: media.filename,
            filesize: media.filesize,
            data: media.data.substring(0, 100) + '...' // Truncate for logging
          };
        } catch (error) {
          logger.warn(`Could not download media for message ${message.id.id}`);
        }
      }

      // Emit event for real-time processing
      process.nextTick(() => {
        SessionManager.emit('processed_message', messageData);
      });

      logger.debug(`Incoming message processed from session ${sessionId}`);

      return messageData;
    } catch (error) {
      logger.error(`Error handling incoming message:`, error);
    }
  }

  /**
   * Handle message acknowledgment
   * @param {string} sessionId
   * @param {object} message
   * @param {number} ack
   */
  async handleMessageAck(sessionId, message, ack) {
    const ackStatus = {
      0: 'CLOCK',
      1: 'SENT',
      2: 'RECEIVED',
      3: 'READ',
      4: 'PLAYED'
    };

    const ackData = {
      sessionId,
      messageId: message.id.id,
      ack: ack,
      status: ackStatus[ack] || 'UNKNOWN',
      timestamp: new Date()
    };

    // Emit event for real-time updates
    process.nextTick(() => {
      SessionManager.emit('message_status_update', ackData);
    });

    logger.debug(`Message ${message.id.id} status: ${ackStatus[ack]}`);
  }

  /**
   * Get MIME type from file extension
   * @param {string} filePath
   */
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mp3',
      '.wav': 'audio/wav',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Delete message
   * @param {string} sessionId
   * @param {string} messageId
   * @param {boolean} everyone
   */
  async deleteMessage(sessionId, messageId, everyone = false) {
    try {
      const client = SessionManager.getClient(sessionId);
      if (!client) {
        throw new Error(`Session ${sessionId} not found or not ready`);
      }

      const messages = await client.searchMessages(messageId);
      if (messages.length === 0) {
        throw new Error('Message not found');
      }

      const message = messages[0];
      const result = await message.delete(everyone);

      logger.info(`Message ${messageId} deleted from session ${sessionId}`);

      return {
        success: true,
        messageId: messageId,
        deletedForEveryone: everyone
      };
    } catch (error) {
      logger.error(`Error deleting message from session ${sessionId}:`, error);
      throw error;
    }
  }
}

module.exports = new MessageHandler();