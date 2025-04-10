import { fileTypeFromBlob } from 'file-type';
import L from 'leaflet';
import '../../../css/pages/courtregistration/courtRegistration.css';
import '/leaflet.css';

const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);
const getAll = (selector) => doc.querySelectorAll(selector);
const get = (selector) => doc.querySelector(selector);

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
const allowedDocumentTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const fileInput = getById('pin-image-upload');
fileInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  // validate the file type
  if (file) {
    const fileType = await fileTypeFromBlob(file);
    if (fileType && allowedImageTypes.includes(fileType.mime)) {
      // the file type is valid; proceed with the logic
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = getById('pin-preview');
        preview.src = e.target.result; // display the image preview
      };
      reader.readAsDataURL(file);
    } else {
      // handle invalid file type
      alert('Please select a valid image file (JPEG, PNG, GIF).');
      fileInput.value = ''; // clear the input
    }
  }
});

// function to handle file input change
async function handleFileSelect(event, imageHolder) {
  const file = event.target.files[0];
  // validate the file type
  if (file) {
    const fileType = await fileTypeFromBlob(file);
    if (fileType && allowedImageTypes.includes(fileType.mime)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        imageHolder.src = e.target.result; // display the image preview
        imageHolder.classList.remove('default'); // remove default class to apply user-uploaded styles
        imageHolder.classList.add('user-uploaded'); // add class for user-uploaded images
        imageHolder.style.display = 'block'; // ensure the image is visible
      };
      reader.readAsDataURL(file);
    } else {
      alert('Please select a valid image file (JPEG, PNG, GIF).');
      event.target.value = ''; // clear the input
    }
  }
}

// Set up the initial court
const initialCourtWrapper = getById('courtWrapper1');
const initialFileInput = initialCourtWrapper.querySelector('.court-file-input');
const initialImageHolder = initialCourtWrapper.querySelector('.image-holder');

// Add event listener for the initial court file input
initialFileInput.addEventListener('change', (event) => {
  handleFileSelect(event, initialImageHolder);
});

// Set up the initial facility
const initialFacilityWrapper = getById('facilityWrapper1');
const initialFacilityInput = initialFacilityWrapper.querySelector('.facility-file-input');
const initialFacilityImageHolder = initialFacilityWrapper.querySelector('.image-holder');

// Add event listener for the initial facility file input
initialFacilityInput.addEventListener('change', (event) => {
  handleFileSelect(event, initialFacilityImageHolder);
});

// Handle adding and removing courts and facilities
const courtsGrid = getById('courtsGrid');
const facilitiesGrid = getById('facilitiesGrid');

getAll('.add-court-btn').forEach((button) => {
  button.addEventListener('click', () => {
    const newCourtWrapper = document.createElement('div');
    newCourtWrapper.className = 'court-wrapper';
    newCourtWrapper.innerHTML = `
      <div class="court">
        <button class="remove-court-btn">×</button>
        <img src="https://cdn-icons-png.flaticon.com/512/724/724933.png" alt="Upload Court" class="image-holder default" style="display block;" />
        <input type="file" name="court_image[]" class="court-file-input" />
      </div>
      <div class="court-number">Court ${courtsGrid.children.length + 1}</div>
    `;

    // Attach the change event listener for the file input
    const fileInput = newCourtWrapper.querySelector('.court-file-input');
    const imageHolder = newCourtWrapper.querySelector('.image-holder');
    fileInput.addEventListener('change', (event) => handleFileSelect(event, imageHolder));

    courtsGrid.appendChild(newCourtWrapper);
  });
});

getAll('.add-facility-btn').forEach((button) => {
  button.addEventListener('click', () => {
    const newFacilityWrapper = document.createElement('div');
    newFacilityWrapper.className = 'facility-wrapper';
    newFacilityWrapper.innerHTML = `
      <div class="facility">
        <button class="remove-facility-btn">×</button>
        <img src="https://cdn-icons-png.flaticon.com/512/724/724933.png" alt="Upload Facility" class="image-holder default" style="display: block;" />
        <input type="file" name="facility_image[]" class="facility-file-input" />
      </div>
      <input type="text" name="facility_name[]" placeholder="Enter facility Name" required />
    `;

    // Attach the change event listener for the file input
    const facilityFileInput = newFacilityWrapper.querySelector('.facility-file-input');
    const facilityImageHolder = newFacilityWrapper.querySelector('.image-holder');
    facilityFileInput.addEventListener('change', (event) => handleFileSelect(event, facilityImageHolder));

    facilitiesGrid.appendChild(newFacilityWrapper);
  });
});

// handle removing courts and facilities
doc.addEventListener('click', (event) => {
  if (event.target.classList.contains('remove-court-btn')) {
    event.target.parentElement.parentElement.remove();
  }

  if (event.target.classList.contains('remove-facility-btn')) {
    const facilityWrapper = event.target.parentElement.parentElement;
    facilityWrapper.remove();
  }
});

const fileInputs = getAll('.files-container input[type="file"]');
fileInputs.forEach((input) => {
  input.addEventListener('change', async (event) => {
    const files = event.target.files;

    if (files.length > 0) {
      let isValid = true;

      for (const file of files) {
        const fileType = await fileTypeFromBlob(file); // use fileTypeFromBlob correctly

        if (!fileType || !allowedDocumentTypes.includes(fileType.mime)) {
          isValid = false;
          alert('Please upload a valid document file (PDF, DOC, DOCX).');
          break;
        }
      }

      if (isValid) {
        // update the text to reflect the number of selected files
        event.target.nextElementSibling.textContent = `${files.length} file(s) selected.`;
      } else {
        // reset the input and update the text if invalid file is detected
        event.target.value = '';
        event.target.nextElementSibling.textContent = 'No file chosen';
      }
    }
  });
});

