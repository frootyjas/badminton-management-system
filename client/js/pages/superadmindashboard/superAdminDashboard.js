import '../../../css/components/preloader.css';
import '../../../css/pages/superadmindashboard/superAdminDashboard.css';
import { startSessionChecks, validateSessionAndNavigate } from '../../../utils/sessionUtils.js';
import { openModal } from '../../components/modal.js';
import '../../components/navBarUser.js';
import { setupLogoutListener } from '../../global/logout.js';

startSessionChecks();
setupLogoutListener();

const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);
const getAll = (selector) => doc.querySelectorAll(selector);
const get = (selector) => doc.querySelector(selector);

doc.addEventListener('DOMContentLoaded', () => {
  const tabs = getAll('.nav-link');
  const tabContents = getAll('.tab-content');

  const courtOwnersTableBody = get('#approvalTableBody');
  const approvedTableBody = get('#approvedTableBody');
  const deniedTableBody = get('#deniedTableBody');
  const userListTableBody = get('#userListTableBody');

  const setupMunicipalityFilters = () => {
    const filters = getAll('.filter-dropdown'); // Select all dropdowns with class 'filter-dropdown'
    filters.forEach((filter) => {
      filter.addEventListener('change', (e) => {
        const selectedMunicipality = e.target.value;
        const activeTab = Array.from(tabs).find((tab) => tab.classList.contains('active')).dataset.tab;

        if (selectedMunicipality === '') {
          // If "All Municipalities" is selected
          fetchFilteredCourtData(null, activeTab);
        } else {
          // Filter by selected municipality
          fetchFilteredCourtData(selectedMunicipality, activeTab);
        }
      });
    });
  };

  setupMunicipalityFilters();

  const fetchFilteredCourtData = async (municipality, tabId) => {
    // define the base URL and the municipality filter
    let municipalityFilter = municipality ? `&municipality=${municipality}` : '';

    switch (tabId) {
      case 'approval-page':
        fetchCourtData(`/superadmin/courts?status=pending${municipalityFilter}`, courtOwnersTableBody);
        break;
      case 'court-list':
        fetchApprovedAndDenied(`/superadmin/courts?status=approved${municipalityFilter}`, approvedTableBody, 'approve');
        fetchApprovedAndDenied(`/superadmin/courts?status=rejected${municipalityFilter}`, deniedTableBody, 'deny');
        break;
      case 'user-list':
        fetchUserData(`/superadmin/users${municipalityFilter}`, userListTableBody);
        break;
      default:
        break;
    }
  };

  const fetchDataForTab = (tabId) => {
    switch (tabId) {
      case 'approval-page':
        fetchCourtData('/superadmin/courts?status=pending', courtOwnersTableBody);
        break;
      case 'court-list':
        fetchApprovedAndDenied('/superadmin/courts?status=approved', approvedTableBody, 'approve');
        fetchApprovedAndDenied('/superadmin/courts?status=rejected', deniedTableBody, 'deny');
        break;
      case 'user-list':
        fetchUserData('/superadmin/users', userListTableBody);
        break;
      default:
        break;
    }
  };

  // Handle tab switching
  tabs.forEach((tab) => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      tabs.forEach((t) => t.classList.remove('active'));
      tabContents.forEach((content) => content.classList.remove('active'));
      tab.classList.add('active');
      const target = getById(tab.dataset.tab);
      target.classList.add('active');
      fetchDataForTab(tab.dataset.tab);
    });
  });

  // handle actions (View Details, Approve, Reject)
  doc.body.addEventListener('click', (e) => {
    const activeTab = Array.from(tabs).find((tab) => tab.classList.contains('active')).dataset.tab;

    if (e.target.classList.contains('btn-view')) {
      const courtId = e.target.dataset.id;
      showViewDetailsModal(courtId);
    } else if (e.target.classList.contains('btn-approve')) {
      const courtId = e.target.dataset.id;
      openModal(
        'confirm',
        'Approve Court Owner',
        'Are you sure you want to approve?',
        () => onConfirmApprove(courtId, activeTab), // Pass courtId here
        onCancelApprove,
        'Approve',
        'Cancel'
      );
    } else if (e.target.classList.contains('btn-reject')) {
      const courtId = e.target.dataset.id;
      openModal(
        'confirm',
        'Reject Court Owner',
        'Are you sure you want to reject?',
        () => onConfirmReject(courtId, activeTab), // Pass courtId here
        onCancelReject,
        'Reject',
        'Cancel'
      );
    }
  });

  function onCancelReject() {
    log('Superadmin canceled reject.');
  }

  async function onConfirmReject(courtId, activeTab) {
    log('Superadmin confirmed reject.');
    log(`Superadmin confirmed reject in tab: ${activeTab}.`);
    await handleAction(courtId, 'reject');

    // fetch data conditionally based on the active tab
    if (activeTab === 'court-list') {
      fetchApprovedAndDenied('/superadmin/courts?status=approved', approvedTableBody, 'approve');
      fetchApprovedAndDenied('/superadmin/courts?status=rejected', deniedTableBody, 'deny');
    } else {
      fetchCourtData('/superadmin/courts?status=pending', courtOwnersTableBody);
    }
  }

  function onCancelApprove() {
    log('Superadmin canceled approve.');
  }

  async function onConfirmApprove(courtId, activeTab) {
    log('Superadmin confirmed approve.');
    log(`Superadmin confirmed approve in tab: ${activeTab}.`);
    await handleAction(courtId, 'approve');

    // fetch data conditionally based on the active tab
    if (activeTab === 'court-list') {
      fetchApprovedAndDenied('/superadmin/courts?status=approved', approvedTableBody, 'approve');
      fetchApprovedAndDenied('/superadmin/courts?status=rejected', deniedTableBody, 'deny');
    } else {
      fetchCourtData('/superadmin/courts?status=pending', courtOwnersTableBody);
    }
  }

  const showViewDetailsModal = async (courtId) => {
    // Fetch court details by courtId
    const response = await fetch(`/superadmin/court-details/${courtId}`);
    const result = await response.json();

    if (result.success) {
      const court = result.data;

      // Format address for the modal
      const formattedAddress = court.address;

      // Generate the modal content
      const modalContent = `
    <span class="close">&times;</span>
    <h2>Details</h2>

    <!-- Logo -->
    <div class="modal-logo-container">
      <img id="logoImage" src="${court.business_logo}" alt="Logo" />
    </div>

    <!-- Modal Body -->
    <div class="modal-body">
      <div class="column">
        <label>Business Name:</label>
        <input type="text" id="businessName" value="${court.business_name}" readonly />

        <label>Operating Hours:</label>
        <input type="text" id="operatingHours" value="From: ${court.operating_hours.from} To: ${
        court.operating_hours.to
      }" readonly />

        <label>Rate:</label>
        <input type="text" id="rate" value="₱${court.hourly_rate}" readonly />
      </div>

      <div class="column">
        <label>Location:</label>
        <input type="text" id="location" value="${formattedAddress}" readonly />

        <label>Total Courts:</label>
        <input type="text" id="availableCourts" value="${court.totalCourts}" readonly />
      </div>
    </div>

      <!-- Uploaded Files -->
      <div class="file-uploads">
        <label>Uploaded Files:</label>
        <div class="file-areas">
          <!-- Dynamically loop through documents -->
          ${Object.keys(court.documents)
            .map(
              (docKey) =>
                `<div class="file-area" id="${docKey}">
                  <a href="${court.documents[docKey][0]}" target="_blank" download>${docKey
                  .replace(/_/g, ' ')
                  .toUpperCase()}</a>
                </div>`
            )
            .join('')}
        </div>
      </div>
    `;

      // Insert modal content into the modal container
      const modalContentContainer = get('.modal-content');
      modalContentContainer.innerHTML = modalContent;

      // Show the modal
      const viewDetailsModal = getById('viewDetailsModal');
      viewDetailsModal.style.display = 'block';

      // Close the modal when the close button is clicked
      const closeModalBtn = modalContentContainer.querySelector('.close');
      closeModalBtn.addEventListener('click', () => {
        viewDetailsModal.style.display = 'none';
      });
    } else {
      console.error('Error fetching court details:', result.message);
    }
  };
  fetchDataForTab('approval-page');
});

