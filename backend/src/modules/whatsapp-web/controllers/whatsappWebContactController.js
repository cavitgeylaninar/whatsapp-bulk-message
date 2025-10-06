const WhatsAppWebContact = require('../models/WhatsAppWebContact');
const { Op } = require('sequelize');
const logger = require('../../../utils/logger');

// Create a new WhatsApp Web contact
exports.createWhatsAppWebContact = async (req, res) => {
  try {
    const { name, phone, session_id, whatsapp_id, is_business, is_active } = req.body;

    // Validate required fields
    if (!name || !phone || !session_id) {
      return res.status(400).json({
        success: false,
        error: 'İsim, telefon ve oturum ID gereklidir'
      });
    }

    // Check if contact already exists with the same phone and session
    const existingContact = await WhatsAppWebContact.findOne({
      where: {
        phone: phone,
        session_id: session_id,
        user_id: req.user.id
      }
    });

    if (existingContact) {
      return res.status(400).json({
        success: false,
        error: 'Bu telefon numarası ve oturum için kişi zaten mevcut'
      });
    }

    const contact = await WhatsAppWebContact.create({
      user_id: req.user.id,
      session_id,
      whatsapp_id: whatsapp_id || phone.replace(/\D/g, ''),
      name,
      phone,
      is_business: is_business || false,
      is_active: is_active !== undefined ? is_active : true
    });

    res.json({
      success: true,
      data: contact,
      message: 'WhatsApp Web kişisi başarıyla oluşturuldu'
    });
  } catch (error) {
    logger.error('WhatsApp Web kişisi oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      error: 'WhatsApp Web kişisi oluşturulamadı'
    });
  }
};

// Get all WhatsApp Web contacts for a user
exports.getWhatsAppWebContacts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, session_id, is_active } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const where = {
      user_id: req.user.id
    };

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (session_id) {
      where.session_id = session_id;
    }

    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    const { count, rows } = await WhatsAppWebContact.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      attributes: [
        'id', 'session_id', 'whatsapp_id', 'name', 'phone',
        'is_business', 'is_active', 'last_seen_at', 'created_at', 'updated_at'
      ]
    });

    res.json({
      success: true,
      data: {
        contacts: rows,
        total: count
      },
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    logger.error('WhatsApp Web kişilerini alma hatası:', error);
    res.status(500).json({
      success: false,
      error: 'WhatsApp Web kişileri alınamadı'
    });
  }
};

// Get single WhatsApp Web contact
exports.getWhatsAppWebContact = async (req, res) => {
  try {
    const contact = await WhatsAppWebContact.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'WhatsApp Web kişisi bulunamadı'
      });
    }

    res.json({
      success: true,
      data: contact
    });
  } catch (error) {
    logger.error('WhatsApp Web kişisi alma hatası:', error);
    res.status(500).json({
      success: false,
      error: 'WhatsApp Web kişisi alınamadı'
    });
  }
};

// Get contact statistics
exports.getWhatsAppWebContactStats = async (req, res) => {
  try {
    const total = await WhatsAppWebContact.count({
      where: { user_id: req.user.id }
    });

    const active = await WhatsAppWebContact.count({
      where: {
        user_id: req.user.id,
        is_active: true
      }
    });

    const inactive = await WhatsAppWebContact.count({
      where: {
        user_id: req.user.id,
        is_active: false
      }
    });

    const business = await WhatsAppWebContact.count({
      where: {
        user_id: req.user.id,
        is_business: true
      }
    });

    // Get contacts by session
    const sessionStats = await WhatsAppWebContact.findAll({
      where: { user_id: req.user.id },
      attributes: [
        'session_id',
        [WhatsAppWebContact.sequelize.fn('COUNT', WhatsAppWebContact.sequelize.col('id')), 'count']
      ],
      group: ['session_id'],
      order: [[WhatsAppWebContact.sequelize.fn('COUNT', WhatsAppWebContact.sequelize.col('id')), 'DESC']]
    });

    res.json({
      success: true,
      data: {
        total,
        active,
        inactive,
        business,
        sessions: sessionStats.map(stat => ({
          session_id: stat.session_id,
          count: parseInt(stat.dataValues.count)
        }))
      }
    });
  } catch (error) {
    logger.error('WhatsApp Web kişi istatistikleri alma hatası:', error);
    res.status(500).json({
      success: false,
      error: 'İstatistikler alınamadı'
    });
  }
};

// Update WhatsApp Web contact
exports.updateWhatsAppWebContact = async (req, res) => {
  try {
    const contact = await WhatsAppWebContact.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'WhatsApp Web kişisi bulunamadı'
      });
    }

    // Update only allowed fields
    const allowedUpdates = ['name', 'phone', 'is_business', 'is_active', 'metadata'];
    const updates = {};

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    await contact.update(updates);

    res.json({
      success: true,
      data: contact,
      message: 'WhatsApp Web kişisi başarıyla güncellendi'
    });
  } catch (error) {
    logger.error('WhatsApp Web kişisi güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'WhatsApp Web kişisi güncellenemedi'
    });
  }
};

// Delete WhatsApp Web contact
exports.deleteWhatsAppWebContact = async (req, res) => {
  try {
    const contact = await WhatsAppWebContact.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'WhatsApp Web kişisi bulunamadı'
      });
    }

    await contact.destroy();

    res.json({
      success: true,
      message: 'WhatsApp Web kişisi başarıyla silindi'
    });
  } catch (error) {
    logger.error('WhatsApp Web kişisi silme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'WhatsApp Web kişisi silinemedi'
    });
  }
};

// Bulk delete WhatsApp Web contacts
exports.bulkDeleteWhatsAppWebContacts = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Lütfen silinecek kişi ID\'lerini belirtin'
      });
    }

    const deleted = await WhatsAppWebContact.destroy({
      where: {
        id: ids,
        user_id: req.user.id
      }
    });

    res.json({
      success: true,
      message: `${deleted} WhatsApp Web kişisi başarıyla silindi`
    });
  } catch (error) {
    logger.error('WhatsApp Web kişilerini toplu silme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'WhatsApp Web kişileri silinemedi'
    });
  }
};

// Clear all contacts for a session
exports.clearSessionContacts = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const deleted = await WhatsAppWebContact.destroy({
      where: {
        session_id: sessionId,
        user_id: req.user.id
      }
    });

    res.json({
      success: true,
      message: `${deleted} kişi ${sessionId} oturumu için temizlendi`
    });
  } catch (error) {
    logger.error('Oturum kişilerini temizleme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Oturum kişileri temizlenemedi'
    });
  }
};