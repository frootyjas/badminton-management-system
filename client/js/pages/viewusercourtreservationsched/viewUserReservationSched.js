import '../../../css/components/footer.css';
import '../../../css/components/navBarUser.css';
import '../../../css/components/preloader.css';
import '../../../css/pages/userschedulereservation/userScheduleReservation.css';
import { startSessionChecks, validateSessionAndNavigate } from '../../../utils/sessionUtils.js';
import '../../components/navBarUser.js';
import { setupLogoutListener } from '../../global/logout.js';

const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);
const getAll = (selector) => doc.querySelectorAll(selector);
const get = (selector) => doc.querySelector(selector);

setupLogoutListener();
startSessionChecks();

const fetchReservations = async () => {
  const dateFilters = Array.from(getAll('input[name="dateFilter"]:checked')).map((input) => input.value) || [];
  const statusFilters =
    Array.from(getAll('input[name="statusFilter"]:checked')).map((input) => input.value.toLowerCase()) || '';
  const sortOrder = get('input[name="sortOrder"]:checked')?.value.toLowerCase() || '';

  const queryParams = new URLSearchParams();
  if (dateFilters.length) queryParams.append('dateFilter', dateFilters[0]);
  if (statusFilters.length) queryParams.append('statusFilter', statusFilters[0]);
  if (sortOrder) queryParams.append('sortOrder', sortOrder);

  const response = await fetch(`/user/reservations?${queryParams.toString()}`);
  const data = await response.json();

  if (data.status === 'success') {
    const reservations = Array.isArray(data.reservations) ? data.reservations : [];
    renderReservations(reservations);
  } else {
    log('Failed to fetch reservations:', data);
  }
};

// Render reservations dynamically
const renderReservations = (reservations) => {
  const reservationsContainer = getById('reservations-container');
  reservationsContainer.innerHTML = ''; // Clear previous content

  if (!Array.isArray(reservations) || reservations.length === 0) {
    const noReservationsMessage = document.createElement('div');
    noReservationsMessage.className = 'no-reservations';
    noReservationsMessage.innerHTML = `
      <h3>No reservations found.</h3>
      <p>Please check back later or make a new reservation.</p>
    `;
    reservationsContainer.appendChild(noReservationsMessage);
    return;
  }

  reservations.forEach((reservation) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="details">
        <h2>${reservation.businessName}</h2>
        <div class="icon-text">
          <i class="fas fa-map-marker-alt"></i>
          <p>${reservation.location}</p>
        </div>
        <div class="icon-text">
          <i class="fas fa-calendar-alt"></i>
          <p>${reservation.date}</p>
        </div>
        <div class="icon-text">
          <i class="fas fa-clock"></i>
          <p>${reservation.timeSlot.from} - ${reservation.timeSlot.to}</p>
        </div>
      </div>
      <div class="footer-actions">
        <div class="status-group">
          <span class="status ${reservation.status.toLowerCase()}">${reservation.status}</span>
        </div>
        ${
          reservation.status.toLowerCase() !== 'cancelled'
            ? `<button class="cancel-button" data-reservation-id="${reservation.reservationId}">Cancel Reservation</button>`
            : `<button class="cancel-button" disabled>Cancelled</button>`
        }
      </div>
    `;
    reservationsContainer.appendChild(card);
  });

  // Add event listeners to cancel buttons
  addCancelListeners();
};

// Function to add event listeners to cancel buttons
const addCancelListeners = () => {
  const cancelButtons = getAll('.cancel-button');
  cancelButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const reservationId = button.getAttribute('data-reservation-id');
      try {
        const response = await cancelReservation(reservationId);
        if (response.status === 'success') {
          log(`Reservation ${reservationId} cancelled successfully.`);
          fetchReservations();
        } else {
          error(`Failed to cancel reservation: ${response.message}`);
        }
      } catch (err) {
        error('Error cancelling reservation:', err);
      }
    });
  });
};

// Function to cancel a reservation
const cancelReservation = async (reservationId) => {
  const response = await fetch('/user/reservations/cancel', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ reservationId })
  });

  const data = await response.json();
  return data;
};

const handleCheckboxChange = (event) => {
  const checkboxes = getAll(`input[name="${event.target.name}"]`);
  checkboxes.forEach((checkbox) => {
    if (checkbox !== event.target) {
      checkbox.checked = false;
    }
  });
  fetchReservations();
};

getAll('input[type="checkbox"]').forEach((checkbox) => {
  checkbox.addEventListener('change', handleCheckboxChange);
});

fetchReservations();
