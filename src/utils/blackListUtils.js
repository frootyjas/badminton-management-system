const jwt = require('jsonwebtoken');
const Blacklist = require('../models/Blacklist');
const config = require('config');
const { log, error } = console;

/**
 * Adds a token to the blacklist with an expiration date.
 *
 * @param {string} token - The token to be blacklisted.
 * @param {string} type - The type of the token ('access' or 'refresh').
 */

async function addToBlacklist(token, type) {
  const tokenSecrets = {
    access: config.jwtSecret,
    refresh: config.jwtRefreshSecret
    // We can add more token types if needed, e.g., 'verify', 'reset'
  };

  // Determine the secret based on the type, default to `jwtSecret` if not found
  const secret = tokenSecrets[type] || config.jwtSecret;

  try {
    const decoded = jwt.verify(token, secret);

    let expiresAt;
    if (decoded && decoded.exp) {
      expiresAt = new Date(decoded.exp * 1000); // JWT exp is in seconds
    }

    // Create the blacklist entry with the expiration date
    await Blacklist.create({ token, type, expiresAt });
  } catch (err) {
    error('Error blacklisting token:', err.message);
  }
}
/**
 * Checks if a token is blacklisted and removes it if expired.
 *
 * @param {string} token - The token to check.
 * @param {string} type - The type of the token ('access' or 'refresh').
 * @returns {Promise<boolean>} - Returns true if the token is blacklisted; false if not.
 */
async function isTokenBlacklisted(token, type) {
  const blacklistedToken = await Blacklist.findOne({ token, type });

  // If token is blacklisted but expired, remove it and return false
  if (blacklistedToken && new Date() > blacklistedToken.expiresAt) {
    await Blacklist.deleteOne({ token });
    return false;
  }

  return !!blacklistedToken;
}

module.exports = {
  addToBlacklist,
  isTokenBlacklisted
};