function formatToAMPM(hours, minutes) {
  const period = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = (hours % 12 || 12).toString().padStart(2, '0'); // convert 0 to 12 for 12 AM and ensure two digits
  const formattedMinutes = minutes.toString().padStart(2, '0'); // ensure two digits for minutes
  return `${formattedHours}:${formattedMinutes} ${period}`;
}

const spinner = getById('spinner');

getById('courtRegistrationForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!isLocationPinned) {
    alert('Please confirm your location before submitting the form.');
    return;
  }

  // show spinner
  spinner.style.display = 'flex';

  const operatingHoursFrom = getById('operatingHoursFrom');
  const operatingHoursTo = getById('operatingHoursTo');

  const fromTime = operatingHoursFrom.value; // e.g., "11:03"
  const toTime = operatingHoursTo.value; // e.g., "02:03"

  const [fromHours, fromMinutes] = fromTime.split(':').map(Number);
  const [toHours, toMinutes] = toTime.split(':').map(Number);

  const formattedFromTime = formatToAMPM(fromHours, fromMinutes).toString();
  const formattedToTime = formatToAMPM(toHours, toMinutes).toString();

  const formData = new FormData(event.target);

  // Remove existing values if they exist
  formData.delete('operating_hours_from');
  formData.delete('operating_hours_to');

  // Append the formatted operating hours to formData
  formData.append('operating_hours_from', formattedFromTime);
  formData.append('operating_hours_to', formattedToTime);

  log(formData);

  // Retrieve the token from the URL or wherever it's stored
  const token = new URLSearchParams(window.location.search).get('token');

  // Submit the form data to the server with the token in the Authorization header
  try {
    const response = await fetch('/auth/register/courts', {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const result = await response.json();
    log(result);

    // Check for successful response (201 Created)
    if (response.status === 201) {
      // Reset the form
      clearForm();
      alert('Courts registered successfully!');
      window.location.href = '/login';
    } else {
      // Handle error responses
      if (result.message) {
        alert(result.message); // Display the message from the server
      } else {
        alert('Failed to register courts. Please try again.'); // Fallback message
      }

      // Check if there are JOI errors
      if (result.errors) {
        // Assuming 'result.errors' contains the JOI error details
        const errorMessages = result.errors.map((error) => error.message).join(', ');
        alert(`Validation errors: ${errorMessages}`);
      }
    }
  } catch (err) {
    error(err);
    alert('An error occurred while submitting the form.');
  } finally {
    // Hide spinner
    spinner.style.display = 'none'; // Hide spinner modal
  }
});

function clearForm() {
  const form = getById('courtRegistrationForm');
  form.reset(); // Resets all input fields
  const fileInputs = form.querySelectorAll('input[type="file"]');
  fileInputs.forEach((input) => (input.value = '')); // Clear file inputs
}

clearForm();

// initialize the modal and map
const confirmLocationBtn = getById('confirmLocation');
const courtLatInput = getById('courtLat');
const courtLngInput = getById('courtLng');
let map,
  marker,
  bataanBoundaryLayer,
  isLocationPinned = false;

// define custom icon for the marker
const myIcon = L.icon({
  iconUrl: '/images/marker-icon.png',
  iconRetinaUrl: '/images/marker-icon-2x.png',
  shadowUrl: '/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

// Initialize the map
if (!map) {
  map = L.map('map').setView([14.68, 120.5], 13); // Center in Bataan, Philippines
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // load the GeoJSON file for Bataan
  fetch(
    'https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/provdists/lowres/municities-provdist-300800000.0.001.json'
  )
    .then((response) => response.json())
    .then((geojsonData) => {
      bataanBoundaryLayer = L.geoJSON(geojsonData, {
        style: function () {
          return { color: '#ff7800', fillOpacity: 0.1, weight: 2 };
        }
      }).addTo(map);

      map.fitBounds(bataanBoundaryLayer.getBounds());
      map.setMaxBounds(bataanBoundaryLayer.getBounds());

      map.setMinZoom(10);
      map.setMaxZoom(18);

      map.on('drag', function () {
        map.panInsideBounds(bataanBoundaryLayer.getBounds(), { animate: false });
      });

      map.on('click', function (e) {
        const results = leafletPip.pointInLayer([e.latlng.lng, e.latlng.lat], bataanBoundaryLayer);

        if (results.length > 0) {
          if (marker) {
            marker.setLatLng(e.latlng);
          } else {
            marker = L.marker(e.latlng, { icon: myIcon }).addTo(map);
          }
        } else {
          alert('Please select a location within Bataan, Philippines.');
        }
      });
    });
}

// handle location confirmation
confirmLocationBtn.addEventListener('click', function (event) {
  event.preventDefault();
  if (marker) {
    const latlng = marker.getLatLng();
    console.log('Selected location:', latlng);
    isLocationPinned = true;
    courtLatInput.value = latlng.lat;
    courtLngInput.value = latlng.lng;
    alert('Location successfully confirmed!');
  } else {
    alert('Please pin a location before confirming.');
  }
});
