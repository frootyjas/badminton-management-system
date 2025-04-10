import { io } from 'socket.io-client';
import '../../../css/components/footer.css';
import '../../../css/components/modal.css';
import '../../../css/components/navBarUser.css';
import '../../../css/components/preloader.css';
import '../../../css/pages/usercourtreservation/userCourtReservation.css';
import { openModal } from '../../../js/components/modal.js';
import {
  hidePreloader,
  showPreloader,
  startSessionChecks,
  validateSessionAndNavigate
} from '../../../utils/sessionUtils.js';
import '../../components/navBarUser.js';
import { setupLogoutListener } from '../../global/logout.js';

let selectedCourts = [];
let selectedDate = null;
let reservedDates = new Set();
let userReservedDates = new Set();
let hourlyRate = 0;

function calculateTotalAmount() {
  const selectedSlots = Array.from(getAll('.time-slot.selected'));
  const totalHours = calculateDuration(groupTimeSlots(selectedSlots));
  const totalCourts = selectedCourts.length;
  const calculatedAmount = totalHours * hourlyRate * totalCourts;
  return calculatedAmount * 100;
}

function onConfirmAction() {
  window.location.href = '/user/view-schedule';
}

getCurrentUserId().then((userId) => {
  if (userId) {
    const socket = io({ query: { userId } });

    socket.on('reservationCreated', (data) => {
      // refresh the court data and UI based on the received data
      fetchCourtData(data.courtId, data.date, true)
        .then(({ courtData, availabilityData }) => {
          populateCourtImagesAndLocation(courtData, true);
          generateTimeSlots(availabilityData);
        })
        .catch((err) => {
          console.error('Error fetching court data:', err);
        });
    });

    socket.on('reservationCanceled', (data) => {
      const currentDate = getCurrentDateInPhilippines();
      const dateToUse = selectedDate || currentDate;
      fetchCourtData(data.courtId, dateToUse, false)
        .then(({ courtData, availabilityData }) => {
          populateCourtImagesAndLocation(courtData, false);
          generateTimeSlots(availabilityData);
        })
        .catch((err) => {
          console.error('Error fetching court data:', err);
        });
    });

    socket.on('reservationStatusUpdated', (data) => {
      log(data.message);
      const queryParams = new URLSearchParams(window.location.search);
      const courtId = queryParams.get('id');
      // refresh the court data and UI based on the received data
      const currentDate = getCurrentDateInPhilippines();
      const dateToUse = selectedDate || currentDate;
      fetchCourtData(courtId, dateToUse, false)
        .then(({ courtData, availabilityData }) => {
          populateCourtImagesAndLocation(courtData, false);
          generateTimeSlots(availabilityData);
        })
        .catch((err) => {
          console.error('Error fetching court data:', err);
        });
    });

    // socket.on('paymentSuccess', (data) => {
    //   hidePreloader();
    //   openModal('success', 'Success', data.message, onConfirmAction, null, 'OK');
    // });
  } else {
    error('User ID could not be retrieved.');
  }
});

const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);
const getAll = (selector) => doc.querySelectorAll(selector);
const get = (selector) => doc.querySelector(selector);

setupLogoutListener();

// Start session checks on page load
startSessionChecks();

