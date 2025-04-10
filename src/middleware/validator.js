const { verifySchema } = require('../validation/userVerifyValidatorSchema');
const { registrationSchema } = require('../validation/userRegValidatorSchema');
const { loginSchema } = require('../validation/loginValidatorSchema');
const { resetPasswordSchema } = require('../validation/resetPassValidatorSchema');
const { forgotPasswordSchema } = require('../validation/forgotPassValidatorSchema');
const { userIdSchema } = require('../validation/userIdValidatorSchema');
const { updateSchema } = require('../validation/userUpdateValidatorSchema');
const { courtRegistrationSchema } = require('../validation/courtRegValidatorSchema');
const {
  validateTournament,
  validateAnnouncement,
  validateEvent
} = require('../validation/announcementEventValidatorSchema');

/**
 * Middleware to validate user verification input.
 */
const validateVerify = (req, res, next) => {
  const { error } = verifySchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      errors: error.details.map((err) => ({
        message: err.message,
        path: err.path[0]
      }))
    });
  }
  next();
};

/**
 * Middleware to validate user registration input.
 */
const validateRegistration = (req, res, next) => {
  const { error } = registrationSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      errors: error.details.map((err) => ({
        message: err.message,
        path: err.path[0]
      }))
    });
  }
  next();
};

/**
 * Middleware to validate user login input.
 */
const validateLogin = (req, res, next) => {
  const { error } = loginSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      errors: error.details.map((err) => ({
        message: err.message,
        path: err.path[0]
      }))
    });
  }
  next();
};
/**
 * Middleware to validate forgot password input.
 */
const validateForgotPassword = (req, res, next) => {
  const { error } = forgotPasswordSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      errors: error.details.map((err) => ({
        message: err.message,
        path: err.path[0]
      }))
    });
  }
  next();
};

/**
 * Middleware to validate reset password input.
 */
const validateResetPassword = (req, res, next) => {
  const { error } = resetPasswordSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      errors: error.details.map((err) => ({
        message: err.message,
        path: err.path[0]
      }))
    });
  }
  next();
};
/**
 * Middleware to validate user ID input.
 */
const validateUserId = (req, res, next) => {
  const { error } = userIdSchema.validate(req.params, { abortEarly: false }); // Validate user ID from request parameters

  if (error) {
    return res.status(400).json({
      errors: error.details.map((err) => ({
        message: err.message,
        path: err.path[0]
      }))
    });
  }
  next();
};

/**
 * Middleware to user update input.
 */
const validateUserInfo = (req, res, next) => {
  const { error } = updateSchema.validate(req.body, { abortEarly: false }); // Validate user ID from request parameters

  if (error) {
    return res.status(400).json({
      errors: error.details.map((err) => ({
        message: err.message,
        path: err.path[0]
      }))
    });
  }
  next();
};

/**
 * Middleware to validate court registration input.
 */
const validateCourtRegistration = (req, res, next) => {
  const { error } = courtRegistrationSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      errors: error.details.map((err) => ({
        message: err.message,
        path: err.path[0]
      }))
    });
  }
  next();
};

/**
 * Middleware to validate announcement input.
 */
const validateAnnouncementPost = (req, res, next) => {
  const { error } = validateAnnouncement.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      errors: error.details.map((err) => ({
        message: err.message,
        path: err.path[0]
      }))
    });
  }
  next();
};

/**
 * Middleware to validate event input.
 */
const validateEventPost = (req, res, next) => {
  const { error } = validateEvent.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      errors: error.details.map((err) => ({
        message: err.message,
        path: err.path[0]
      }))
    });
  }
  next();
};

/**
 * Middleware to validate tournament input.
 */
const validateTournamentPost = (req, res, next) => {
  const { error } = validateTournament.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      errors: error.details.map((err) => ({
        message: err.message,
        path: err.path[0]
      }))
    });
  }
  next();
};

module.exports = {
  validateVerify,
  validateRegistration,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateUserId,
  validateUserInfo,
  validateCourtRegistration,
  validateAnnouncementPost,
  validateEventPost,
  validateTournamentPost
};
