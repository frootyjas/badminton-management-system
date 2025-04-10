const Joi = require('joi');

const verifySchema = Joi.object({
  otp: Joi.string().length(6).required().messages({
    'string.length': 'OTP must be exactly 6 digits long.',
    'any.required': 'OTP is required.'
  })
});

module.exports = { verifySchema };
