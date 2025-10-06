const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  parent_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'bayi', 'musteri'),
    allowNull: false,
    defaultValue: 'musteri'
  },
  company_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  whatsapp_number: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  // WhatsApp Business API credentials
  whatsapp_phone_number_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'WhatsApp Business phone number ID'
  },
  whatsapp_business_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'WhatsApp Business account ID'
  },
  whatsapp_access_token: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Encrypted WhatsApp Business API access token'
  },
  whatsapp_webhook_verify_token: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Webhook verification token for this tenant'
  },
  whatsapp_setup_completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Whether WhatsApp Business setup is completed'
  },
  whatsapp_setup_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date when WhatsApp was setup'
  },
  // Subscription fields
  subscription_type: {
    type: DataTypes.ENUM('trial', 'basic', 'premium', 'enterprise'),
    defaultValue: 'trial',
    allowNull: false
  },
  subscription_start_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  subscription_end_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  is_trial: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  trial_days: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    allowNull: false
  },
  subscription_status: {
    type: DataTypes.ENUM('active', 'expired', 'suspended', 'cancelled'),
    defaultValue: 'active',
    allowNull: false
  },
  max_messages_per_month: {
    type: DataTypes.INTEGER,
    defaultValue: 1000,
    allowNull: true
  },
  used_messages_this_month: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  max_contacts: {
    type: DataTypes.INTEGER,
    defaultValue: 500,
    allowNull: true
  },
  last_login_reminder_sent: {
    type: DataTypes.DATE,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  two_factor_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  two_factor_secret: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  api_key: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  underscored: true,
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
      // Set subscription dates for new users only if not already provided
      if (user.role === 'bayi' || user.role === 'musteri') {
        const now = new Date();
        
        // Only set subscription dates if they're not already set
        if (!user.subscription_start_date) {
          user.subscription_start_date = now;
        }
        
        // Only set end date if not already set and is trial
        if (!user.subscription_end_date && user.is_trial) {
          const endDate = new Date(user.subscription_start_date || now);
          endDate.setDate(endDate.getDate() + (user.trial_days || 10));
          user.subscription_end_date = endDate;
        }
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

User.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Check if subscription is valid
User.prototype.isSubscriptionValid = function() {
  if (this.role === 'admin') {
    return true; // Admins always have access
  }
  
  if (this.subscription_status !== 'active') {
    return false;
  }
  
  if (!this.subscription_end_date) {
    return false;
  }
  
  const now = new Date();
  return now <= new Date(this.subscription_end_date);
};

// Get days remaining in subscription
User.prototype.getDaysRemaining = function() {
  if (!this.subscription_end_date) {
    return 0;
  }
  
  const now = new Date();
  const endDate = new Date(this.subscription_end_date);
  const diffTime = endDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
};

// Check if user should receive expiry warning
User.prototype.shouldShowExpiryWarning = function() {
  const daysRemaining = this.getDaysRemaining();
  return daysRemaining > 0 && daysRemaining <= 3; // Show warning in last 3 days
};

// Update subscription
User.prototype.updateSubscription = async function(type, days, adminUserId = null) {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + days);
  
  await this.update({
    subscription_type: type,
    subscription_start_date: now,
    subscription_end_date: endDate,
    subscription_status: 'active',
    is_trial: false
  });
  
  // Log to subscription history
  if (sequelize.models.SubscriptionHistory) {
    await sequelize.models.SubscriptionHistory.create({
      user_id: this.id,
      action: 'renewed',
      subscription_type: type,
      start_date: now,
      end_date: endDate,
      created_by: adminUserId
    });
  }
  
  return this;
};

User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  delete values.two_factor_secret;
  // Hide sensitive WhatsApp credentials
  delete values.whatsapp_access_token;
  delete values.whatsapp_webhook_verify_token;
  return values;
};

User.belongsTo(User, { as: 'parent', foreignKey: 'parent_id' });
User.hasMany(User, { as: 'children', foreignKey: 'parent_id' });

module.exports = User;