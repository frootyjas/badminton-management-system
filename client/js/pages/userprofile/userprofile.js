import '../../../css/components/footer.css';
import '../../../css/components/navBarUser.css';
import '../../../css/components/preloader.css';
import '../../../css/pages/userprofile/userProfile.css';
import { startSessionChecks, validateSessionAndNavigate } from '../../../utils/sessionUtils.js';
import '../../components/navBarUser.js';
import { setupLogoutListener } from '../../global/logout.js';

setupLogoutListener();

const doc = document;
const { error } = console;

const getById = (id) => doc.getElementById(id);
const getAll = (selector) => doc.querySelectorAll(selector);
const get = (selector) => doc.querySelector(selector);

// Start session checks on page load
startSessionChecks();

// Initialize input fields and store them in a variable
const userProfileFields = {
  username: getById('username'),
  firstName: getById('firstName'),
  middleName: getById('middleName'),
  lastName: getById('lastName'),
  gender: getById('gender'),
  birthday: getById('birthday'),
  phoneNumber: getById('phoneNumber'),
  email: getById('email'),
  status: getById('status'),
  municipality: getById('municipality'),
  userType: getById('user_type'),
  profilePic: getById('profilePic'),
  imageUpload: getById('imageUpload'),
  cameraIcon: getById('cameraIcon')
};

