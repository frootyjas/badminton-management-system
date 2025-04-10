const createError = require('http-errors'); // Ensure to require http-errors
const File = require('../models/File'); // Adjust the import path as needed

/**
 * Middleware to check file permissions.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 */
const checkFilePermissions = async (req, res, next) => {
  const { filename } = req.params;
  const userId = req.user ? req.user.id : null; // Handle case if req.user is not set

  try {
    // Find the file and populate the owner field (if necessary)
    const file = await File.findOne({ fileName: filename }).populate('owner');

    if (!file) {
      return next(createError(404, 'File not found')); // File not found
    }

    // Check if the file is public and grant access if it is
    if (file.isPublic) {
      return next(); // Access granted for public files
    }

    // If user is not authenticated, deny access
    if (!userId) {
      return next(createError(401, 'Authentication required')); // Authentication required
    }

    // Check if the user is the owner
    if (file.owner.id.toString() === userId.toString()) {
      return next(); // Access granted
    }

    // Check if the user is in the accessibleBy array
    if (file.accessibleBy.includes(userId)) {
      return next(); // Access granted
    }

    // Check if the user's role is permitted
    const userRole = req.user.role; // Assuming user role is part of req.user
    if (file.accessibleRoles.includes(userRole)) {
      return next(); // Access granted
    }
    console.log(file);

    // If none of the conditions are met, deny access
    return next(createError(403, 'Access denied')); // Deny access with a custom error
  } catch (err) {
    console.error('Error checking file permissions:', err);
    return next(createError(500, 'Internal Server Error')); // Handle internal server errors
  }
};

module.exports = { checkFilePermissions };
