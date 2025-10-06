const User = require('../models/User');
const SubscriptionHistory = require('../models/SubscriptionHistory');
const { Op } = require('sequelize');

// Check if user's subscription is valid
const checkSubscription = async (req, res, next) => {
  try {
    // Admin users bypass subscription check
    if (req.user.role === 'admin') {
      return next();
    }

    // Get fresh user data with subscription info
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Check subscription validity
    if (!user.isSubscriptionValid()) {
      // Update subscription status to expired if needed
      if (user.subscription_status === 'active') {
        await user.update({ subscription_status: 'expired' });
        
        // Log expiry to history
        await SubscriptionHistory.create({
          user_id: user.id,
          action: 'expired',
          subscription_type: user.subscription_type,
          start_date: user.subscription_start_date,
          end_date: user.subscription_end_date,
          notes: 'Subscription expired automatically'
        });
      }

      return res.status(403).json({
        success: false,
        message: 'Üyelik süreniz dolmuştur. Sistem yöneticisi ile iletişime geçiniz.',
        subscriptionExpired: true,
        expiredAt: user.subscription_end_date
      });
    }

    // Check message limits for the month
    if (user.max_messages_per_month && user.used_messages_this_month >= user.max_messages_per_month) {
      return res.status(403).json({
        success: false,
        message: `Aylık mesaj limitinize (${user.max_messages_per_month}) ulaştınız.`,
        messageLimitReached: true
      });
    }

    // Add subscription info to request
    req.subscription = {
      type: user.subscription_type,
      daysRemaining: user.getDaysRemaining(),
      showWarning: user.shouldShowExpiryWarning(),
      messagesRemaining: user.max_messages_per_month ? 
        (user.max_messages_per_month - user.used_messages_this_month) : null,
      maxContacts: user.max_contacts
    };

    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({
      success: false,
      message: 'Abonelik kontrolü sırasında hata oluştu'
    });
  }
};

// Check subscription for login (softer check - just add warning)
const checkSubscriptionLogin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    const subscriptionInfo = {
      isValid: user.isSubscriptionValid(),
      type: user.subscription_type,
      status: user.subscription_status,
      daysRemaining: user.getDaysRemaining(),
      showWarning: user.shouldShowExpiryWarning(),
      endDate: user.subscription_end_date,
      isTrial: user.is_trial
    };

    // If subscription is expired, still allow login but with warning
    if (!subscriptionInfo.isValid && user.role !== 'admin') {
      // Update status if needed
      if (user.subscription_status === 'active') {
        await user.update({ subscription_status: 'expired' });
      }
      
      subscriptionInfo.expired = true;
      subscriptionInfo.message = 'Üyelik süreniz dolmuştur. Sistem yöneticisi ile iletişime geçiniz.';
    } else if (subscriptionInfo.showWarning) {
      subscriptionInfo.warning = `Üyeliğinizin bitmesine ${subscriptionInfo.daysRemaining} gün kaldı.`;
    }

    // Attach subscription info to response
    req.subscriptionInfo = subscriptionInfo;
    next();
  } catch (error) {
    console.error('Login subscription check error:', error);
    // Don't block login on error
    next();
  }
};

// Reset monthly message count (to be called by a cron job)
const resetMonthlyMessageCounts = async () => {
  try {
    await User.update(
      { used_messages_this_month: 0 },
      { where: { role: ['bayi', 'musteri'] } }
    );
    console.log('Monthly message counts reset successfully');
  } catch (error) {
    console.error('Error resetting monthly message counts:', error);
  }
};

// Check and update expired subscriptions (to be called by a cron job)
const checkExpiredSubscriptions = async () => {
  try {
    const now = new Date();
    
    // Find all active subscriptions that have expired
    const expiredUsers = await User.findAll({
      where: {
        subscription_status: 'active',
        subscription_end_date: {
          [Op.lt]: now
        },
        role: {
          [Op.ne]: 'admin'
        }
      }
    });

    for (const user of expiredUsers) {
      await user.update({ subscription_status: 'expired' });
      
      // Log to history
      await SubscriptionHistory.create({
        user_id: user.id,
        action: 'expired',
        subscription_type: user.subscription_type,
        start_date: user.subscription_start_date,
        end_date: user.subscription_end_date,
        notes: 'Subscription expired - automatic check'
      });
    }

    console.log(`Updated ${expiredUsers.length} expired subscriptions`);
  } catch (error) {
    console.error('Error checking expired subscriptions:', error);
  }
};

module.exports = {
  checkSubscription,
  checkSubscriptionLogin,
  resetMonthlyMessageCounts,
  checkExpiredSubscriptions
};