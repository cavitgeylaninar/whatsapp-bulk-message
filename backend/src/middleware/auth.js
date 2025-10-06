const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error();
    }

    // Development mode: accept test tokens
    if (process.env.NODE_ENV === 'development' && token.startsWith('test-token-')) {
      console.log('Development mode: Using test token');
      // Find admin user for test tokens
      const testUser = await User.findOne({
        where: {
          username: 'admin',
          is_active: true
        }
      });

      if (testUser) {
        req.user = testUser;
        req.token = token;
        return next();
      }
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ 
      where: { 
        id: decoded.id,
        is_active: true 
      }
    });

    if (!user) {
      throw new Error();
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Handle both array and spread arguments
    const allowedRoles = Array.isArray(roles[0]) && roles.length === 1 ? roles[0] : roles;
    
    console.log('Authorize check:', {
      userRole: req.user.role,
      allowedRoles: allowedRoles,
      hasAccess: allowedRoles.includes(req.user.role)
    });
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  };
};

const checkResourceAccess = (model) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const user = req.user;

      if (user.role === 'admin') {
        return next();
      }

      if (user.role === 'bayi') {
        const resource = await model.findOne({
          where: { 
            id: resourceId,
            bayi_id: user.id
          }
        });

        if (!resource) {
          return res.status(403).json({ error: 'Access denied to this resource' });
        }
      }

      if (user.role === 'musteri') {
        const resource = await model.findOne({
          where: { 
            id: resourceId,
            customer_id: user.id
          }
        });

        if (!resource) {
          return res.status(403).json({ error: 'Access denied to this resource' });
        }
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Error checking resource access' });
    }
  };
};

const checkParentAccess = async (req, res, next) => {
  try {
    const user = req.user;
    const targetUserId = req.params.userId || req.body.userId;

    if (!targetUserId) {
      return next();
    }

    if (user.role === 'admin') {
      const targetUser = await User.findByPk(targetUserId);
      if (targetUser && targetUser.role === 'musteri') {
        return res.status(403).json({ 
          error: 'Admin cannot directly access customer data' 
        });
      }
      return next();
    }

    if (user.role === 'bayi') {
      const targetUser = await User.findOne({
        where: {
          id: targetUserId,
          parent_id: user.id
        }
      });

      if (!targetUser) {
        return res.status(403).json({ 
          error: 'You can only access your own customers' 
        });
      }
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Error checking parent access' });
  }
};

module.exports = {
  authenticate,
  authorize,
  checkResourceAccess,
  checkParentAccess
};