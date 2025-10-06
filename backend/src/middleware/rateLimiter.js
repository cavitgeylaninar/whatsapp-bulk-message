const rateLimit = require('express-rate-limit');
const { rateLimiter } = require('../services/webhookQueue.service');
const logger = require('../utils/logger');

// Genel API rate limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 100, // Dakikada maksimum 100 istek
  message: 'Çok fazla istek gönderildi, lütfen bir dakika sonra tekrar deneyin.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit aşıldı: ${req.ip}`);
    res.status(429).json({
      error: 'Çok fazla istek gönderildi',
      retryAfter: 60
    });
  }
});

// Webhook için özel rate limiter - MAKSIMUM PERFORMANS
const webhookLimiter = rateLimit({
  windowMs: 1000, // 1 saniye
  max: 10000, // Saniyede maksimum 10000 webhook - MAKSIMUM
  message: 'Webhook rate limiti aşıldı',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    logger.warn(`Webhook rate limit aşıldı: ${req.ip}`);
    res.status(429).json({
      error: 'Webhook rate limiti aşıldı',
      retryAfter: 1
    });
  }
});

// Dinamik rate limiter (phone number bazlı)
const dynamicWebhookLimiter = async (req, res, next) => {
  try {
    // Webhook body'den phone number ID'yi al
    let phoneNumberId = null;
    
    if (req.body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id) {
      phoneNumberId = req.body.entry[0].changes[0].value.metadata.phone_number_id;
    }
    
    if (!phoneNumberId) {
      // Phone number ID yoksa IP bazlı kontrol yap
      phoneNumberId = req.ip;
    }
    
    // Rate limit kontrolü
    const limitCheck = await rateLimiter.checkLimit(phoneNumberId);
    
    if (!limitCheck.allowed) {
      const retryAfter = Math.ceil((limitCheck.resetTime - Date.now()) / 1000);
      
      logger.warn(`Dinamik rate limit aşıldı: ${phoneNumberId}`);
      
      return res.status(429).json({
        error: 'Rate limit aşıldı',
        retryAfter,
        remaining: 0
      });
    }
    
    // Header'lara rate limit bilgilerini ekle
    res.setHeader('X-RateLimit-Limit', rateLimiter.maxRequests);
    res.setHeader('X-RateLimit-Remaining', limitCheck.remaining);
    res.setHeader('X-RateLimit-Reset', new Date(limitCheck.resetTime).toISOString());
    
    next();
  } catch (error) {
    logger.error('Dinamik rate limiter hatası:', error);
    // Hata durumunda isteği geçir (fail-open)
    next();
  }
};

// Mesaj gönderme için rate limiter
const messageSendLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 30, // Dakikada maksimum 30 mesaj
  message: 'Çok fazla mesaj gönderimi, lütfen bekleyin.',
  keyGenerator: (req) => {
    // Kullanıcı bazlı rate limiting
    return req.user?.id || req.ip;
  },
  handler: (req, res) => {
    logger.warn(`Mesaj gönderim limiti aşıldı: ${req.user?.id || req.ip}`);
    res.status(429).json({
      error: 'Mesaj gönderim limiti aşıldı',
      message: 'Lütfen bir dakika bekleyin',
      retryAfter: 60
    });
  }
});

// Kampanya başlatma için rate limiter
const campaignLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 10, // Saatte maksimum 10 kampanya
  message: 'Çok fazla kampanya başlatıldı.',
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  handler: (req, res) => {
    logger.warn(`Kampanya limiti aşıldı: ${req.user?.id || req.ip}`);
    res.status(429).json({
      error: 'Kampanya başlatma limiti aşıldı',
      message: 'Lütfen bir saat bekleyin',
      retryAfter: 3600
    });
  }
});

// Login için rate limiter (brute force koruması)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 5, // 15 dakikada maksimum 5 deneme
  message: 'Çok fazla giriş denemesi, lütfen 15 dakika bekleyin.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Başarılı girişleri sayma
  keyGenerator: (req) => {
    // IP + username kombinasyonu
    return `${req.ip}-${req.body?.username || 'unknown'}`;
  },
  handler: (req, res) => {
    logger.warn(`Login limiti aşıldı: ${req.ip} - ${req.body?.username}`);
    res.status(429).json({
      error: 'Çok fazla giriş denemesi',
      message: 'Hesabınız geçici olarak kilitlendi',
      retryAfter: 900 // 15 dakika
    });
  }
});

// Dosya yükleme için rate limiter
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 10, // Dakikada maksimum 10 yükleme
  message: 'Çok fazla dosya yükleme isteği.',
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

// IP bazlı global rate limiter (DDoS koruması)
const globalLimiter = rateLimit({
  windowMs: 1000, // 1 saniye
  max: 50, // Saniyede maksimum 50 istek (tüm endpoint'ler dahil)
  message: 'Sunucu aşırı yüklendi, lütfen bekleyin.',
  standardHeaders: false,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.error(`Global rate limit aşıldı (olası DDoS): ${req.ip}`);
    res.status(503).json({
      error: 'Sunucu geçici olarak kullanılamıyor',
      message: 'Lütfen daha sonra tekrar deneyin'
    });
  }
});

// Rate limit durumunu kontrol eden endpoint
const getRateLimitStatus = async (req, res) => {
  try {
    const identifier = req.user?.id || req.ip;
    const status = await rateLimiter.checkLimit(identifier);
    
    res.json({
      allowed: status.allowed,
      remaining: status.remaining,
      resetTime: new Date(status.resetTime).toISOString(),
      limit: rateLimiter.maxRequests,
      window: `${rateLimiter.windowMs}ms`
    });
  } catch (error) {
    logger.error('Rate limit status hatası:', error);
    res.status(500).json({ error: 'Rate limit durumu alınamadı' });
  }
};

module.exports = {
  apiLimiter,
  webhookLimiter,
  dynamicWebhookLimiter,
  messageSendLimiter,
  campaignLimiter,
  loginLimiter,
  uploadLimiter,
  globalLimiter,
  getRateLimitStatus
};