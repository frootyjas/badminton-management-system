const jwt = require('jsonwebtoken');
const User = require('../models/User');
const createError = require('http-errors');
const config = require('config');
const { isTokenBlacklisted } = require('../utils/blackListUtils');
const Superadmin = require('../models/SuperAdmin');

const verifyToken = async (req, res, next) => {
  try {
    // Get the session cookie
    const authHeader = req.headers['cookie'];

    // If neither are present, send an Unauthorized error
    if (!authHeader) return next(createError(401, 'Unauthorized'));

    let token;

    // If it's from the cookie, extract the token from the correct cookie name
    if (req.headers['cookie']) {
      // Split the cookie string into key-value pairs
      const cookies = authHeader.split(';').reduce((acc, cookie) => {
        const [name, value] = cookie.trim().split('=');
        acc[name] = value;
        return acc;
      }, {});

      token = cookies['accessToken'];
    }

    // check if token is blacklisted
    const blacklistedToken = await isTokenBlacklisted(token, 'access');
    if (blacklistedToken) {
      return next(createError(401, 'This session has been revoked. Please log in again.'));
    }

    jwt.verify(token, config.jwtSecret, async (err, decoded) => {
      if (err) {
        return next(createError(401, 'This session has expired. Please Login.'));
      }

      const { id, role } = decoded;

      console.log(id);

      // if the user is a superadmin, check the Superadmin model
      if (role === 'superadmin') {
        const superAdmin = await Superadmin.findById(id);

        if (!superAdmin) {
          return next(createError(404, 'Superadmin not found.'));
        }

        // if superadmin is found, attach their info to the request
        req.user = { ...superAdmin.toJSON(), isSuperAdmin: true };
        return next(); // Continue to next middleware or route handler
      }

      // if the user is not a superadmin, check the User model
      const user = await User.findById(id);

      if (!user) {
        return next(createError(404, 'User not found.'));
      }

      // attach user info to the request object
      req.user = { ...user.toJSON(), isSuperAdmin: false };
      next();
    });
  } catch (err) {
    console.error('Error occurred during token verification:', err);
    return next(createError(500, 'Internal Server Error'));
  }
};

module.exports = verifyToken;
