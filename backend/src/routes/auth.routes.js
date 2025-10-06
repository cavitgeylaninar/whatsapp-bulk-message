const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { User } = require('../models');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password, role, company_name, phone, parent_id } = req.body;

    if (role === 'admin') {
      return res.status(403).json({ error: 'Cannot register as admin' });
    }

    let finalParentId = parent_id;

    if (role === 'musteri' && !parent_id) {
      return res.status(400).json({ error: 'Customer must have a parent (bayi)' });
    }

    const user = await User.create({
      username,
      email,
      password,
      role: role || 'musteri',
      company_name,
      phone,
      parent_id: finalParentId
    });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.status(201).json({
      user: user.toJSON(),
      token
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password, twoFactorCode } = req.body;

    const user = await User.findOne({
      where: { username }
    });

    if (!user || !await user.validatePassword(password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    // Check if user account is suspended
    if (user.role === 'bayi' && user.subscription_status === 'suspended') {
      return res.status(403).json({
        error: 'ACCOUNT_SUSPENDED',
        message: 'Hesabınız askıya alınmıştır',
        details: 'Hesap askıya alma sebebi hakkında bilgi almak için sistem yöneticisi ile iletişime geçiniz.',
        suspendedDate: user.updated_at
      });
    }

    if (user.two_factor_enabled) {
      if (!twoFactorCode) {
        return res.status(200).json({ 
          requiresTwoFactor: true,
          message: 'Two-factor authentication code required' 
        });
      }

      const verified = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: twoFactorCode,
        window: 2
      });

      if (!verified) {
        return res.status(401).json({ error: 'Invalid two-factor code' });
      }
    }

    await user.update({ last_login: new Date() });

    // Check subscription status
    const subscriptionInfo = {
      isValid: user.isSubscriptionValid(),
      type: user.subscription_type,
      status: user.subscription_status,
      daysRemaining: user.getDaysRemaining(),
      showWarning: user.shouldShowExpiryWarning(),
      endDate: user.subscription_end_date,
      isTrial: user.is_trial
    };

    // If subscription is expired and user is bayi, prevent login
    if (!subscriptionInfo.isValid && user.role === 'bayi') {
      // Update status if needed
      if (user.subscription_status === 'active') {
        await user.update({ subscription_status: 'expired' });
      }
      
      return res.status(403).json({ 
        error: 'SUBSCRIPTION_EXPIRED',
        message: 'Abonelik süreniz dolmuştur',
        details: 'Sisteme giriş yapabilmek için sistem yöneticisi ile iletişime geçiniz.',
        subscriptionEndDate: user.subscription_end_date,
        daysExpired: Math.abs(subscriptionInfo.daysRemaining)
      });
    } else if (subscriptionInfo.showWarning) {
      subscriptionInfo.warning = `Üyeliğinizin bitmesine ${subscriptionInfo.daysRemaining} gün kaldı.`;
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    logger.info(`User ${user.id} logged in successfully`);

    res.json({
      user: user.toJSON(),
      token,
      subscription: subscriptionInfo
    });
  } catch (error) {
    next(error);
  }
});

router.post('/enable-2fa', authenticate, async (req, res, next) => {
  try {
    const user = req.user;

    if (user.two_factor_enabled) {
      return res.status(400).json({ error: 'Two-factor authentication already enabled' });
    }

    const secret = speakeasy.generateSecret({
      name: `WhatsApp Bulk API (${user.email})`
    });

    await user.update({
      two_factor_secret: secret.base32
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl
    });
  } catch (error) {
    next(error);
  }
});

router.post('/verify-2fa', authenticate, async (req, res, next) => {
  try {
    const { code } = req.body;
    const user = req.user;

    if (user.two_factor_enabled) {
      return res.status(400).json({ error: 'Two-factor authentication already enabled' });
    }

    if (!user.two_factor_secret) {
      return res.status(400).json({ error: 'Two-factor setup not initiated' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    await user.update({
      two_factor_enabled: true
    });

    res.json({
      message: 'Two-factor authentication enabled successfully'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/disable-2fa', authenticate, async (req, res, next) => {
  try {
    const { password, code } = req.body;
    const user = req.user;

    if (!user.two_factor_enabled) {
      return res.status(400).json({ error: 'Two-factor authentication not enabled' });
    }

    if (!await user.validatePassword(password)) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    await user.update({
      two_factor_enabled: false,
      two_factor_secret: null
    });

    res.json({
      message: 'Two-factor authentication disabled successfully'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh-token', authenticate, async (req, res, next) => {
  try {
    const user = req.user;

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({ token });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    // WhatsApp session'ını kapat
    const SessionManager = require('../modules/whatsapp-web/services/SessionManager');
    const sessionId = `session-${req.user.username}`;

    // Session varsa destroy et
    if (SessionManager.getSession(sessionId)) {
      await SessionManager.destroySession(sessionId);
      logger.info(`WhatsApp session ${sessionId} destroyed for user ${req.user.id}`);
    }

    logger.info(`User ${req.user.id} logged out`);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    if (!await user.validatePassword(currentPassword)) {
      return res.status(401).json({ error: 'Invalid current password' });
    }

    await user.update({ password: newPassword });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;