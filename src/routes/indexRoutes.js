const express = require('express');
const router = express.Router();
const path = require('path');
const serveFile = require('../utils/fileUtils');
const checkMongoConnection = require('../middleware/checkMongoConnection');
const { checkResetToken, checkVerificationToken, checkCourtAccess } = require('../middleware/tokenValidation');
const checkAuth = require('../middleware/checkAuth');
const verifyToken = require('../middleware/authJwt');

const { serveData } = require('../controllers/userController');
const { createRateLimiter } = require('../middleware/rateLimiter');
const { checkFilePermissions } = require('../middleware/checkFilePermission');
const verifyPayPalSignature = require('../middleware/verifyPaypalSignature');
const { paypalWebhookHandler } = require('../controllers/authController');

const limiter = createRateLimiter(15 * 60 * 1000, 100);

let routes = (app) => {
  router.get('/', checkAuth, (req, res, next) => {
    const filePath = path.resolve(__dirname, '../../build/index.html');
    serveFile(filePath, res, next);
  });

  app.post('/paypal-webhook', verifyPayPalSignature, paypalWebhookHandler);

  router.get('/ping', verifyToken, (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json({ message: 'pong!' });
  });

  router.get('/data/:filename', checkFilePermissions, limiter, serveData);

  // serve the registration page
  router.get('/register', checkAuth, checkMongoConnection, (req, res, next) => {
    const filePath = path.resolve(__dirname, '../../build/signup.html');
    serveFile(filePath, res, next);
  });

  // serve the court registration page
  router.get('/register/courts', checkCourtAccess, checkMongoConnection, (req, res, next) => {
    const filePath = path.resolve(__dirname, '../../build/courtregistration.html');
    serveFile(filePath, res, next);
  });

  // serve the reset-password page
  router.get('/reset-password', checkMongoConnection, checkResetToken, async (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    const filePath = path.resolve(__dirname, '../../build/resetpassword.html');
    serveFile(filePath, res, next);
  });

  // serve the verification page
  router.get('/verification', checkMongoConnection, checkVerificationToken, async (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    const filePath = path.resolve(__dirname, '../../build/verification.html');
    serveFile(filePath, res, next);
  });

  // serve the login page
  router.get('/login', checkAuth, checkMongoConnection, (req, res, next) => {
    const filePath = path.resolve(__dirname, '../../build/signin.html');
    serveFile(filePath, res, next);
  });

  app.use('/', router);
};

module.exports = routes;
