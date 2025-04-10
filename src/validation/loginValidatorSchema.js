const Joi = require('joi');

// Define the login validation schema
const loginSchema = Joi.object({
  username: Joi.string().required().messages({
    'string.empty': 'Username is required.'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required.'
  }),
  role: Joi.string().valid('admin', 'coach', 'player', 'superadmin').required().lowercase().messages({
    'any.only': 'Role must be either Admin, Coach, Player, or Superadmin.',
    'string.empty': 'Role is required.'
  })
});

module.exports = { loginSchema };
