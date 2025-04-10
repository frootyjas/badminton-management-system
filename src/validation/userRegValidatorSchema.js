const Joi = require('joi');

// define the registration validation schema
const registrationSchema = Joi.object({
  first_name: Joi.string()
    .trim()
    .pattern(/^[a-zA-Z\s]+$/) // allows letters and spaces
    .min(2)
    .max(30)
    .required()
    .messages({
      'string.empty': 'First name is required.',
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
    .required()
    .messages({
      'string.empty': 'Last name is required.',
      'string.min': 'Last name must be at least 2 characters long.',
      'string.max': 'Last name cannot be longer than 30 characters.',
      'string.pattern.base': 'Last name must only contain alphabetic characters and spaces.'
    }),
  email: Joi.string()
    .email()
    .lowercase() // Ensure email is lowercase
    .required()
    .custom((value, helpers) => {
      const validDomains = ['gmail.com', 'yahoo.com', 'googlemail.com'];
      const domain = value.split('@')[1];
      if (!validDomains.includes(domain)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'string.empty': 'Email is required.',
      'string.email': 'Please enter a valid email address.',
      'any.invalid': 'Email must be from Gmail, Yahoo, or Googlemail.'
    }),
  username: Joi.string()
    .trim()
    .min(4)
    .max(30)
    .pattern(/^[A-Za-z0-9]+$/, 'letters and numbers') // Only letters and numbers
    .required()
    .messages({
      'string.empty': 'Username is required.',
      'string.min': 'Username must be at least 4 characters long.',
      'string.max': 'Username must be at most 30 characters long.',
      'string.pattern.base': 'Username can only contain letters and numbers.'
    }),
  password: Joi.string()
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
    .valid(Joi.ref('password')) // Ensure confirm_password matches password
    .required()
    .messages({
      'any.only': 'Confirm password must match password.',
      'string.empty': 'Confirm password is required.'
    }),
  gender: Joi.string().valid('male', 'female').required().lowercase().messages({
    'string.empty': 'Gender is required.',
    'any.only': 'Gender must be either Male or Female.'
  }),
  date_of_birth: Joi.date().required().messages({
    'date.base': 'Valid date of birth is required.'
  }),
  municipality: Joi.string().trim().required().messages({
    'string.empty': 'Municipality is required.'
  }),
  contact_number: Joi.string()
    .pattern(/^\d{10,15}$/)
    .required()
    .messages({
      'string.empty': 'Contact number is required.',
      'string.pattern.base': 'Please enter a valid contact number.'
    }),
  role: Joi.string().valid('admin', 'player', 'coach').required().lowercase().messages({
    'string.empty': 'Role is required.',
    'any.only': 'Role must be either Admin, Player, or Coach.'
  })
});

module.exports = {
  registrationSchema
};
