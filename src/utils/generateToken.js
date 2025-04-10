const crypto = require('crypto');
const User = require('../models/User');
const { log, error } = console;

/**
 * Generates an access token for a user.
 * @param {String} userId - The ID of the user for whom to generate the access token.
 * @returns {String} - The generated access token.
 */
const generateAccessToken = async (userId) => {
  try {
    // Find the user by ID in the database
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Generate an access token
    const accessToken = user.generateToken('access');

    // Return the generated access token
    return accessToken;
  } catch (err) {
    // Handle any errors that occur during the process
    error('Error generating access token:', err.message);
    return null; // Return null instead of throwing an error
  }
};

/**
 * Generates a refresh token for a user and saves it in the database.
 * @param {String} userId - The ID of the user for whom to generate the refresh token.
 * @returns {String} - The generated refresh token.
 */
const generateRefreshToken = async (userId) => {
  try {
    // Find the user by ID in the database
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Generate a refresh token
    const refreshToken = user.generateToken('refresh');

    // Save the refresh token to the user in the database
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // Return the generated refresh token
    return refreshToken;
  } catch (err) {
    // Handle any errors that occur during the process
    error('Error generating refresh token:', err.message);
    return null; // Return null instead of throwing an error
  }
};

/**
 * Generates a new verification token for the user.
 * @param {string} email - The user's email.
 * @returns {Promise<string>} - A promise that resolves with the new token after it's updated in the database.
 */
const generateNonce = async (email, purpose) => {
  const nonce = crypto.randomBytes(16).toString('hex');

  let updateFields = {};

  switch (purpose) {
    case 'verification':
      updateFields = { verificationNonce: nonce };
      break;
    case 'passwordReset':
      updateFields = { resetPasswordNonce: nonce };
      break;
    case 'courtRegistration':
      updateFields = { courtRegistrationNonce: nonce };
      break;
    // Add more cases for other purposes if needed
    default:
      throw new Error('Invalid purpose provided for nonce generation');
  }

  await User.updateOne({ email }, updateFields);
  return nonce;
};

// Export all functions for use in other parts of your application
module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateNonce
};
