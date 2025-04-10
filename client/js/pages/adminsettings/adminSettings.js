import '../../../css/components/preloader.css';
import '../../../css/components/sideNavAdmin.css';
import '../../../css/pages/adminsettings/adminSettings.css';
import { startSessionChecks } from '../../../utils/sessionUtils.js';
import '../../components/sideNavAdmin.js';

startSessionChecks();

const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);

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
