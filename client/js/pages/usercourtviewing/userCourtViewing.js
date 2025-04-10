import L from 'leaflet';
import '../../../css/components/footer.css';
import '../../../css/components/navBarUser.css';
import '../../../css/components/preloader.css';
import '../../../css/pages/usercourtviewing/userCourtViewing.css';
import { startSessionChecks, validateSessionAndNavigate } from '../../../utils/sessionUtils.js';
import '../../components/navBarUser.js';
import { setupLogoutListener } from '../../global/logout.js';

import '/leaflet.css';

setupLogoutListener();
startSessionChecks();

let map, bataanBoundaryLayer;
let isPopupOpen = false;

// define custom icon for the marker
const myIcon = L.icon({
  iconUrl: '/images/marker-icon.png',
  iconRetinaUrl: '/images/marker-icon-2x.png',
  shadowUrl: '/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

// initialize the map
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

      map.setMinZoom(10);
      map.setMaxZoom(18);

      // restrict dragging outside of boundaries
      map.on('dragend', function () {
        if (!isPopupOpen) {
          map.panInsideBounds(bataanBoundaryLayer.getBounds(), { animate: true });
        }
      });
    });
}

// fetch courts data from the server
async function fetchCourts() {
  try {
    const response = await fetch('/user/courts');
    const data = await response.json();

    if (data.status === 'success') {
      addMarkersToMap(data.courts);
    } else {
      console.error('Error fetching courts:', data.message);
      alert('Failed to load courts data.');
    }
  } catch (error) {
    console.error('Fetch error:', error);
    alert('An error occurred while fetching the courts.');
  }
}

function addMarkersToMap(courts) {
  courts.forEach((court) => {
    const coordinates = court.location.coordinates;
    const marker = L.marker([coordinates[1], coordinates[0]], { icon: myIcon }).addTo(map);

    marker.on('click', async () => {
      const address = await getAddressFromCoordinates(court.location.coordinates);

      const popupHtml = `
  <div class="popup-container">
    <div class="popup-header">
      <div class="left-section">
        <label class="upload-label">
          <div class="image-upload-container">
            <img id="pin-preview" src="${
              court.business_logo || '/assets/images/logo_placeholder_150x150.png'
            }" alt="Business Logo" />
          </div>
        </label>
        <div class="operating-hours">
          <label><strong>Operating Hours:</strong></label>
          <div class="time-container">
            <label for="to-time">To:</label>
            <input type="text" id="to-time" value="${court.operating_hours?.to || 'N/A'}" readonly />
          </div>
          <div class="time-container">
            <label for="from-time">From:</label>
            <input type="text" id="from-time" value="${court.operating_hours?.from || 'N/A'}" readonly />
          </div>
        </div>
        <div class="hourly-rate">
          <label><strong>Hourly Rate:</strong></label>
          <input type="text" value="${court.hourly_rate ? `₱${court.hourly_rate.toFixed(2)}` : 'N/A'}" readonly />
        </div>
        <div class="dti-number">
          <label><strong>DTI Registration:</strong></label>
          <input type="text" value="${court.dti_number || 'N/A'}" readonly />
        </div>
      </div>
      <div class="right-section">
        <h1>${court.business_name}</h1>
        <div class="location-field">
          <i class="fas fa-map-marker-alt"></i>
          <input type="text" value="${address}" readonly />
        </div>
        <div class="description-field">
          <textarea id="court-description-textarea" readonly>${
            court.description || 'No description available'
          }</textarea>
        </div>
        <div class="carousel">
          <div class="carousel-images">
            ${
              court.court_images?.map((img) => `<img src="${img}" alt="Court Image" />`).join('') ||
              '<p>No images available</p>'
            }
          </div>
          <button class="carousel-btn prev">&#8249;</button>
          <button class="carousel-btn next">&#8250;</button>
        </div>
      </div>
    </div>
    <button class="reserve-btn">Reserve Now</button>
  </div>
`;
      marker.on('popupopen', function () {
        const popupLatLng = marker.getLatLng();

        // Temporarily remove boundary restrictions to allow free movement
        isPopupOpen = true;
        map.off('dragend'); // Disable boundary snapping

        // adjust the map to center the marker when the popup opens
        // we apply an offset to avoid clipping the popup at the top of the screen
        const offset = L.point(0, -150); // Adjust Y offset as needed to ensure the popup is fully visible
        map.setView(popupLatLng, map.getZoom(), { animate: true }).panBy(offset);
      });

      const popup = L.popup().setLatLng([coordinates[1], coordinates[0]]).setContent(popupHtml).openOn(map);

      map.on('click', function () {
        map.closePopup();
      });

      isPopupOpen = true;

      // add event listener for "Reserve Now" button
      popup
        .getElement()
        .querySelector('.reserve-btn')
        .addEventListener('click', () => {
          window.location.href = `/user/court-reservation?id=${court._id}`;
        });

      marker.on('popupclose', function () {
        isPopupOpen = false;

        // re-enable boundary restrictions after the popup closes
        map.on('dragend', function () {
          if (!isPopupOpen) {
            map.panInsideBounds(bataanBoundaryLayer.getBounds(), { animate: true });
          }
        });
      });

      // initialize carousel functionality
      initCarousel(popup.getElement());
    });
  });
}

// initialize carousel functionality
function initCarousel(popupElement) {
  const carousel = popupElement.querySelector('.carousel');
  if (!carousel) return;

  let currentIndex = 0;
  const images = carousel.querySelectorAll('.carousel-images img');
  const totalImages = images.length;

  if (totalImages > 0) {
    // show the slide based on index
    function showSlide(index) {
      const carouselImages = carousel.querySelector('.carousel-images');
      const translateX = -index * 100;
      carouselImages.style.transform = `translateX(${translateX}%)`;
    }

    // previous slide function
    function prevSlide() {
      currentIndex = currentIndex > 0 ? currentIndex - 1 : totalImages - 1;
      showSlide(currentIndex);
    }

    // next slide function
    function nextSlide() {
      currentIndex = currentIndex < totalImages - 1 ? currentIndex + 1 : 0;
      showSlide(currentIndex);
    }

    // attach event listeners to buttons
    carousel.querySelector('.carousel-btn.prev').addEventListener('click', prevSlide);
    carousel.querySelector('.carousel-btn.next').addEventListener('click', nextSlide);
  }
}

// call the fetch function
fetchCourts();

async function getAddressFromCoordinates(coordinates) {
  const [lon, lat] = coordinates;

  if (typeof lat !== 'number' || typeof lon !== 'number') {
    console.error('Latitude and Longitude must be numbers');
    return 'Invalid coordinates';
  }

  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.display_name || 'Address not found';
  } catch (err) {
    error('Error fetching address:', err);
    return 'Address not available';
  }
}
