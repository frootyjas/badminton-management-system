import validator from 'validator';
import '../../../css/pages/signUp/signUp.css';

const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);
const getAll = (selector) => doc.querySelectorAll(selector);
const get = (selector) => doc.querySelector(selector);

doc.addEventListener('DOMContentLoaded', function () {
  const userForm = getById('userSignUpForm');
  const userSubmitBtn = getById('submitUser');

  userSubmitBtn.disabled = true;

  // Event listener for user form submission
  userForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(userForm);
    const roleType = formData.get('user_type').toLowerCase();

    log(roleType);

    userSubmitBtn.disabled = true;
    await handleFormSubmit(userForm, roleType, userSubmitBtn);
  });

  // Merged handleFormSubmit function
  const handleFormSubmit = async (form, role, submitButton) => {
    const formData = new FormData(form);
    const userObject = buildUserObject(formData, role);
    log(userObject); // log or replace with your custom logger

    try {
      const response = await fetch('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userObject)
      });

      const result = await response.json();
      if (response.status === 201) {
        alert('Registration successful!');
        resetForms();
        window.location.href = result.redirectUrl; // Redirect to verification page
      } else {
        if (result.message === 'Email already exists') {
          alert('The email is already registered. Please try another one.');
        } else {
          alert('Registration failed. Please try again.');
        }
      }
    } catch (err) {
      error('Error:', err);
      alert('An error occurred. Please try again later.');
    } finally {
      if (submitButton) submitButton.disabled = false; // Re-enable the submit button
    }
  };

  // Helper functions for showing and clearing error messages
  function showError(inputId, message) {
    const errorDiv = getById(inputId + '-error');
    if (errorDiv) {
      errorDiv.innerText = message;
      errorDiv.classList.add('show'); // Show the error message
    }
  }

  function clearError(inputId) {
    const inputElement = getById(inputId);
    const errorElement = getById(`${inputId}-error`);

    if (inputElement && errorElement) {
      inputElement.classList.remove('is-invalid');
      errorElement.textContent = '';
    }
  }

  const suffixUser = '-user';
  const userFields = [
    `first-name${suffixUser}`,
    `middle-name${suffixUser}`,
    `last-name${suffixUser}`,
    `email${suffixUser}`,
    `contact-number${suffixUser}`,
    `username${suffixUser}`,
    `password1${suffixUser}`,
    `password2${suffixUser}`
  ];

  const userFieldValidity = {};

  // Initialize validity state for each field
  userFields.forEach((field) => (userFieldValidity[field] = false));

  function validateField(inputId, prefix) {
    const value = getById(inputId)?.value.trim() || '';
    let isValid = true;

    // Validate based on the specific inputId
    switch (inputId) {
      case `first-name${prefix}`:
        if (value.length < 2) {
          showError(inputId, 'First name must be at least 2 characters long.');
          isValid = false;
        } else if (value.length > 30) {
          showError(inputId, 'First name cannot be longer than 30 characters.');
          isValid = false;
        } else if (!validator.isAlpha(value.replace(/\s/g, ''))) {
          showError(inputId, 'First name must only contain alphabetic characters and spaces.');
          isValid = false;
        }
        break;

      case `middle-name${prefix}`:
        if (value.length > 30) {
          showError(inputId, 'Middle name cannot be longer than 30 characters.');
          isValid = false;
        } else if (value.length < 2 && value.length > 0) {
          showError(inputId, 'Middle name must be at least 2 characters long if provided.');
          isValid = false;
        } else if (value.length > 0 && !validator.isAlpha(value.replace(/\s/g, ''))) {
          showError(inputId, 'Middle name must only contain alphabetic characters and spaces.');
          isValid = false;
        }
        break;

      case `last-name${prefix}`:
        if (value.length < 2 || value.length > 30 || !validator.isAlpha(value.replace(/\s/g, ''))) {
          showError(inputId, 'Last name must be 2-30 alphabetic characters.');
          isValid = false;
        }
        break;

      case `email${prefix}`:
        if (!validator.isEmail(value)) {
          showError(inputId, 'Please enter a valid email address.');
          isValid = false;
        } else {
          const validDomains = ['gmail.com', 'yahoo.com', 'googlemail.com'];
          const domain = value.split('@')[1];
          if (!validDomains.includes(domain)) {
            showError(inputId, 'Email must be from Gmail, Yahoo, or Googlemail.');
            isValid = false;
          }
        }
        break;

      case `contact-number${prefix}`:
        if (!validator.matches(value, /^(?:\+63|0)\d{10}$/)) {
          showError(inputId, 'Please enter a valid contact number (e.g., +639XXXXXXXX or 09XXXXXXXXX).');
          isValid = false;
        }
        break;

      case `username${prefix}`:
        if (value.length < 4 || value.length > 30) {
          showError(inputId, 'Username must be between 4 and 30 characters long.');
          isValid = false;
        } else if (!validator.isAlphanumeric(value)) {
          showError(inputId, 'Username can only contain letters and numbers.');
          isValid = false;
        }
        break;

      case `password1${prefix}`:
        if (value.length < 8 || !validator.matches(value, /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/)) {
          showError(
            inputId,
            'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
          );
          isValid = false;
        }
        break;

      case `password2${prefix}`:
        const passwordValue = getById(`password1${prefix}`).value.trim();
        if (value !== passwordValue) {
          showError(inputId, 'Confirm password must match password.');
          isValid = false;
        }
        break;

      default:
        break;
    }

    // Clear errors if the field is valid
    if (isValid) {
      clearError(inputId);
    }

    // Update the validity state for the field
    if (prefix === suffixUser) {
      userFieldValidity[inputId] = isValid;
    }
  }

  function checkAllFields(validityState, submitBtn, form) {
    const allValid = Object.values(validityState).every((isValid) => isValid);
    const formValid = form.checkValidity();

    log('allValid: ', allValid);
    log('formValid: ', formValid);

    submitBtn.disabled = !(allValid && formValid);
  }

  userFields.forEach((field) => {
    const inputElement = getById(field);
    if (inputElement) {
      inputElement.addEventListener('input', () => {
        validateField(field, suffixUser);
        checkAllFields(userFieldValidity, userSubmitBtn, userForm);
      });
    }
  });

  const resetForms = () => {
    userForm.reset();
    getAll('.error-message').forEach((errorElement) => {
      errorElement.textContent = '';
      errorElement.classList.remove('show');
    });
    userSubmitBtn.disabled = true;
    Object.keys(userFieldValidity).forEach((key) => (userFieldValidity[key] = false));
  };

  resetForms();

  const buildUserObject = (formData, role) => {
    const suffix = '_user';

    // Build the user object
    const userObject = {
      first_name: formData.get(`first_name${suffix}`).trim(),
      middle_name: formData.get(`middle_name${suffix}`).trim(),
      last_name: formData.get(`last_name${suffix}`).trim(),
      email: formData.get(`email${suffix}`).trim(),
      username: formData.get(`username${suffix}`).trim(),
      password: formData.get(`password1${suffix}`).trim(),
      confirm_password: formData.get(`password2${suffix}`).trim(),
      gender: formData.get(`gender${suffix}`).trim(),
      date_of_birth: formData.get(`date_of_birth${suffix}`).trim(),
      municipality: formData.get(`municipality${suffix}`).trim(),
      contact_number: formData.get(`contact_number${suffix}`).trim(),
      role: role || formData.get(`role${suffix}`)?.trim()
    };
    log(userObject);

    return userObject;
  };
});
