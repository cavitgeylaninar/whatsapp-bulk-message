const router = require('express').Router();
const whatsappWebController = require('../controllers/whatsappWebController');
const whatsappWebContactController = require('../controllers/whatsappWebContactController');
const { authenticate } = require('../../../middleware/auth');
const { validateRequest } = require('../../../middleware/validator');
const Joi = require('joi');

// Validation schemas
const schemas = {
  createSession: Joi.object({
    sessionId: Joi.string().optional()
  }),
  sendMessage: Joi.object({
    phoneNumber: Joi.string().required().pattern(/^\d{10,15}$/),
    message: Joi.string().required().max(4096),
    options: Joi.object().optional()
  }),
  sendMedia: Joi.object({
    phoneNumber: Joi.string().required().pattern(/^\d{10,15}$/),
    mediaUrl: Joi.string().required().uri(),
    caption: Joi.string().optional().max(1024),
    options: Joi.object().optional()
  }),
  sendBulk: Joi.object({
    recipients: Joi.array().items(Joi.string().pattern(/^\d{10,15}$/)).required().min(1).max(100),
    message: Joi.string().required().max(4096),
    personalizedMessages: Joi.array().items(Joi.object({
      recipient: Joi.string().pattern(/^\d{10,15}$/),
      message: Joi.string().max(4096)
    })).optional(),
    options: Joi.object({
      delay: Joi.number().min(1000).max(10000).optional(),
      minDelay: Joi.number().min(1000).max(60000).optional(),
      maxDelay: Joi.number().min(1000).max(60000).optional(),
      randomDelay: Joi.boolean().optional()
    }).optional()
  }),
  checkNumbers: Joi.object({
    phoneNumbers: Joi.array().items(Joi.string().pattern(/^\d{10,15}$/)).required().min(1).max(100)
  }),
  searchMessages: Joi.object({
    query: Joi.string().required().min(2).max(100),
    options: Joi.object({
      limit: Joi.number().min(10).max(100).optional()
    }).optional()
  })
};

// Test endpoint (no auth required for testing)
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'WhatsApp Web module is working' });
});

// Session Management
router.post('/session/create',
  authenticate,
  validateRequest(schemas.createSession),
  whatsappWebController.createSession
);

router.get('/session/:sessionId/status',
  authenticate,
  whatsappWebController.getSessionStatus
);

router.get('/sessions',
  authenticate,
  whatsappWebController.getAllSessions
);

router.delete('/session/:sessionId',
  authenticate,
  whatsappWebController.destroySession
);

// Messaging
router.post('/session/:sessionId/send/message',
  authenticate,
  validateRequest(schemas.sendMessage),
  whatsappWebController.sendMessage
);

router.post('/session/:sessionId/send/media',
  authenticate,
  validateRequest(schemas.sendMedia),
  whatsappWebController.sendMedia
);

router.post('/session/:sessionId/send/bulk',
  authenticate,
  validateRequest(schemas.sendBulk),
  whatsappWebController.sendBulkMessages
);

router.get('/session/:sessionId/messages/history',
  authenticate,
  whatsappWebController.getChatHistory
);

router.post('/session/:sessionId/messages/search',
  authenticate,
  validateRequest(schemas.searchMessages),
  whatsappWebController.searchMessages
);

router.delete('/session/:sessionId/message/:messageId',
  authenticate,
  whatsappWebController.deleteMessage
);

// Contacts
router.get('/contacts',
  authenticate,
  whatsappWebController.getAllContacts
);

router.get('/session/:sessionId/contacts',
  authenticate,
  whatsappWebController.getContacts
);

router.get('/session/:sessionId/contact/:phoneNumber',
  authenticate,
  whatsappWebController.getContact
);

router.post('/session/:sessionId/contacts/check',
  authenticate,
  validateRequest(schemas.checkNumbers),
  whatsappWebController.checkNumbers
);

router.post('/session/:sessionId/contacts/sync',
  authenticate,
  whatsappWebController.syncContacts
);

router.post('/session/:sessionId/contact/:phoneNumber/block',
  authenticate,
  whatsappWebController.blockContact
);

router.get('/session/:sessionId/contact/:phoneNumber/presence',
  authenticate,
  whatsappWebController.getPresence
);

// Chats & Groups
router.get('/session/:sessionId/chats',
  authenticate,
  whatsappWebController.getChats
);

router.get('/session/:sessionId/groups',
  authenticate,
  whatsappWebController.getGroups
);

// Cleanup endpoints
router.post('/contacts/cleanup',
  authenticate,
  whatsappWebController.cleanupDuplicates
);

router.get('/contacts/duplicates/stats',
  authenticate,
  whatsappWebController.getDuplicateStats
);

// WhatsApp Web Contacts Management
router.post('/web-contacts',
  authenticate,
  whatsappWebContactController.createWhatsAppWebContact
);

router.get('/web-contacts',
  authenticate,
  whatsappWebContactController.getWhatsAppWebContacts
);

router.get('/web-contacts/stats',
  authenticate,
  whatsappWebContactController.getWhatsAppWebContactStats
);

router.get('/web-contacts/:id',
  authenticate,
  whatsappWebContactController.getWhatsAppWebContact
);

router.patch('/web-contacts/:id',
  authenticate,
  whatsappWebContactController.updateWhatsAppWebContact
);

router.delete('/web-contacts/:id',
  authenticate,
  whatsappWebContactController.deleteWhatsAppWebContact
);

router.post('/web-contacts/bulk-delete',
  authenticate,
  whatsappWebContactController.bulkDeleteWhatsAppWebContacts
);

router.delete('/web-contacts/session/:sessionId/clear',
  authenticate,
  whatsappWebContactController.clearSessionContacts
);

module.exports = router;