/**
 * Assigns access permissions to a file.
 * @param {Object} file - The file document to which access will be assigned.
 * @param {ObjectId} ownerId - The ID of the user who owns the file.
 * @param {Array<String>} roleBasedAccess - An array of roles that will have access to the file.
 * @param {Array<ObjectId>} accessibleUsers - An array of user IDs that will have direct access to the file.
 * @returns {Promise<void>} - A promise that resolves when the operation is complete.
 * @throws {Error} - Throws an error if the assignment fails.
 */
const assignFileAccess = async (file, ownerId, roleBasedAccess, accessibleUsers) => {
  try {
    // Validate the input parameters
    if (!file || !ownerId) {
      throw new Error('File and owner ID are required');
    }

    // Assign the file owner
    file.owner = ownerId;

    // Assign role-based access if provided
    if (Array.isArray(roleBasedAccess)) {
      file.accessibleRoles = roleBasedAccess;
    } else {
      throw new Error('Role-based access must be an array');
    }

    // Assign users with direct access if provided
    if (Array.isArray(accessibleUsers)) {
      file.accessibleBy = accessibleUsers;
    } else {
      throw new Error('Accessible users must be an array');
    }

    // Save the file document with updated permissions
    await file.save();
  } catch (err) {
    console.error('Error assigning file access:', err);
    throw new Error('Failed to assign file access: ' + err.message);
  }
};

module.exports = { assignFileAccess };