const handleAction = async (courtId, action) => {
  try {
    const res = await fetch(`/superadmin/court/${action}/${courtId}`, { method: 'PATCH' });
    const result = await res.json();

    if (result.success === true) {
      log(`${action} action successful`);
    } else {
      error(`${action} action failed:`, result.message);
    }
  } catch (err) {
    error('Error processing action:', err);
  }
};

function fetchApprovedAndDenied(apiUrl, tableBody, type) {
  fetch(apiUrl)
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        // Clear the existing table content before adding new rows
        tableBody.innerHTML = '';

        // check if data is empty
        if (data.data.length === 0) {
          // Add a row indicating no data available
          const noDataRow = document.createElement('tr');
          const noDataMessage =
            type === 'approve' ? 'No approvals found' : type === 'deny' ? 'No denials found' : 'No data available';
          noDataRow.innerHTML = `
            <td colspan="7" style="text-align: center;">${noDataMessage}</td>
          `;
          tableBody.appendChild(noDataRow);
          return;
        }

        // Populate the table with court data
        data.data.forEach(async (court, index) => {
          const row = document.createElement('tr');

          // Log the court object for debugging
          console.log(court);

          // Access the necessary data from the court object
          const courtOwnerName = `${court.user.first_name} ${court.user.middle_name} ${court.user.last_name}`;
          const formattedAddress = court.address;
          const courtEmail = court.user.email;
          const courtContact = court.user.contact_number;
          const dtiNumber = court.dti_number;
          const registrationDate = new Date(court.user.createdAt).toLocaleDateString();

          // determine action buttons based on the type
          const actionButton =
            type === 'approve'
              ? `<button class="btn btn-reject" data-id="${court._id}">Reject</button>`
              : `<button class="btn btn-approve" data-id="${court._id}">Approve</button>`;

          // Create the row HTML
          row.innerHTML = `
            <td>${index + 1}</td>
            <td>${courtOwnerName}</td>
            <td>${formattedAddress}</td>
            <td>${courtEmail}</td>
            <td>${courtContact}</td>
            <td>${dtiNumber}</td>
            <td>${registrationDate}</td>
            <td>
              <button class="btn btn-view" data-id="${court._id}">View Details</button>
              ${actionButton}
            </td>
          `;

          // append the row to the table body
          tableBody.appendChild(row);
        });
      } else {
        console.error('Failed to load court data');
      }
    })
    .catch((error) => console.error('Error fetching court data:', error));
}

