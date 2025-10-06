const { User, Customer } = require('../models');
const { Op } = require('sequelize');

const scopeQuery = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    req.scopedQuery = {};

    switch (user.role) {
      case 'admin':
        req.scopedQuery = {
          userFilter: { role: { [Op.ne]: 'musteri' } },
          customerFilter: { bayi_id: null },
          campaignFilter: {},
          messageFilter: {}
        };
        break;

      case 'bayi':
        req.scopedQuery = {
          userFilter: { parent_id: user.id },
          customerFilter: { bayi_id: user.id },
          campaignFilter: { bayi_id: user.id },
          messageFilter: { bayi_id: user.id }
        };
        break;

      case 'musteri':
        const customer = await Customer.findOne({ 
          where: { phone: user.phone } 
        });
        
        req.scopedQuery = {
          userFilter: { id: user.id },
          customerFilter: customer ? { id: customer.id } : { id: null },
          campaignFilter: { id: null },
          messageFilter: customer ? { customer_id: customer.id } : { id: null }
        };
        break;

      default:
        return res.status(403).json({ error: 'Invalid user role' });
    }

    next();
  } catch (error) {
    console.error('Scope query error:', error);
    res.status(500).json({ error: 'Error applying scope filters' });
  }
};

const validateBayiCustomerAccess = async (req, res, next) => {
  try {
    const user = req.user;
    const customerId = req.params.customerId || req.body.customer_id;

    if (!customerId || user.role === 'admin') {
      return next();
    }

    if (user.role === 'bayi') {
      const customer = await Customer.findOne({
        where: {
          id: customerId,
          bayi_id: user.id
        }
      });

      if (!customer) {
        return res.status(403).json({ 
          error: 'You do not have access to this customer' 
        });
      }
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Error validating customer access' });
  }
};

const preventAdminCustomerAccess = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.role === 'admin') {
      const path = req.path.toLowerCase();
      
      if (path.includes('/customers') && !path.includes('/stats')) {
        const method = req.method.toLowerCase();
        
        if (method === 'get' && req.params.id) {
          return res.status(403).json({ 
            error: 'Admin cannot view individual customer details' 
          });
        }
        
        if (method === 'get' && !req.params.id) {
          req.adminRestricted = true;
        }
      }
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Error checking admin restrictions' });
  }
};

module.exports = {
  scopeQuery,
  validateBayiCustomerAccess,
  preventAdminCustomerAccess
};