const logger = require('../utils/logger');

// Büyük payload'ları işlemek için özel middleware
const largePayloadHandler = {
  // Payload boyutunu kontrol et ve logla
  checkPayloadSize: (req, res, next) => {
    const contentLength = req.headers['content-length'];
    
    if (contentLength) {
      const sizeInMB = (parseInt(contentLength) / 1024 / 1024).toFixed(2);
      
      // 10MB'dan büyük payload'ları logla
      if (sizeInMB > 10) {
        logger.info(`Large payload received: ${sizeInMB}MB from ${req.ip}`);
      }
      
      // Request'e boyut bilgisini ekle
      req.payloadSize = sizeInMB;
    }
    
    next();
  },

  // Büyük webhook'ları optimize et
  optimizeLargeWebhook: (req, res, next) => {
    // Webhook endpoint'i için özel işlem
    if (req.path.includes('/webhook')) {
      // Büyük webhook'lar için timeout'u artır
      req.setTimeout(300000); // 5 dakika
      
      // Response compression'ı zorla
      res.set('Content-Encoding', 'gzip');
    }
    
    next();
  },

  // Batch processing için payload'ı böl
  splitLargePayload: (req, res, next) => {
    if (req.body && req.body.entry) {
      const entries = req.body.entry;
      
      // Eğer çok fazla entry varsa
      if (entries.length > 100) {
        logger.info(`Large webhook batch: ${entries.length} entries`);
        
        // Batch processing flag'i ekle
        req.isLargeBatch = true;
        req.batchSize = entries.length;
      }
      
      // Mesaj sayısını hesapla
      let totalMessages = 0;
      entries.forEach(entry => {
        if (entry.changes) {
          entry.changes.forEach(change => {
            if (change.value && change.value.messages) {
              totalMessages += change.value.messages.length;
            }
          });
        }
      });
      
      if (totalMessages > 1000) {
        logger.warn(`Very large message batch: ${totalMessages} messages`);
        req.totalMessages = totalMessages;
      }
    }
    
    next();
  },

  // Error handler for payload too large
  handlePayloadError: (err, req, res, next) => {
    if (err.type === 'entity.too.large') {
      logger.error(`Payload too large error: ${err.message}`);
      
      return res.status(413).json({
        error: 'Payload too large',
        message: 'Request entity too large. Maximum size is 100MB.',
        maxSize: '100MB',
        recommendation: 'Please split your request into smaller batches'
      });
    }
    
    next(err);
  },

  // Stream büyük payload'ları
  streamLargePayload: async (req, res, next) => {
    // Eğer çok büyük bir payload ise ve streaming destekleniyorsa
    if (req.payloadSize && parseFloat(req.payloadSize) > 50) {
      logger.info('Streaming large payload...');
      
      // Streaming flag'i ekle
      req.useStreaming = true;
    }
    
    next();
  }
};

// Büyük ölçek için optimize edilmiş limiter
const scalableLimiter = {
  // Dinamik rate limiting - payload boyutuna göre
  dynamicLimit: (req, res, next) => {
    const baseLimit = 10000; // Temel limit
    let adjustedLimit = baseLimit;
    
    // Büyük payload'lar için limiti azalt
    if (req.payloadSize) {
      const size = parseFloat(req.payloadSize);
      if (size > 10) {
        adjustedLimit = Math.max(100, baseLimit / (size / 10));
      }
    }
    
    req.rateLimit = adjustedLimit;
    next();
  },

  // Batch processing önceliği
  prioritizeBatch: (req, res, next) => {
    if (req.isLargeBatch) {
      // Büyük batch'lere öncelik ver
      req.priority = 'high';
      
      // Response header'ına ekle
      res.set('X-Batch-Priority', 'high');
      res.set('X-Batch-Size', req.batchSize);
    }
    
    next();
  }
};

module.exports = {
  ...largePayloadHandler,
  ...scalableLimiter
};