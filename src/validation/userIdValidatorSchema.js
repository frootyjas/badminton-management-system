const Joi = require('joi');

// define the user ID validation schema
const userIdSchema = Joi.object({
  id: Joi.string()
    .pattern(new RegExp('^[0-9a-fA-F]{24}$')) // Example for a MongoDB ObjectId (24 hex characters)
    .required()
    .messages({
      'string.pattern.base': 'User ID must be a valid ObjectId (24 hex characters).',
      'any.required': 'User ID is required.'
    })
});

module.exports = { userIdSchema };
