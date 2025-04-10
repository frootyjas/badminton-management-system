import '../../../css/pages/signIn/signIn.css';

const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);
const getAll = (selector) => doc.querySelectorAll(selector);
const get = (selector) => doc.querySelector(selector);
const loginBtn = getById('loginBtn');

doc.addEventListener('DOMContentLoaded', function () {
  const modal = getById('modal');
  const openModalButton = getById('open-modal');
  const closeModalButton = getById('close-modal');

  openModalButton.addEventListener('click', function (event) {
    event.preventDefault();
    modal.style.display = 'flex';
  });

  closeModalButton.addEventListener('click', function (event) {
    event.preventDefault();
    modal.style.display = 'none';
  });

  // forgot Password Form Submission
  const forgotPasswordForm = getById('forgotPasswordForm');
  const forgotSubmitBtn = getById('forgotSubmitBtn');
  forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = getById('verification-email').value.trim();
    const emailError = getById('verification-email-error');

    if (!email) {
      log('Please enter a valid email.');
      emailError.innerText = 'Email is required';
      emailError.classList.add('show');

      setTimeout(() => {
        emailError.classList.remove('show');
      }, 2000);

      return;
    }
    forgotSubmitBtn.disabled = true;

    // encode email in Base64
    const encodedEmail = btoa(email); // Base64 encoding

    try {
      const response = await fetch('/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: encodedEmail
        })
      });

      const result = await response.json();
      if (response.status === 200 && result.success) {
        forgotSubmitBtn.disabled = false;
        log('Reset link sent successfully:', result.message);
        alert('A password reset link has been sent to your email.');
        modal.style.display = 'none'; // close modal after successful request
      } else {
        forgotSubmitBtn.disabled = false;
        log('Failed to send reset link:', result.message);
        emailError.innerText = result.message;
        emailError.classList.add('show');

        setTimeout(() => {
          emailError.classList.remove('show');
        }, 2000);
      }
    } catch (err) {
      forgotSubmitBtn.disabled = false;
      error('Error sending reset link:', err);
      emailError.innerText = 'An error occurred. Please try again.';
      emailError.classList.add('show');

      setTimeout(() => {
        emailError.classList.remove('show');
      }, 2000);
    }
  });

  const loginForm = getById('loginform');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const username = formData.get('username');
    const password = formData.get('password');
    const userType = formData.get('userType');

    // attempt to log in
    loginBtn.disabled = true;
    await sendLoginRequest(username, password, userType);
  });
});

const sendLoginRequest = async (username, password, role) => {
  const loginError = getById('login-errors');
  try {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        password,
        role
      })
    });

    const result = await response.json();

    if (response.status === 200 && result.success) {
      // handle different actions based on the response from the backend
      if (result.action === 'verify') {
        // redirect to verification page
        window.location.href = result.verificationUrl;
      } else if (result.action === 'incomplete') {
        // redirect to court registration page
        window.location.href = result.redirectUrl;
      } else if (result.action === 'redirect') {
        // redirect to the role-specific page
        window.location.href = result.redirectUrl;
        console.log(window.location.href = result.redirectUrl)
      }
      loginBtn.disabled = false;
    } else {
      // show an error message to the user
      if (result.message && result.message === 'User not found.') {
        loginError.innerText = 'User not found';
        loginError.classList.add('show');
      } else if (result.message && result.message === 'Invalid username or password') {
        loginError.innerText = 'Invalid username or password';
        loginError.classList.add('show');
      } else if (result.message && result.message === 'User role does not match the specified role') {
        loginError.innerText = 'User role does not match the specified role';
        loginError.classList.add('show');
      } else if (response.status === 403 && result.message === 'Court registration is still pending approval.') {
        loginError.innerText = 'Your court registration is still pending approval.';
        loginError.classList.add('show');
      } else if (response.status === 409 && result.message === 'Your court registration has been rejected.') {
        loginError.innerText = 'Your court registration has been rejected.';
        loginError.classList.add('show');
      } else if (response.status === 401 && result.message === 'Superadmin not found.') {
        loginError.innerText = 'Superadmin not found.';
        loginError.classList.add('show');
      } else if (result.message && result.message === 'Invalid email or password for admin') {
        loginError.innerText = 'Invalid email or password for admin';
        loginError.classList.add('show');
      } else {
        loginError.innerText = 'An error occurred while logging in.';
        loginError.classList.add('show');
      }

      setTimeout(() => {
        loginError.classList.remove('show');
      }, 2000);

      loginBtn.disabled = false;
    }
  } catch (err) {
    loginBtn.disabled = false;
    error('Error logging in:', err);
    loginError.innerText = 'An error occured while logging in.';
    loginError.classList.add('show');

    setTimeout(() => {
      loginError.classList.remove('show');
    }, 2000);
    return false;
  }
};
