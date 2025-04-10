import '../../../css/pages/resetpassword/resetPassword.css';

const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);
const getAll = (selector) => doc.querySelectorAll(selector);
const get = (selector) => doc.querySelector(selector);

// Function to show error messages
const showError = (errorElementId, message) => {
  const errorElement = getById(errorElementId);
  errorElement.textContent = message;
  errorElement.classList.add('show'); // Add the class to show the error
  errorElement.style.display = 'block'; // Ensure the error is displayed

  // Hide the error message after 2000ms
  setTimeout(() => {
    errorElement.classList.remove('show');
    errorElement.style.display = 'none'; // hide the error element
    errorElement.textContent = ''; // clear the message
  }, 2000);
};

// Function to handle form submission
const handleFormSubmit = async (event) => {
  event.preventDefault();

  const newPassword = getById('new-password').value;
  const confirm_password = getById('confirm-password').value;
  const token = new URLSearchParams(window.location.search).get('token'); // get token from URL

  // Simple validation
  if (newPassword.length < 8) {
    showError('new-password-error', 'Password must be at least 8 characters long.');
    return;
  }

  if (newPassword !== confirm_password) {
    showError('confirm-password-error', 'Passwords do not match.');
    return;
  }

  try {
    const response = await fetch('/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` // Pass the token in the Authorization header
      },
      body: JSON.stringify({ newPassword, confirm_password })
    });

    const data = await response.json();

    if (data.success) {
      alert('Password reset successfully');
      // Optionally redirect the user or show a success message
      window.location.href = '/login';
    } else {
      showError('new-password-error', data.message); // Show the error message from the server
    }
  } catch (err) {
    error('Error during password reset:', err);
    showError('new-password-error', 'An error occurred while resetting the password.'); // Generic error message
  }
};

// Attach event listener to the form
doc.addEventListener('DOMContentLoaded', () => {
  const form = getById('changePassForm');

  form.addEventListener('submit', handleFormSubmit);
});
