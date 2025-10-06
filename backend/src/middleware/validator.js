const Joi = require('joi');

/**
 * Validate request body/params/query against Joi schema
 * @param {object} schema - Joi validation schema
 * @param {string} property - Property to validate (body, params, query)
 */
const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors
      });
    }

    // Replace request property with validated value
    req[property] = value;
    next();
  };
};

module.exports = {
  validateRequest
};