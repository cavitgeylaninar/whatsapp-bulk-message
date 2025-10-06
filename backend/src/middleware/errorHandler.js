const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    user: req.user?.id
  });

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.errors
    });
  }

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      error: 'Duplicate Entry',
      details: err.errors.map(e => ({
        field: e.path,
        message: `${e.path} already exists`
      }))
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid Token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token Expired'
    });
  }

  if (err.status) {
    return res.status(err.status).json({
      error: err.message
    });
  }

  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message
  });
};

module.exports = errorHandler;