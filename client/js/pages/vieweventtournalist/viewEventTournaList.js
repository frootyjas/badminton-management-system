import '../../../css/components/preloader.css';
import '../../../css/components/sideNavAdmin.css';
import '../../../css/pages/vieweventtournalist/viewEventTournaList.css';
import { startSessionChecks } from '../../../utils/sessionUtils.js';
import '../../components/sideNavAdmin.js';

startSessionChecks();

const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);
const getAll = (selector) => doc.querySelectorAll(selector);
const get = (selector) => doc.querySelector(selector);
const createElem = (selector) => doc.createElement(selector);

// fetch event data from the server and populate the UI
async function fetchEventData() {
  try {
    const response = await fetch('/user/admin/events/participants');
    const result = await response.json();

    if (result.status === 'success') {
      const events = result.data;

      // populate total events count
      populateEventStatistics(events);

      // populate individual events in the list
      populateEventList(events);
    } else {
      error('Error fetching event data:', result.message);
    }
  } catch (err) {
    error('An error occurred:', err);
  }
}

function populateEventStatistics(events) {
  const totalEvents = events.length;
  let totalUsers = 0;
  let totalFees = 0;

  events.forEach((event) => {
    totalUsers += event.participants.length;
    // sum both reservationFee and eventFee if available
    totalFees += (event.reservationFee || 0) + (event.eventFee || 0);
    log(totalFees);
  });

  // update UI elements with computed statistics
  getById('total-events').textContent = totalEvents;
  getById('total-users').textContent = totalUsers;
  getById('total-fees').textContent = totalFees;
}

function populateEventList(events) {
  // clear event list container before populating
  const eventList = getById('event-list');
  eventList.innerHTML = '';

  events.forEach((event, index) => {
    // create an event list item
    const eventItem = createElem('li');
    eventItem.classList.add('event-number');

    // convert and format the date to Philippine timezone
    const eventDate = new Date(event.createdAt);
    const formattedDate = !isNaN(eventDate)
      ? eventDate.toLocaleDateString('en-PH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'Asia/Manila'
        })
      : 'Date Unavailable';

    // populate event details
    eventItem.innerHTML = `
          <span>${index + 1}</span>
          <div class="content-details">
            <div>
              <strong>${event.eventTitle}</strong>
              <p class="posted-date">Posted on: ${formattedDate}</p>
            </div>
            <a href="/user/admin/view-event?id=${event.eventId}" class="view-more-btn event">View More</a>
          </div>
        `;

    // append to the event list
    eventList.appendChild(eventItem);
  });
}

fetchEventData();