// Function to capitalize the first letter of a string
function capitalizeFirstLetter(string) {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

// Function to fetch user profile data and populate fields
function fetchUserProfile() {
  fetch('/user/me', {
    method: 'GET',
    credentials: 'include' // Ensures cookies are sent
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      userProfileFields.username.value = data.username || 'Username'; // Default username
      userProfileFields.firstName.value = data.first_name || '';
      userProfileFields.middleName.value = data.middle_name || '';
      userProfileFields.lastName.value = data.last_name || '';
      userProfileFields.gender.value = data.gender ? capitalizeFirstLetter(data.gender) : '';
      userProfileFields.birthday.value = data.date_of_birth
        ? new Date(data.date_of_birth).toISOString().split('T')[0]
        : '';
      userProfileFields.phoneNumber.value = data.contact_number || '';
      userProfileFields.email.value = data.email || '';
      userProfileFields.municipality.value = data.municipality || '';
      userProfileFields.profilePic.src = data.profile_photo || '/assets/images/pic_placeholder.png';
    })
    .catch((err) => {
      error('Error fetching user profile:', err);
      // Optionally handle the error, e.g., show a message to the user
    });
}

// Call the function to fetch user profile on page load
doc.addEventListener('DOMContentLoaded', () => {
  fetchUserProfile();

  getAll('.navbar-item').forEach((item) => {
    item.addEventListener('click', () => {
      const sectionId = item.getAttribute('data-section');
      showSection(sectionId);
    });
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const personalInfoBtn = getById('personalInfoBtn');
  const settingsBtn = getById('settingsBtn');

  if (personalInfoBtn) personalInfoBtn.addEventListener('click', () => showSection('personalInfo'));
  if (settingsBtn) settingsBtn.addEventListener('click', () => showSection('settings'));
});

function showSection(sectionId) {
  getAll('.content-section').forEach((section) => section.classList.remove('active'));
  getById(sectionId).classList.add('active');

  getAll('.navbar-item').forEach((item) => item.classList.remove('active'));
  get(`[data-section="${sectionId}"]`).classList.add('active');
}

// function to handle account deletion confirmation and API request
const handleAccountDeletion = () => {
  const confirmation = window.confirm('Are you sure you want to delete your account? This action is irreversible.');
  if (confirmation) {
    fetch('/auth/delete', {
      method: 'DELETE'
    })
      .then((response) => {
        if (response.ok) {
          alert('Your account has been deleted successfully.');
          // Optionally redirect to a logout or landing page after deletion
          window.location.href = '/login';
        } else {
          return response.json().then((data) => {
            error(data);
            alert(`Failed to delete account: ${data.message}`);
          });
        }
      })
      .catch((err) => {
        error('Error during account deletion:', err);
        alert('An error occurred while trying to delete your account. Please try again later.');
      });
  } else {
    log('User canceled account deletion.');
  }
};

doc.addEventListener('DOMContentLoaded', () => {
  const deleteButton = getById('deleteButton');
  if (deleteButton) {
    deleteButton.addEventListener('click', handleAccountDeletion);
  } else {
    error('Delete button not found.');
  }
});

const editIconBox1 = getById('editIconBox1');
const saveChangesButton = doc.createElement('button');
const cancelButton = doc.createElement('button'); // Add cancel button

// Configure Save Changes button
saveChangesButton.textContent = 'Save Changes';
saveChangesButton.id = 'saveChangesButton';
saveChangesButton.style.display = 'none'; // Initially hidden

// Configure Cancel button
cancelButton.textContent = 'Cancel';
cancelButton.id = 'cancelButton';
cancelButton.style.display = 'none'; // Initially hidden

getById('personalInfo').appendChild(saveChangesButton);
getById('personalInfo').appendChild(cancelButton);

let originalData = {}; // Store the original data

// Make fields editable when clicking the edit icon
editIconBox1.addEventListener('click', () => {
  // Save the original data before making changes
  originalData = {};
  Object.entries(userProfileFields).forEach(([key, field]) => {
    if (field) {
      originalData[key] = field.value;
      if (field.tagName === 'INPUT' || field.tagName === 'SELECT') {
        field.removeAttribute('readonly');
        field.removeAttribute('disabled');
        field.style.border = '1px solid #ccc'; // Add a visual cue
      }
    }
  });
  saveChangesButton.style.display = 'block'; // Show the Save Changes button
  cancelButton.style.display = 'block'; // Show the Cancel button
});

cancelButton.addEventListener('click', () => {
  // Revert fields to original data
  Object.entries(userProfileFields).forEach(([key, field]) => {
    if (field) {
      field.value = originalData[key]; // Restore original value
      if (field.tagName === 'INPUT' || field.tagName === 'SELECT') {
        field.setAttribute('readonly', true);
        field.setAttribute('disabled', true);
        field.style.border = 'none'; // Remove visual cue
      }
    }
  });
  saveChangesButton.style.display = 'none'; // Hide the Save Changes button
  cancelButton.style.display = 'none'; // Hide the Cancel button
});

const profilePic = getById('profilePic');
const imageUpload = getById('imageUpload');
let originalImageSrc = profilePic.src; // Store the original image source

// When the profile picture is clicked, trigger the file input dialog
profilePic.addEventListener('click', () => {
  imageUpload.click(); // Simulate a click on the file input
});

// When a file is selected, update the profile picture and send the request
imageUpload.addEventListener('change', async (event) => {
  const file = event.target.files[0]; // Get the selected file

  if (file) {
    const reader = new FileReader(); // Create a FileReader to preview the image
    reader.onload = async (e) => {
      const newImageSrc = e.target.result; // Temporary store new image source
      const userConfirmed = window.confirm('Do you want to save this new profile picture?');

      if (userConfirmed) {
        profilePic.src = newImageSrc; // Update the UI with the new image

        // Send the image to the server
        const formData = new FormData();
        formData.append('profile_photo', file);

        try {
          const response = await fetch('/user/update', {
            method: 'PUT',
            body: formData // Send the FormData
          });

          const result = await response.json();

          if (response.ok) {
            alert('Profile picture updated successfully.');
          } else {
            alert(`Failed to update profile picture: ${result.message}`);
            profilePic.src = originalImageSrc; // Revert the image
          }
        } catch (error) {
          console.error('Error updating profile picture:', error);
          alert('An error occurred while updating your profile picture.');
          profilePic.src = originalImageSrc; // Revert the image
        }
      } else {
        // Reset file input for future uploads
        imageUpload.value = '';
        alert('No changes were made to your profile picture.');
      }
    };
    reader.readAsDataURL(file); // Read the file as a data URL for preview
  }
});
