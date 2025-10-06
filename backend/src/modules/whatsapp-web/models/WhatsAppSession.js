const { DataTypes } = require('sequelize');
const sequelize = require('../../../database/connection');

const WhatsAppSession = sequelize.define('WhatsAppSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  session_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  phone_number: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('INITIALIZING', 'QR_CODE', 'AUTHENTICATED', 'READY', 'DISCONNECTED', 'AUTH_FAILURE'),
    defaultValue: 'INITIALIZING'
  },
  qr_code: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  platform: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  last_activity: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  connected_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  disconnected_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true,
  underscored: true,
  tableName: 'whatsapp_sessions'
});

module.exports = WhatsAppSession;