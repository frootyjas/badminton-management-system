const express = require('express');
const router = express.Router();
const checkMongoConnection = require('../middleware/checkMongoConnection');
const {
  validateVerify,
  validateLogin,
  validateRegistration,
  validateForgotPassword,
  validateResetPassword,
  validateCourtRegistration
} = require('../middleware/validator');
const verifyToken = require('../middleware/authJwt');
const {
  loginUser,
  logoutUser,
  refreshToken,
  registerUser,
  verifyEmail,
  deleteAccount,
  forgotPassword,
  resetPassword,
  registerCourt
} = require('../controllers/authController');
const { createRateLimiter } = require('../middleware/rateLimiter');

const limiter = createRateLimiter(15 * 60 * 1000, 15);

let routes = (app) => {
  // handle the verification
  router.post('/verify', checkMongoConnection, validateVerify, verifyEmail);

  // handle Registration
  router.post('/register', checkMongoConnection, validateRegistration, registerUser);

  // handle login
  router.post('/login', checkMongoConnection, validateLogin, loginUser);

  // handle court registration
  router.post('/register/courts', checkMongoConnection, validateCourtRegistration, registerCourt);
  // handle logout
  router.post('/logout', checkMongoConnection, verifyToken, logoutUser);

  // handle refresh token
  router.post('/refresh', checkMongoConnection, refreshToken);

  // handle account deletion
  router.delete('/delete', checkMongoConnection, verifyToken, deleteAccount);

  // handle account forgot-password with rate limiting
  router.post('/forgot-password', checkMongoConnection, limiter, validateForgotPassword, forgotPassword);

  // handle account reset-password with rate limiting
  router.post('/reset-password', checkMongoConnection, limiter, validateResetPassword, resetPassword);

  app.use('/auth', router);
};

module.exports = routes;
