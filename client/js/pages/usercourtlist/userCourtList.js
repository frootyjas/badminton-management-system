import '../../../css/components/footer.css';
import '../../../css/components/navBarUser.css';
import '../../../css/components/preloader.css';
import '../../../css/pages/usercourtlist/userCourtList.css';
import { startSessionChecks, validateSessionAndNavigate } from '../../../utils/sessionUtils.js';
import '../../components/navBarUser.js';
import { setupLogoutListener } from '../../global/logout.js';

const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);
const getAll = (selector) => doc.querySelectorAll(selector);
const get = (selector) => doc.querySelector(selector);

setupLogoutListener();

// Start session checks on page load
startSessionChecks();

let courts = [];
let currentPage = 1;
let totalCourts = 0;
const courtsPerPage = 10;

doc.addEventListener('DOMContentLoaded', () => {
  fetchCourts(currentPage);
  getById('load-more').addEventListener('click', loadMoreCourts);
});

async function fetchCourts(page) {
  try {
    const response = await fetch(`/user/courts?page=${page}&limit=${courtsPerPage}`);
    const data = await response.json();

    if (response.ok && data.status === 'success') {
      courts = data.courts;
      totalCourts = data.totalCourts; // get total courts from the response

      // if no courts, show a message
      if (courts.length === 0) {
        displayNoCourtsMessage();
      } else {
        displayCourts();
      }
    } else {
      throw new Error('Failed to fetch courts');
    }
  } catch (err) {
    error('Error fetching courts:', err);
    displayErrorMessage('Error fetching courts. Please try again later.');
  }
}

async function displayCourts() {
  const courtsContainer = getById('courts-container');

  for (const court of courts) {
    const courtImage = court.business_logo // get only the first court image
      ? `<img src="${court.business_logo}" alt="${court.business_name}" class="court-image" />`
      : '<p>No images available</p>';

    courtsContainer.innerHTML += `
      <a href="/user/court-reservation?id=${court._id}">
        ${courtImage}
      </a>
    `;
  }
}

async function loadMoreCourts() {
  const totalLoadedCourts = currentPage * courtsPerPage;

  // check if more courts can be loaded
  if (totalLoadedCourts >= totalCourts) {
    alert('No more courts available to load.'); // Notify user
    return; // exit if all courts have been loaded
  }

  currentPage += 1; // increment the current page
  await fetchCourts(currentPage); // fetch courts for the next page
}

function displayNoCourtsMessage() {
  const courtsContainer = getById('courts-container');
  courtsContainer.innerHTML = `
    <div class="no-courts-message">
      <p>No courts available at the moment. Please check back later.</p>
    </div>
  `;
}

// display error message in the courts container
function displayErrorMessage(message) {
  const courtsContainer = getById('courts-container');
  courtsContainer.innerHTML = `
    <div class="error-message">
      <p>${message}</p>
    </div>
  `;
}

// scroll to top button functionality
document.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('scroll', () => {
    const scrollToTopBtn = getById('scrollToTopBtn');
    if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
      scrollToTopBtn.style.display = 'block';
    } else {
      scrollToTopBtn.style.display = 'none';
    }
  });

  getById('scrollToTopBtn').addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
});
