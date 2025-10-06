const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'whatsapp_bulk_db',
  process.env.DB_USER || 'cavitgeylaninar',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: (msg) => logger.debug(msg),
    pool: {
      max: 100,  // MAKSIMUM bağlantı sayısı
      min: 20,   // MAKSIMUM minimum bağlantı
      acquire: 120000,  // 2 dakika timeout
      idle: 10000,
      evict: 30000  // 30 saniye temizleme
    },
    retry: {
      max: 3  // Başarısız sorguları yeniden deneme
    }
  }
);

module.exports = sequelize;