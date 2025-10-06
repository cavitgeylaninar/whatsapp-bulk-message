const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const UserSubscription = sequelize.define('UserSubscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  plan_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'subscription_plans',
      key: 'id'
    }
  },
  // Subscription durumu
  status: {
    type: DataTypes.ENUM('active', 'cancelled', 'expired', 'suspended', 'trial', 'pending'),
    defaultValue: 'pending'
  },
  // Tarihler
  start_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  trial_end_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Faturalama
  billing_cycle: {
    type: DataTypes.ENUM('monthly', 'yearly', 'lifetime'),
    defaultValue: 'monthly'
  },
  next_billing_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  amount_paid: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  // Kullanım istatistikleri (mevcut dönem)
  usage_stats: {
    type: DataTypes.JSON,
    defaultValue: {
      messages_sent: 0,
      messages_sent_today: 0,
      campaigns_created: 0,
      contacts_added: 0,
      storage_used_mb: 0,
      api_calls: 0,
      webhook_calls: 0,
      last_reset_date: null
    }
  },
  // Özel limitler (plan limitlerini override edebilir)
  custom_limits: {
    type: DataTypes.JSON,
    defaultValue: null,
    comment: 'Admin tarafından özelleştirilen limitler'
  },
  // Ödeme bilgileri
  payment_method: {
    type: DataTypes.STRING,
    allowNull: true
  },
  payment_reference: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Auto-renewal
  auto_renew: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // Notlar
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'user_subscriptions',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['user_id', 'status']
    },
    {
      fields: ['end_date']
    },
    {
      fields: ['next_billing_date']
    }
  ]
});

// Hooks
UserSubscription.beforeCreate(async (subscription) => {
  // End date hesapla
  if (!subscription.end_date) {
    const startDate = new Date(subscription.start_date);
    if (subscription.billing_cycle === 'monthly') {
      subscription.end_date = new Date(startDate.setMonth(startDate.getMonth() + 1));
    } else if (subscription.billing_cycle === 'yearly') {
      subscription.end_date = new Date(startDate.setFullYear(startDate.getFullYear() + 1));
    }
  }
  
  // Trial end date hesapla
  if (subscription.status === 'trial') {
    const plan = await sequelize.models.SubscriptionPlan.findByPk(subscription.plan_id);
    if (plan && plan.trial_days > 0) {
      const trialEnd = new Date(subscription.start_date);
      trialEnd.setDate(trialEnd.getDate() + plan.trial_days);
      subscription.trial_end_date = trialEnd;
    }
  }
});

module.exports = UserSubscription;