import { io } from 'socket.io-client';
import '../../../css/components/footer.css';
import '../../../css/components/navBarUser.css';
import '../../../css/components/preloader.css';
import '../../../css/pages/userdash/userDash.css';
import { startSessionChecks, validateSessionAndNavigate } from '../../../utils/sessionUtils.js';
import '../../components/navBarUser.js';
import { setupLogoutListener } from '../../global/logout.js';

setupLogoutListener();

// start session checks on page load
startSessionChecks();

const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);
const getAll = (selector) => doc.querySelectorAll(selector);
const get = (selector) => doc.querySelector(selector);

getCurrentUserId().then((userId) => {
  if (userId) {
    const socket = io({ query: { userId } });

    socket.on('paymentSuccess', (data) => {
      alert(data.message);
      setTimeout(() => {
        window.location.href = '/user/events-and-tournaments?tab=schedule-reservation';
      }, 2000);
    });
  } else {
    error('User ID could not be retrieved.');
  }
});

const editProfileLink = get('a[href="/user/edit-profile"]');
if (editProfileLink) {
  editProfileLink.addEventListener('click', function (event) {
    event.preventDefault();
    validateSessionAndNavigate('/user/edit-profile'); // validate session before navigation
  });
}

async function getCurrentUserId() {
  try {
    const response = await fetch('/user/me', {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    const userData = await response.json();
    return userData.id;
  } catch (err) {
    error('Error fetching user ID:', err);
    return null;
  }
}
