const router = require('express').Router();
const { User } = require('../models');
const { authenticate, authorize, checkParentAccess } = require('../middleware/auth');
const { scopeQuery, preventAdminCustomerAccess } = require('../middleware/roleAccess');
const { Op } = require('sequelize');
const crypto = require('crypto');

router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{
        model: User,
        as: 'parent',
        attributes: ['id', 'username', 'company_name']
      }]
    });

    res.json(user.toJSON());
  } catch (error) {
    next(error);
  }
});

router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const { company_name, phone, whatsapp_number } = req.body;
    
    await req.user.update({
      company_name,
      phone,
      whatsapp_number
    });

    res.json(req.user.toJSON());
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticate, authorize('admin', 'bayi'), scopeQuery, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { ...req.scopedQuery.userFilter };

    if (role) {
      whereClause.role = role;
    }

    if (search) {
      whereClause[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { company_name: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      attributes: { exclude: ['password', 'two_factor_secret'] }
    });

    res.json({
      users: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, authorize('admin', 'bayi'), checkParentAccess, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password', 'two_factor_secret'] },
      include: [{
        model: User,
        as: 'parent',
        attributes: ['id', 'username', 'company_name']
      }]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, authorize('admin', 'bayi'), async (req, res, next) => {
  try {
    const { username, email, password, role, company_name, phone, subscription_days } = req.body;
    
    let parent_id = null;
    const userData = {
      username,
      email,
      password,
      role,
      company_name,
      phone,
      parent_id
    };
    
    if (req.user.role === 'bayi') {
      if (role !== 'musteri') {
        return res.status(403).json({ error: 'Bayi can only create customer accounts' });
      }
      parent_id = req.user.id;
      userData.parent_id = parent_id;
    }

    if (req.user.role === 'admin' && role === 'musteri') {
      return res.status(403).json({ error: 'Admin cannot create customer accounts directly' });
    }

    // If admin is creating a bayi and subscription_days is provided, set subscription dates
    if (req.user.role === 'admin' && role === 'bayi' && subscription_days) {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + subscription_days);
      
      userData.subscription_start_date = now;
      userData.subscription_end_date = endDate;
      userData.subscription_status = 'active';
      userData.subscription_type = 'basic'; // Default to basic
      userData.is_trial = false;
      userData.max_messages_per_month = 10000; // Default limit
      userData.max_contacts = 5000; // Default limit
    }

    const user = await User.create(userData);

    // Log subscription history for bayi creation
    if (req.user.role === 'admin' && role === 'bayi' && subscription_days) {
      await SubscriptionHistory.create({
        user_id: user.id,
        action: 'created',
        subscription_type: 'basic',
        start_date: userData.subscription_start_date,
        end_date: userData.subscription_end_date,
        notes: `Initial subscription for ${subscription_days} days`,
        created_by: req.user.id
      });
    }

    res.status(201).json(user.toJSON());
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, authorize('admin', 'bayi'), checkParentAccess, async (req, res, next) => {
  try {
    const { company_name, phone, whatsapp_number, is_active } = req.body;
    
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.user.role === 'bayi' && user.parent_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await user.update({
      company_name,
      phone,
      whatsapp_number,
      is_active
    });

    res.json(user.toJSON());
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, authorize('admin', 'bayi'), checkParentAccess, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.user.role === 'bayi' && user.parent_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await user.destroy();
    res.json({ message: 'Kullanıcı başarıyla silindi' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/generate-api-key', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const apiKey = crypto.randomBytes(32).toString('hex');
    await user.update({ api_key: apiKey });

    res.json({ api_key: apiKey });
  } catch (error) {
    next(error);
  }
});

router.get('/:userId/customers', 
  authenticate, 
  authorize('bayi'), 
  preventAdminCustomerAccess,
  async (req, res, next) => {
  try {
    if (req.params.userId !== req.user.id) {
      return res.status(403).json({ error: 'You can only view your own customers' });
    }

    const { page = 1, limit = 20, subscribed, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      bayi_id: req.user.id
    };

    if (subscribed !== undefined) {
      whereClause.is_subscribed = subscribed === 'true';
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Customer.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      customers: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    next(error);
  }
});

router.get('/stats/overview', authenticate, authorize('admin', 'bayi'), async (req, res, next) => {
  try {
    let stats = {};

    if (req.user.role === 'admin') {
      const totalBayiler = await User.count({ where: { role: 'bayi' } });
      const activeBayiler = await User.count({ where: { role: 'bayi', is_active: true } });
      const totalCampaigns = await Campaign.count();
      const activeCampaigns = await Campaign.count({ where: { status: 'running' } });

      stats = {
        totalBayiler,
        activeBayiler,
        totalCampaigns,
        activeCampaigns
      };
    } else if (req.user.role === 'bayi') {
      const totalCustomers = await Customer.count({ where: { bayi_id: req.user.id } });
      const subscribedCustomers = await Customer.count({ 
        where: { bayi_id: req.user.id, is_subscribed: true } 
      });
      const totalCampaigns = await Campaign.count({ where: { bayi_id: req.user.id } });
      const activeCampaigns = await Campaign.count({ 
        where: { bayi_id: req.user.id, status: 'running' } 
      });

      stats = {
        totalCustomers,
        subscribedCustomers,
        totalCampaigns,
        activeCampaigns
      };
    }

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

module.exports = router;