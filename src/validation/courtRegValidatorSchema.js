const Joi = require('joi');

const courtRegistrationSchema = Joi.object({
  business_name: Joi.string()
    .trim() // Removes whitespace from both ends
    .min(3) // Minimum length of 3 characters
    .max(100) // Maximum length of 100 characters
    .pattern(/^[a-zA-Z0-9\s&,'-]*$/) // Allowed characters (letters, numbers, spaces, and certain punctuation)
    .required()
    .messages({
      'string.base': 'Business name must be a string.',
      'string.empty': 'Business name is required.',
      'string.min': 'Business name must be at least {#limit} characters long.',
      'string.max': 'Business name must be at most {#limit} characters long.',
      'string.pattern.base':
        "Business name can only contain letters, numbers, spaces, and certain punctuation (&, ', -).",
      'any.required': 'Business name is required.'
    }),
  contact_number: Joi.string()
    .pattern(/^(0|\+63)\d{9,14}$/) // Matches numbers starting with 0 or +63 followed by 9 to 14 digits
    .required()
    .messages({
      'string.empty': 'Contact number is required.',
      'string.pattern.base':
        'Please enter a valid contact number. It should start with 0 or +63 and be followed by 9 to 14 digits.'
    }),
  business_email: Joi.string()
    .email({ tlds: { allow: ['com'] } })
    .custom((value, helpers) => {
      const validDomains = ['gmail.com', 'yahoo.com', 'googlemail.com'];
      const domain = value.split('@')[1];
      if (!validDomains.includes(domain)) {
        return helpers.message('Email must be from Gmail, Yahoo, or Googlemail.');
      }
      return value;
    })
    .required(),
  operating_hours_from: Joi.string()
    .pattern(/^([1][0-2]|0?[1-9]):([0-5][0-9]) ?(AM|PM)$/i)
    .required()
    .messages({
      'string.empty': 'Operating hours (from) are required.',
      'string.pattern.base': 'Please enter a valid time format (HH:MM AM/PM).'
    }),
  operating_hours_to: Joi.string()
    .pattern(/^([1][0-2]|0?[1-9]):([0-5][0-9]) ?(AM|PM)$/i)
    .required()
    .messages({
      'string.empty': 'Operating hours (to) are required.',
      'string.pattern.base': 'Please enter a valid time format (HH:MM AM/PM).'
    }),
  hourly_rate: Joi.number().integer().min(0).required().messages({
    'number.base': 'Hourly rate must be a number.',
    'number.min': 'Hourly rate must be at least 0.',
    'number.integer': 'Hourly rate must be an integer.',
    'number.empty': 'Hourly rate is required.'
  }),
  description: Joi.string()
    .min(10) // Minimum length of 10 characters
    .max(300) // Maximum length of 300 characters
    .pattern(/^[a-zA-Z0-9\s.,!?'-]*$/) // Allowed characters (letters, numbers, spaces, and some punctuation)
    .required()
    .messages({
      'string.base': 'Description must be a string.',
      'string.empty': 'Description cannot be empty.',
      'string.min': 'Description must be at least {#limit} characters long.',
      'string.max': 'Description must be at most {#limit} characters long.',
      'string.pattern.base': 'Description can only contain letters, numbers, spaces, and certain punctuation.',
      'any.required': 'Description is required.'
    }),
  'court_image[]': Joi.array()
    .items(Joi.object().min(1).required().unknown(true)) // Each item must be an object (file)
    .messages({
      'array.base': 'Court images must be an array.',
      'array.empty': 'Court images cannot be empty.',
      'any.required': 'Court images are required.',
      'object.base': 'Each court image must be a valid file.'
    }),
  'facility_image[]': Joi.array()
    .items(Joi.object().min(1).required().unknown(true)) // Each item must be an object (file)
    .messages({
      'array.base': 'Court images must be an array.',
      'array.empty': 'Court images cannot be empty.',
      'any.required': 'Court images are required.',
      'object.base': 'Each court image must be a valid file.'
    }),
  'facility_name[]': Joi.alternatives()
    .try(
      Joi.string().min(1).required().trim(), // allow a single string
      Joi.array()
        .items(Joi.string().min(1).required().trim()) // allow an array of strings
        .min(1) // ensure that the array has at least one item
        .required() // ensure the entire array is required
    )
    .messages({
      'string.base': 'Facility name must be a string.',
      'string.empty': 'Facility name cannot be empty.',
      'any.required': 'Facility name is required.',
      'array.base': 'Facility name must be an array.',
      'array.empty': 'Facility name cannot be empty.',
      'array.min': 'At least one facility name is required.'
    }),
  business_logo: Joi.object().unknown(true),
  facility_images: Joi.object().unknown(true),
  paypal_email: Joi.string()
    .email({ tlds: { allow: ['com'] } })
    .custom((value, helpers) => {
      const validDomains = ['gmail.com', 'yahoo.com', 'googlemail.com', 'personal.example.com'];
      const domain = value.split('@')[1];
      if (!validDomains.includes(domain)) {
        return helpers.message('Email must be from Gmail, Yahoo, or Googlemail.');
      }
      return value;
    })
    .required(),
  dti_number: Joi.string()
    .trim()
    .pattern(/^[0-9]{7,15}$/) // Adjust the pattern based on your DTI number format
    .required()
    .messages({
      'string.base': 'DTI registration number must be a string.',
      'string.empty': 'DTI registration number is required.',
      'string.pattern.base': 'Please enter a valid DTI registration number.',
      'any.required': 'DTI registration number is required.'
    }),
  'documents[business_permit]': Joi.object().unknown(true),
  'documents[dti]': Joi.object().unknown(true),
  'documents[bir]': Joi.object().unknown(true),
  'documents[sanitary_permit]': Joi.object().unknown(true),
  'documents[barangay_clearance]': Joi.object().unknown(true),
  'documents[non_coverage]': Joi.object().unknown(true),
  'documents[dole_registration]': Joi.object().unknown(true),
  court_latitude: Joi.number().required().min(-90).max(90).messages({
    'number.base': 'Court latitude must be a number.',
    'number.empty': 'Court latitude is required.',
    'number.min': 'Court latitude must be between -90 and 90.',
    'number.max': 'Court latitude must be between -90 and 90.',
    'any.required': 'Court latitude is required.'
  }),
  court_longitude: Joi.number().required().min(-180).max(180).messages({
    'number.base': 'Court longitude must be a number.',
    'number.empty': 'Court longitude is required.',
    'number.min': 'Court longitude must be between -180 and 180.',
    'number.max': 'Court longitude must be between -180 and 180.',
    'any.required': 'Court longitude is required.'
  })
});

module.exports = {
  courtRegistrationSchema
};
