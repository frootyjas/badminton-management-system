const User = require('../models/User');
const { deleteFromR2 } = require('../services/r2Service');

/**
 * Deletes all associated files when a user account is deleted.
 * @param {ObjectId} userId - The ID of the user being deleted.
 * @returns {Promise<void>} - A promise that resolves when the operation is complete.
 * @throws {Error} - Throws an error if the deletion fails.
 */
const deleteUserFilesAndProfilePhoto = async (userId) => {
  try {
    // Find the user by ID to retrieve their associated files and profile photo
    const user = await User.findById(userId).populate('court');

    console.log(user);

    if (!user) {
      throw new Error('User not found');
    }

    const filesToDelete = []; // Array to hold files to delete

    // Gather court images from the user's court
    if (user.court) {
      // Include court images
      if (user.court.court_images) {
        filesToDelete.push(...user.court.court_images);
      }

      // Include facility images
      if (user.court.facility_images) {
        filesToDelete.push(...user.court.facility_images);
      }

      // Include documents
      if (user.court.documents) {
        Object.values(user.court.documents).forEach((doc) => filesToDelete.push(doc));
      }

      // Include business logo
      if (user.court.business_logo) {
        filesToDelete.push(user.court.business_logo);
      }
    }

    // Include admin profile photo
    if (user.profile_photo) {
      filesToDelete.push(user.profile_photo);
    }

    console.log('Files before filtering:', filesToDelete);

    // Filter and map the files to delete
    const filteredFilesToDelete = filesToDelete
      .filter((fileName) => fileName.startsWith('/user/data')) // Keep only files starting with /user/data
      .map((fileName) => fileName.replace('/user/data/', '')); // Remove the prefix

    console.log('Filtered files to delete:', filteredFilesToDelete);

    // Delete each file from R2 and the database
    for (const fileName of filteredFilesToDelete) {
      await deleteFromR2(fileName);
    }
  } catch (err) {
    console.error('Error deleting user files and profile photo:', err);
    throw new Error('Failed to delete user files: ' + err.message);
  }
};

module.exports = {
  deleteUserFilesAndProfilePhoto
};
