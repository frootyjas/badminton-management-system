const createError = require('http-errors');
const mongoose = require('mongoose');

const checkMongoConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return next(createError(503, 'Service Unavailable.'));
  }
  next();
};

module.exports = checkMongoConnection;
