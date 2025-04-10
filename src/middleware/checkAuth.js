const jwt = require('jsonwebtoken');
const config = require('config');
const { isTokenBlacklisted } = require('../utils/blackListUtils');
const createError = require('http-errors');

const checkAuth = async (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return next(); // If no token, proceed to the next middleware (public route)
  }

  try {
    // Check if token is blacklisted
    const blacklistedToken = await isTokenBlacklisted(token, 'access');
    if (blacklistedToken) {
      return res.redirect('/login'); // Redirect to login if token is blacklisted
    }

    // verify the token
    const decoded = jwt.verify(token, config.get('jwtSecret'));
    req.user = decoded; // Store user information in the request object

    // redirect based on user role
    switch (decoded.role) {
      case 'player':
        return res.redirect('/user/dashboard');
      case 'coach':
        return res.redirect('/user/dashboard');
      case 'admin':
        return res.redirect('/user/admin/view-post');
      case 'superadmin':
        return res.redirect('/superadmin/dashboard');
      default:
        // Handle the case where the role is unknown or invalid
        return next(createError(403, 'Role not authorized'));
    }
  } catch (err) {
    // if token is invalid, proceed to next middleware (public route)
    console.error('JWT verification failed:', err);
  }
  // proceed to the next middleware if no redirection occurred
  next();
};

module.exports = checkAuth;