function fetchCourtData(apiUrl, tableBody) {
  fetch(apiUrl)
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        // Clear the existing table content before adding new rows
        tableBody.innerHTML = '';

        // Check if data is empty
        if (data.data.length === 0) {
          // Add a row indicating no data available
          const noDataRow = document.createElement('tr');
          noDataRow.innerHTML = `
            <td colspan="7" style="text-align: center;">No pending approval</td>
          `;
          tableBody.appendChild(noDataRow);
          return;
        }

        // Populate the table with court data
        data.data.forEach(async (court, index) => {
          const row = document.createElement('tr');

          // Log the court object for debugging
          console.log(court);

          // Access the necessary data from the court object
          const courtOwnerName = `${court.user.first_name} ${court.user.middle_name} ${court.user.last_name}`;
          const businessName = court.business_name;
          const formattedAddress = court.address;
          const courtEmail = court.user.email;
          const courtContact = court.user.contact_number;
          const dtiNumber = court.dti_number;
          const registrationDate = new Date(court.user.createdAt).toLocaleDateString();

          // Create the row HTML
          row.innerHTML = `
            <td>${index + 1}</td>
            <td>${courtOwnerName}</td>
            <td>${businessName}</td>
            <td>${formattedAddress}</td>
            <td>${courtEmail}</td>
            <td>${courtContact}</td>
            <td>${dtiNumber}</td>
            <td>${registrationDate}</td>
            <td>
              <button class="btn btn-view" data-id="${court._id}">View Details</button>
              <button class="btn btn-approve" data-id="${court._id}">Approve</button>
              <button class="btn btn-reject" data-id="${court._id}">Reject</button>
            </td>
          `;

          // append the row to the table body
          tableBody.appendChild(row);
        });
      } else {
        console.error('Failed to load court data');
      }
    })
    .catch((error) => console.error('Error fetching court data:', error));
}

function fetchUserData(apiUrl, tableBody) {
  fetch(apiUrl)
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        tableBody.innerHTML = '';

        if (data.data.length === 0) {
          const noDataRow = document.createElement('tr');
          noDataRow.innerHTML = `<td colspan="8" style="text-align: center;">No data available</td>`;
          tableBody.appendChild(noDataRow);
          return;
        }

        data.data.forEach((user, index) => {
          const row = document.createElement('tr');
          row.innerHTML = `
              <td>${index + 1}</td>
              <td>${user.first_name} ${user.middle_name} ${user.last_name}</td>
              <td>${user.municipality}</td>
              <td>${user.contact_number}</td>
              <td>${user.email}</td>
              <td>${user.gender}</td>
              <td>${user.role}</td>
              <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            `;
          tableBody.appendChild(row);
        });
      } else {
        console.error('Failed to load user data');
      }
    })
    .catch((error) => console.error('Error fetching user data:', error));
}
