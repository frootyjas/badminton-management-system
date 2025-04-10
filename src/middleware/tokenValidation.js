const jwt = require('jsonwebtoken');
const config = require('config');
const User = require('../models/User');
const { log, error } = console;
const createError = require('http-errors');
const { isTokenBlacklisted } = require('../utils/blackListUtils');

const checkResetToken = async (req, res, next) => {
  const token = req.query.token; // get the token from the query parameters

  if (!token) {
    return res.redirect('/login'); // redirect if no token is provided
  }

  const isBlacklistedToken = await isTokenBlacklisted(token, 'reset');
  if (isBlacklistedToken) {
    // return next(createError(401, 'This session has been revoked. Please log in again.'));
    return res.redirect('/login'); // redirect if no token is provided
  }

  // verify the token
  jwt.verify(token, config.get('jwtSecret'), async (err, decoded) => {
    if (err) {
      return res.redirect('/login'); // redirect if token is invalid
    }

    // check if the user exists
    try {
      const user = await User.findById(decoded.id); // Fetch user by ID
      if (!user) {
        return res.redirect('/login'); // redirect if user is not found
      }

      // Check if the reset password nonce matches
      if (decoded.nonce !== user.resetPasswordNonce) {
        return res.redirect('/login'); // redirect if nonce does not match
      }

      // Check if the reset token has expired
      if (Date.now() > user.resetPasswordExpires) {
        return res.redirect('/login'); // redirect if the token has expired
      }

      // Attach user ID to request object for further use
      req.userId = decoded.id;
      next(); // Call the next middleware or route handler
    } catch (err) {
      error('Error during user lookup:', err);
      return res.redirect('/login'); // Redirect if an error occurs
    }
  });
};

// middleware to check if the user has permission to access /register/court
const checkCourtAccess = async (req, res, next) => {
  const token = req.query.token; // get the token from query parameters or headers

  if (!token) {
    return res.redirect('/login'); // redirect if no token is provided
  }

  const isBlacklistedToken = await isTokenBlacklisted(token, 'courtAccess');
  if (isBlacklistedToken) {
    return res.redirect('/login'); // redirect if token is blacklisted
  }

  // verify the token
  jwt.verify(token, config.get('jwtSecret'), async (err, decoded) => {
    if (err) {
      return res.redirect('/login'); // redirect if token is invalid
    }

    try {
      // Fetch the user by ID from the token
      const user = await User.findById(decoded.id).select('+isAdmin');
      if (!user) {
        return res.redirect('/login'); // redirect if user is not found
      }

      // Check if the court registration nonce matches
      if (decoded.nonce !== user.courtRegistrationNonce) {
        return res.redirect('/login'); // redirect if nonce does not match
      }

      // Check if the user has permission (we can customize this condition)
      if (!user.isAdmin || user.hasRegisteredCourt) {
        return res.redirect('/login'); // redirect if already registered
      }

      // Attach user ID to request for further processing
      req.userId = decoded.id;

      next(); // Call the next middleware or route handler
    } catch (err) {
      error('Error during user lookup:', err);
      return res.redirect('/login'); // redirect on error
    }
  });
};

const checkVerificationToken = async (req, res, next) => {
  const token = req.query.token; // get the token from the query parameters

  if (!token) {
    return res.redirect('/login'); // redirect if no token is provided
  }

  const isBlacklistedToken = await isTokenBlacklisted(token, 'verify');
  if (isBlacklistedToken) {
    log('token blacklisted');
    return res.redirect('/login'); // redirect if no token is provided
  }

  // verify the token
  jwt.verify(token, config.get('jwtSecret'), async (err, decoded) => {
    if (err) {
      return res.redirect('/login'); // redirect if token is invalid
    }

    // check if the user exists
    try {
      const user = await User.findOne({ email: decoded.email }); // Fetch user by ID
      if (!user) {
        return res.redirect('/login'); // redirect if user is not found
      }

      // Check if the reset password nonce matches
      if (decoded.nonce !== user.verificationNonce) {
        return res.redirect('/login'); // redirect if nonce does not match
      }

      next(); // Call the next middleware or route handler
    } catch (err) {
      error('Error during user lookup:', err);
      return res.redirect('/login'); // Redirect if an error occurs
    }
  });
};

module.exports = {
  checkResetToken,
  checkVerificationToken,
  checkCourtAccess
};
