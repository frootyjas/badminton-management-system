const Joi = require('joi');

const resetPasswordSchema = Joi.object({
  newPassword: Joi.string()
    .min(8)
    .required()
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
    .messages({
      'string.empty': 'Password is required.',
      'string.min': 'Password must be at least 8 characters long.',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
    }),
  confirm_password: Joi.string()
    .valid(Joi.ref('newPassword')) // Ensure confirm_password matches password
    .required()
    .messages({
      'any.only': 'Confirm password must match password.',
      'string.empty': 'Confirm password is required.'
    })
});

module.exports = { resetPasswordSchema };
