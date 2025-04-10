const Joi = require('joi');

const forgotPasswordSchema = Joi.object({
  email: Joi.string().base64().required().messages({
    'string.base64': 'Email must be a valid Base64 encoded string.',
    'any.required': 'Email is required.'
  })
});

module.exports = { forgotPasswordSchema };