// Get address from coordinates
export async function getAddressFromCoordinates(coordinates, withPreloader = true) {
  const [lon, lat] = coordinates;

  if (typeof lat !== 'number' || typeof lon !== 'number') {
    console.error('Latitude and Longitude must be numbers');
    return 'Invalid coordinates';
  }

  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;

  try {
    const response = await fetch(url, {
      withPreloader
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.display_name || 'Address not found';
  } catch (err) {
    console.error('Error fetching address:', err);
    return 'Address not available';
  }
}

// Parse time string (e.g., "11:22 AM") to 24-hour format
function parseTime(timeStr) {
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  return hours;
}

function populateCourtImagesAndLocation(courtData, withPreloader = true) {
  const courtImagesContainer = getById('courtImages');
  courtImagesContainer.innerHTML = '';

  const locationField = get('.location-field input');
  const coordinates = courtData.location.coordinates;
  getAddressFromCoordinates(coordinates, withPreloader).then((address) => {
    locationField.value = address;
  });

  hourlyRate = courtData.hourly_rate;

  courtData.court_images.forEach((image, index) => {
    const imgContainer = document.createElement('div');
    imgContainer.classList.add('court-image');
    imgContainer.innerHTML = `<img src="${image}" alt="Court Image ${index + 1}" />`;

    imgContainer.addEventListener('click', function () {
      const selectedIndex = selectedCourts.indexOf(index);

      if (selectedIndex === -1) {
        selectedCourts.push(index);
        this.classList.add('selected');
      } else {
        selectedCourts.splice(selectedIndex, 1);
        this.classList.remove('selected');
      }

      handleTimeSlotSelection(); // Update payment when courts are selected
    });

    courtImagesContainer.appendChild(imgContainer);
  });
}
function getCurrentDateInPhilippines() {
  const options = { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', options); // Use 'en-CA' to get YYYY-MM-DD format
  return formatter.format(new Date()).replace(/\//g, '-');
}

doc.addEventListener('DOMContentLoaded', async function () {
  var calendarEl = getById('calendar');

  // Get the current date in the Philippines timezone
  const currentDate = getCurrentDateInPhilippines();

  if (!currentDate) {
    selectedDate = currentDate;
  }

  let calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    validRange: {
      start: currentDate
    },
    dateClick: async function (info) {
      doc.querySelectorAll('.fc-daygrid-day').forEach((day) => day.classList.remove('selected-date'));
      info.dayEl.classList.add('selected-date');
      selectedDate = info.dateStr;
      log('Selected date:', selectedDate);

      resetPaymentUI();

      // Fetch data for the selected date
      const { availabilityData } = await fetchCourtData(courtId, selectedDate);
      if (availabilityData) {
        generateTimeSlots(availabilityData);
      }
    },
    datesSet: async function (dateInfo) {
      // Highlight reserved dates every time the view changes
      highlightReservedDates(reservedDates, userReservedDates);
    }
  });
  calendar.render();

  // Get court ID from URL
  const queryParams = new URLSearchParams(window.location.search);
  const courtId = queryParams.get('id');

  console.log('Current Date in Philippines:', currentDate);

  if (courtId) {
    const {
      courtData,
      availabilityData,
      reservedDates: fetchedReservedDates,
      userReservedDates: fetchUserReservedDates
    } = await fetchCourtData(courtId, currentDate, true);
    if (courtData) {
      populateCourtImagesAndLocation(courtData);
      generateTimeSlots(availabilityData); // Generate time slots

      // Store reserved dates globally
      reservedDates = fetchedReservedDates;
      userReservedDates = fetchUserReservedDates;
      log(reservedDates);
      log(userReservedDates);
      highlightReservedDates(reservedDates, userReservedDates); // Highlight reserved dates
    }
  }
});

// function to check if time slots are continuous
function areTimeSlotsContinuous(selectedSlots) {
  // extract the hour data
  const hours = selectedSlots.map((slot) => parseInt(slot.getAttribute('data-hour')));

  // sort the hours and check if they are consecutive
  hours.sort((a, b) => a - b);

  for (let i = 1; i < hours.length; i++) {
    if (hours[i] !== hours[i - 1] + 1) {
      return false; // Time slots are not continuous
    }
  }
  return true;
}

// function to group time slots
function groupTimeSlots(selectedSlots) {
  if (selectedSlots.length === 0) return null;

  const hours = selectedSlots.map((slot) => parseInt(slot.getAttribute('data-hour')));
  hours.sort((a, b) => a - b);

  const firstHour = hours[0];
  const lastHour = hours[hours.length - 1];

  const fromTimeSlot = selectedSlots.find((slot) => parseInt(slot.getAttribute('data-hour')) === firstHour);
  const toTimeSlot = selectedSlots.find((slot) => parseInt(slot.getAttribute('data-hour')) === lastHour);

  return {
    from: fromTimeSlot.textContent.split(' - ')[0],
    to: toTimeSlot.textContent.split(' - ')[1]
  };
}
function updateCourtSelectionDisplay() {
  const courtElements = getAll('.court-image');
  courtElements.forEach((court) => {
    court.classList.remove('selected');
  });
}

getById('reserveButton').addEventListener('click', function () {
  const selectedSlots = Array.from(getAll('.time-slot.selected'));

  log(selectedSlots);

  if (selectedSlots.length === 0) {
    alert('Please select at least one time slot.');
    return;
  }

  // group time slots into one reservation
  const groupedTimeSlot = groupTimeSlots(selectedSlots);

  const totalHours = calculateDuration(groupedTimeSlot);

  const totalCourts = selectedCourts.length;

  if (totalCourts === 0) {
    alert('Please select at least one court.');
    return;
  }

  log('totalHours', totalHours);

  // send the grouped time slot to the backend
  submitReservation(groupedTimeSlot);

  // remove 'selected' class from all selected time slots to reset selection
  selectedSlots.forEach((slot) => {
    slot.classList.remove('selected');
  });
  // updateCourtSelectionDisplay();
});

async function fetchCourtData(courtId, selectedDate, withPreloader = true) {
  try {
    reservedDates = [];
    userReservedDates = [];

    // Fetch court data
    const response = await fetch(`/user/court/${courtId}`, {
      credentials: 'include',
      withPreloader
    });
    if (!response.ok) {
      throw new Error(`Error fetching court data: ${response.status}`);
    }
    const courtData = await response.json();

    // fetch availability for the selected date
    const availabilityResponse = await fetch(`/user/availability?date=${selectedDate}&courtId=${courtId}`, {
      credentials: 'include',
      withPreloader
    });
    if (!availabilityResponse.ok) {
      throw new Error(`Error fetching availability: ${availabilityResponse.status}`);
    }
    const availabilityData = await availabilityResponse.json();

    // Highlight reserved dates on the calendar
    reservedDates = new Set([...reservedDates, ...availabilityData.reservedDates]);
    userReservedDates = new Set([...userReservedDates, ...availabilityData.userReservedDates]);

    highlightReservedDates([...reservedDates], [...userReservedDates]);

    // Return both court data and availability data, including reserved dates
    return {
      courtData,
      availabilityData,
      reservedDates: [...reservedDates],
      userReservedDates: [...userReservedDates]
    };
  } catch (err) {
    error(err);
    return null;
  }
}

function highlightReservedDates(reservedDates, userReservedDates) {
  const calendarDays = getAll('.fc-daygrid-day');

  const reservedDatesSet = new Set(reservedDates);
  const userReservedDatesSet = new Set(userReservedDates);

  calendarDays.forEach((day) => {
    const date = day.getAttribute('data-date');

    if (userReservedDatesSet.has(date)) {
      day.classList.add('user-reserved');
    }
    if (reservedDatesSet.has(date)) {
      day.classList.add('reserved');
    }
    if (!userReservedDatesSet.has(date) && !reservedDatesSet.has(date)) {
      day.classList.remove('reserved');
      day.classList.remove('user-reserved');
    }
  });
}

// function to calculate the duration in hours based on the grouped time slots
function calculateDuration(groupedTimeSlot) {
  if (!groupedTimeSlot) {
    return 0;
  }

  const fromHour = parseTime(groupedTimeSlot.from);
  const toHour = parseTime(groupedTimeSlot.to);

  return toHour - fromHour;
}

// function to submit reservation to the backend
async function submitReservation(timeSlot) {
  const queryParams = new URLSearchParams(window.location.search);
  const courtId = queryParams.get('id');

  const options = { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  const currentDate = formatter.format(new Date()).replace(/\//g, '-');

  // check if the selected date is valid; if not, use the current date
  const isSelectedDateValid = new Date(selectedDate) >= new Date(currentDate);
  const finalDate = isSelectedDateValid ? selectedDate : currentDate;

  const reservationData = {
    courtId: courtId,
    date: finalDate,
    timeSlot: timeSlot,
    selectedCourt: selectedCourts
  };

  try {
    const response = await fetch('/user/reserve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reservationData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.message || 'Failed to reserve time slot. Please try again.';
      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    const approvalUrl = responseData.approvalUrl;

    window.location.href = approvalUrl;

    history.pushState(null, null, window.location.href);
  } catch (err) {
    console.error('Error occurred during reservation:', err);
    alert(`An error occurred: ${err.message}`);
    resetPaymentUI();
  }
}

// clean URL parameters on page load
window.addEventListener('load', () => {
  const url = new URL(window.location.href);
  url.searchParams.delete('token');
  url.searchParams.delete('PayerID');
  history.replaceState({}, document.title, url);
});

function formatCurrency(amount) {
  // parse the amount as a float and format it to two decimal places
  return `₱${parseFloat(amount)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}
function initializePaymentDisplay() {
  getAll('.payment-row .payment-value')[0].textContent = formatCurrency(0);
  getAll('.payment-row .payment-value')[1].textContent = formatCurrency(0);
  getAll('.payment-row .total-payment-value')[0].textContent = formatCurrency(0);
}

function resetPaymentUI() {
  getAll('.payment-row .payment-value')[0].textContent = formatCurrency(0);
  getAll('.payment-row .payment-value')[1].textContent = formatCurrency(0);
  getAll('.payment-row .total-payment-value')[0].textContent = formatCurrency(0);
}

document.addEventListener('DOMContentLoaded', () => {
  initializePaymentDisplay();
});

function updatePaymentUI(totalHours, totalCourts) {
  // use the hourly rate as the reservation fee
  const reservationFee = hourlyRate;
  const totalPayment = totalHours * totalCourts * reservationFee;

  // update the UI to show the reservation fee and total payment
  getAll('.payment-row .payment-value')[0].textContent = formatCurrency(totalPayment);
  getAll('.payment-row .payment-value')[1].textContent = formatCurrency(reservationFee);
  getAll('.payment-row .total-payment-value')[0].textContent = formatCurrency(reservationFee);
}

function handleTimeSlotSelection() {
  const selectedSlots = Array.from(getAll('.time-slot.selected'));
  const totalHours = calculateDuration(groupTimeSlots(selectedSlots));
  const totalCourts = selectedCourts.length;

  if (totalCourts > 0 && totalHours > 0) {
    updatePaymentUI(totalHours, totalCourts);
  } else {
    updatePaymentUI(0, 0);
  }
}

function generateTimeSlots(availabilityData) {
  const timeSlotsContainer = getById('timeSlots');
  timeSlotsContainer.innerHTML = '';

  const availableSlots = availabilityData.courts[0].timeSlot.available;
  const unavailableSlots = availabilityData.courts[0].timeSlot.unavailable;

  unavailableSlots.forEach((slot) => {
    const timeSlot = document.createElement('div');
    timeSlot.classList.add('time-slot', 'disabled');
    timeSlot.textContent = slot;
    timeSlotsContainer.appendChild(timeSlot);
  });

  availableSlots.forEach((slot) => {
    const timeSlot = document.createElement('div');
    timeSlot.classList.add('time-slot');
    timeSlot.textContent = slot;

    const hour = parseTime(slot);
    timeSlot.setAttribute('data-hour', hour);

    timeSlot.addEventListener('click', function () {
      this.classList.toggle('selected');
      handleTimeSlotSelection(); // Call to update the UI after selecting a slot
    });

    timeSlotsContainer.appendChild(timeSlot);
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

// function to start polling
function pollPaymentStatus(reservationId) {
  const intervalId = setInterval(async () => {
    try {
      const response = await fetch(`/user/check-payment-status?reservationId=${reservationId}`, {
        withPreloader: false
      });
      const data = await response.json();

      if (data.success && data.paymentStatus === 'paid') {
        clearInterval(intervalId);
        sessionStorage.removeItem(`polling_${reservationId}`);
        openModal('success', 'Success', data.message, onConfirmAction, null, 'OK');
      }
    } catch (err) {
      error('Error polling payment status:', err);
    }
  }, 5000);
}

// extract reservationId from the URL
const urlParams = new URLSearchParams(window.location.search);
const reservationId = urlParams.get('reservationId');

// start polling if there's a reservationId and it's not already polling
if (reservationId && !sessionStorage.getItem(`polling_${reservationId}`)) {
  pollPaymentStatus(reservationId);
  sessionStorage.setItem(`polling_${reservationId}`, 'true');
  const url = new URL(window.location.href);
  url.searchParams.delete('reservationId');
  history.replaceState({}, document.title, url);
}
