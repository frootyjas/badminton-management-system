const Joi = require('joi');

// define the update validation schema
const updateSchema = Joi.object({
  first_name: Joi.string()
    .trim()
    .pattern(/^[a-zA-Z\s]+$/) // allows letters and spaces
    .min(2)
    .max(30)
    .messages({
      'string.min': 'First name must be at least 2 characters long.',
      'string.max': 'First name cannot be longer than 30 characters.',
      'string.pattern.base': 'First name must only contain alphabetic characters and spaces.'
    }),
  middle_name: Joi.string()
    .trim()
    .max(30)
    .pattern(/^[A-Za-z]+$/, 'alphabetic') // Only alphabetic characters
    .allow('') // Optional middle name
    .messages({
      'string.max': 'Middle name cannot be longer than 30 characters.',
      'string.pattern.base': 'Middle name must only contain alphabetic characters.'
    }),
  last_name: Joi.string()
    .trim()
    .pattern(/^[a-zA-Z\s]+$/) // allows letters and spaces
    .min(2)
    .max(30)
    .messages({
      'string.min': 'Last name must be at least 2 characters long.',
      'string.max': 'Last name cannot be longer than 30 characters.',
      'string.pattern.base': 'Last name must only contain alphabetic characters and spaces.'
    }),
  email: Joi.string()
    .email()
    .lowercase() // Ensure email is lowercase
    .custom((value, helpers) => {
      const validDomains = ['gmail.com', 'yahoo.com', 'googlemail.com'];
      const domain = value.split('@')[1];
      if (!validDomains.includes(domain)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'string.email': 'Please enter a valid email address.',
      'any.invalid': 'Email must be from Gmail, Yahoo, or Googlemail.'
    }),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])')).messages({
    'string.min': 'Password must be at least 8 characters long.',
    'string.pattern.base':
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
  }),
  confirm_password: Joi.string()
    .valid(Joi.ref('password')) // Ensure confirm_password matches password
    .messages({
      'any.only': 'Confirm password must match password.'
    }),
  gender: Joi.string().valid('male', 'female').lowercase().messages({
    'any.only': 'Gender must be either Male or Female.'
  }),
  date_of_birth: Joi.date().messages({
    'date.base': 'Valid date of birth is required.'
  }),
  municipality: Joi.string().trim().messages({
    'string.empty': 'Municipality is required.'
  }),
  contact_number: Joi.string()
    .pattern(/^\d{10,15}$/)
    .messages({
      'string.pattern.base': 'Please enter a valid contact number.'
    }),

  profile_photo: Joi.object().unknown(true),

  role: Joi.forbidden().messages({
    'any.unknown': 'You are not allowed to update the role.'
  }),
  status_owner: Joi.string()
    .valid('single', 'married', 'widowed/er', 'separated', 'cohabitant')
    .lowercase()
    .when('role', {
      is: 'admin', // Only required for admins
      then: Joi.required(),
      otherwise: Joi.forbidden() // Disallow for non-Admin roles
    })
    .messages({
      'any.only': 'Status must be one of the valid options: Single, Married, Widowed/er, Separated, or Cohabitant.'
    }),
  // prevent updating sensitive fields like `isVerified`
  isVerified: Joi.forbidden().messages({
    'any.unknown': 'You are not allowed to update the verification status.'
  })
});

module.exports = {
  updateSchema
};
