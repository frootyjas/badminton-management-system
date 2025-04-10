import '../../../css/components/preloader.css';
import '../../../css/components/sideNavAdmin.css';
import '../../../css/pages/vieweventparticipants/viewEventParticipants.css';
import { startSessionChecks } from '../../../utils/sessionUtils.js';
import '../../components/sideNavAdmin.js';

startSessionChecks();

const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);
const getAll = (selector) => doc.querySelectorAll(selector);
const get = (selector) => doc.querySelector(selector);

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');

  if (eventId) {
    try {
      const response = await fetch(`/user/admin/get-event/${eventId}`);
      const result = await response.json();

      if (result.status === 'success') {
        const event = result.data;

        // populate event details on the page
        // populate event title
        getById('event-title').textContent = event.eventTitle;

        // populate total number of participants
        getById('total-participants').textContent = event.participants.length;

        // populate participants table
        const participantsTableBody = getById('participants-table-body');
        participantsTableBody.innerHTML = '';

        event.participants.forEach((participant, index) => {
          const age = calculateAge(participant.date_of_birth);
          const participantRow = `
            <tr>
              <td>${participant.first_name} ${participant.last_name}</td>
              <td>${participant.contact_number}</td>
              <td>${age}</td>
              <td>${participant.municipality}</td>
            </tr>
          `;

          participantsTableBody.insertAdjacentHTML('beforeend', participantRow);
        });
      } else {
        error('Error fetching event:', result.message);
        getById('event-details').textContent = 'Error loading event details.';
      }
    } catch (error) {
      error('An error occurred:', error);
      getById('event-details').textContent = 'Failed to load event details.';
    }
  } else {
    error('Event ID is missing from the URL.');
    getById('event-details').textContent = 'Invalid event ID.';
  }
});

function calculateAge(dateOfBirth) {
  const birthDate = new Date(dateOfBirth);

  // get today's date using the Philippine time zone
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));

  // log the values for debugging
  log('Date of Birth:', birthDate);
  log("Today's Date:", today);

  // calculate the difference in years
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();

  // log the differences
  log('Month Difference:', monthDiff);
  log('Day Difference:', dayDiff);

  // check if the current date has not reached the birthday for this year
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  // log the calculated age
  log('Calculated Age:', age);

  return age;
}
