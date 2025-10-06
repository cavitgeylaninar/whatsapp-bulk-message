const { DataTypes } = require('sequelize');
const sequelize = require('../../../database/connection');

const WhatsAppWebContact = sequelize.define('WhatsAppWebContact', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  session_id: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  whatsapp_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  is_business: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  profile_pic_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  last_seen_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'whatsapp_web_contacts',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['whatsapp_id'],
      name: 'unique_whatsapp_id'
    },
    {
      fields: ['session_id', 'user_id'],
      name: 'session_user_index'
    },
    {
      fields: ['phone'],
      name: 'phone_index'
    }
  ]
});

WhatsAppWebContact.associate = (models) => {
  WhatsAppWebContact.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
};

module.exports = WhatsAppWebContact;