import '../../../css/pages/verification/verification.css';

const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);
const get = (selector) => doc.querySelector(selector);

doc.addEventListener('DOMContentLoaded', function () {
  const verificationForm = getById('verification-form');
  const next = new URLSearchParams(window.location.search).get('next');
  const verificationError = getById('verification-code-error');

  verificationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const otp = formData.get('verification_code').trim();

    await verifyOTP(otp);
  });

  const verifyOTP = async (otp) => {
    try {
      const token = new URLSearchParams(window.location.search).get('token'); // get token from URL

      const response = await fetch('/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` // Set the token in the Authorization header
        },
        body: JSON.stringify({ otp })
      });

      const result = await response.json();
      if (response.ok) {
        alert('Email verified successfully!');
        window.location.href = next || '/login';
      } else {
        error(result.message);
        handleError(result);
      }
    } catch (err) {
      error('Verification error:', err);
      showError('An unexpected error occurred. Please try again.');
    }
  };

  const handleError = (result) => {
    if (result.message) {
      showError(result.message);
    } else if (result.errors && result.errors[0]?.message) {
      showError(result.errors[0].message);
    } else {
      showError('Verification failed. Please try again.');
    }
  };

  const showError = (message) => {
    verificationError.innerText = message;
    verificationError.classList.add('show');

    setTimeout(() => {
      verificationError.classList.remove('show');
    }, 2000);
  };
});
