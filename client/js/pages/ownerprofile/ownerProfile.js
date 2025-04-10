import { fileTypeFromBlob } from 'file-type';
import '../../../css/components/preloader.css';
import '../../../css/components/sideNavAdmin.css';
import '../../../css/pages/ownerprofile/ownerProfile.css';
import { startSessionChecks } from '../../../utils/sessionUtils.js';
import '../../components/sideNavAdmin.js';

setupLogoutListener();

const doc = document;
const { error } = console;

const getById = (id) => doc.getElementById(id);
const getAll = (selector) => doc.querySelectorAll(selector);
const get = (selector) => doc.querySelector(selector);

// Start session checks on page load
startSessionChecks();

// Initialize input fields and store them in a variable
const ownerProfileFields = {
    firstName: getById('firstName'),
    middleName: getById('middleName'),
    lastName: getById('lastName'),
    gender: getById('gender'),
    birthday: getById('birthday'),
    phoneNumber: getById('phoneNumber'),
    email: getById('email'),
    municipality: getById('municipality'),
  };
  

// Function to capitalize the first letter of a string
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  }
  
  // Function to fetch user profile data and populate fields
  function fetchOwnerProfile() {
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
        ownerProfileFields.firstName.value = data.first_name || '';
        ownerProfileFields.middleName.value = data.middle_name || '';
        ownerProfileFields.lastName.value = data.last_name || '';
        ownerProfileFields.gender.value = data.gender ? capitalizeFirstLetter(data.gender) : '';
        ownerProfileFields.birthday.value = data.date_of_birth
          ? new Date(data.date_of_birth).toISOString().split('T')[0]
          : '';
        ownerProfileFields.phoneNumber.value = data.contact_number || '';
        ownerProfileFields.email.value = data.email || '';
        ownerProfileFields.municipality.value = data.municipality || '';
      })
      .catch((err) => {
        error('Error fetching owner profile:', err);
      });
  }
  