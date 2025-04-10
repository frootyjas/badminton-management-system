const { assignFileAccess } = require('./assignFileAccess');
/**
 * Assigns access permissions to a file for the admin.
 * @param {Object} file - The file document to which access will be assigned.
 * @param {ObjectId} adminId - The ID of the admin user who will own the file.
 * @returns {Promise<void>} - A promise that resolves when the operation is complete.
 * @throws {Error} - Throws an error if the assignment fails.
 */
const assignFileToAdmin = async (file, adminId, category) => {
  const accessibleUsers = [adminId]; // User who uploaded should have access
  let roleBasedAccess = [];

  switch (category) {
    case 'businessLogo':
      roleBasedAccess = ['admin', 'coach', 'player', 'superadmin'];
      file.isPublic = true;
      break;
    case 'courtImage':
      roleBasedAccess = ['admin', 'coach', 'player', 'superadmin'];
      file.isPublic = false;
      break;
    case 'facilityImage':
      roleBasedAccess = ['admin', 'coach', 'player', 'superadmin'];
      file.isPublic = false;
      break;
    case 'announcementImage':
      roleBasedAccess = ['admin', 'coach', 'player', 'superadmin'];
      file.isPublic = false;
      break;
    case 'eventImage':
      roleBasedAccess = ['admin', 'coach', 'player', 'superadmin'];
      file.isPublic = false;
      break;
    case 'businessDocuments':
      roleBasedAccess = ['superadmin'];
      file.isPublic = false;
      break;
    case 'productImage':
      roleBasedAccess = ['admin', 'coach', 'player', 'superadmin'];
      file.isPublic = false;
      break;
    case 'membershipImage':
      roleBasedAccess = ['admin', 'coach', 'player', 'superadmin'];
      file.isPublic = false;
      break;
    default:
      roleBasedAccess = []; // No specific roles
      file.isPublic = false;
      break;
  }

  await assignFileAccess(file, adminId, roleBasedAccess, accessibleUsers);
};

/**
 * Assigns access permissions to a file for regular users.
 * @param {Object} file - The file document to which access will be assigned.
 * @param {ObjectId} userId - The ID of the user who will own the file.
 * @returns {Promise<void>} - A promise that resolves when the operation is complete.
 * @throws {Error} - Throws an error if the assignment fails.
 */
const assignFileToUser = async (file, userId) => {
  const accessibleUsers = [userId]; // user who uploaded should have access
  const roleBasedAccess = []; // no specific roles for users
  file.isPublic = false; // default to not public for users

  await assignFileAccess(file, userId, roleBasedAccess, accessibleUsers);
};

module.exports = {
  assignFileToAdmin,
  assignFileToUser
};
