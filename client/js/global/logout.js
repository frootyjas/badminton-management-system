import '../../css/components/modal.css';
import { openModal } from '../components/modal.js';
import { setupHelp } from './help';

const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);
const getAll = (selector) => doc.querySelectorAll(selector);
const get = (selector) => doc.querySelector(selector);
setupHelp();

function onConfirmLogout() {
  log('User logged out!');
  // logic for logging out the user
  fetch('/auth/logout', {
    method: 'POST',
    credentials: 'include' // include cookies
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Logout failed: ${response.status}`);
      }
      // redirect to login upon successful logout
      window.location.href = '/login';
    })
    .catch((err) => {
      error('Error during logout:', err);
    });
}

function onCancelLogout() {
  log('User canceled logout.');
}

// function to set up logout listener
export function setupLogoutListener() {
  getById('logoutBtn').addEventListener('click', function () {
    // Trigger the custom modal instead of the confirm dialog
    openModal(
      'confirm',
      'Logout Confirmation',
      'Are you sure you want to logout?',
      onConfirmLogout,
      onCancelLogout,
      'Logout',
      'Cancel'
    );
  });
}
