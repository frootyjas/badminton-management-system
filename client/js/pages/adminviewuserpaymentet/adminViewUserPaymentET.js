import '../../../css/components/preloader.css';
import '../../../css/components/sideNavAdmin.css';
import '../../../css/pages/adminviewuserpayment/adminViewUserPayment.css';
import { startSessionChecks } from '../../../utils/sessionUtils.js';
import '../../components/sideNavAdmin.js';

startSessionChecks();

const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);
const getAll = (selector) => doc.querySelectorAll(selector);
const get = (selector) => doc.querySelector(selector);

getById('expandButton').addEventListener('click', function () {
  const hiddenColumns = getAll('.hide-column');
  hiddenColumns.forEach((column) => {
    column.style.display = column.style.display === 'none' || column.style.display === '' ? 'table-cell' : 'none';
    getById('expandButton').innerHTML =
      column.style.display === 'table-cell'
        ? 'Collapse Table <i class="fas fa-compress"></i>'
        : 'Expand Table <i class="fas fa-expand"></i>';
  });
});

// Initially hide columns
window.onload = function () {
  const hiddenColumns = getAll('.hide-column');
  hiddenColumns.forEach((column) => {
    column.style.display = 'none';
  });
};

let sortOrder = [true, true, true, true, true]; // true for ascending

function sortTable(columnIndex) {
  const table = document.querySelector('table tbody');
  const rows = Array.from(table.rows);
  const isAscending = sortOrder[columnIndex];

  rows.sort((rowA, rowB) => {
    const cellA = rowA.cells[columnIndex].innerText.trim().toLowerCase();
    const cellB = rowB.cells[columnIndex].innerText.trim().toLowerCase();

    // Custom sorting for specific columns
    if (columnIndex === 2 || columnIndex === 5) {
      // Date columns
      return isAscending ? new Date(cellA) - new Date(cellB) : new Date(cellB) - new Date(cellA);
    }

    if (columnIndex === 3 || columnIndex === 4) {
      // Fee columns
      return isAscending
        ? parseFloat(cellA.replace(/[^0-9.-]+/g, '')) - parseFloat(cellB.replace(/[^0-9.-]+/g, ''))
        : parseFloat(cellB.replace(/[^0-9.-]+/g, '')) - parseFloat(cellA.replace(/[^0-9.-]+/g, ''));
    }

    // Default string comparison
    return isAscending ? cellA.localeCompare(cellB) : cellB.localeCompare(cellA);
  });

  sortOrder[columnIndex] = !isAscending; // Toggle sort order for the next sort
  table.innerHTML = ''; // Clear existing rows and append sorted rows
  rows.forEach((row) => table.appendChild(row));
}

getAll('#paymentTable thead th').forEach((header, index) => {
  header.addEventListener('click', () => {
    const sortableColumns = [0, 2, 3, 4, 5]; // Columns that can be sorted
    if (sortableColumns.includes(index)) {
      sortTable(index);
    }
  });
});

async function fetchEventData() {
  try {
    const response = await fetch('/user/admin/events/participants');
    const data = await response.json();

    if (data.status === 'success') {
      console.log('Fetched Event Data:', data.data);
      removeTableHeader();
      generateTableHeader();
      populateTable(data.data);
    } else {
      error('Unexpected response structure:', data);
      const tbody = getById('paymentTable').querySelector('tbody');
      tbody.innerHTML = '<tr><td colspan="100%" class="no-reservation">Error fetching events</td></tr>';
    }
  } catch (error) {
    error('Error fetching events:', error);
  }
}

function populateTable(events) {
  const tbody = getById('paymentTable').querySelector('tbody');
  tbody.innerHTML = '';

  events.forEach((event) => {
    event.participants.forEach((participant) => {
      const row = document.createElement('tr');

      const totalBill = event.reservationFee || 0;

      // determine the bill status based on the reservation fee
      const billStatus = event.reservationFee === null || event.reservationFee === 0 ? 'Paid' : 'Unpaid';

      // create table cells with dynamic data
      row.innerHTML = `
  <td>${participant.first_name} ${participant.last_name}</td>
  <td>${participant.email}</td>
  <td>${new Date().toISOString().split('T')[0]}</td> <!-- Placeholder for Date Paid -->
  <td>${event.reservationFee ? '&#8369;' + event.reservationFee.toFixed(2) : 'Free'}</td>
  <td>${event.eventId}</td>
  <td class="hide-column">${event.eventTitle}</td>
  <td class="hide-column">${participant.date_of_birth.split('T')[0]}</td> <!-- Placeholder for Date of Birth -->
  <td class="hide-column">${participant.role}</td>
  <td>${billStatus}</td> 
  <td>
    <div class="action-buttons">
      <button class="icon-button view-schedule" title="View Schedule">
        <i class="fas fa-calendar-alt"></i>
      </button>
      <button class="icon-button edit-status" title="Edit Status">
        <i class="fas fa-edit"></i>
      </button>
    </div>
  </td>
`;

      tbody.appendChild(row);
    });
  });
}

fetchEventData();

const generateTableHeader = () => {
  const thead = doc.createElement('thead');
  const headerRow = doc.createElement('tr');

  headerRow.innerHTML = `
    <th>
      Name
      <i class="sort-icon fas fa-sort"></i>
    </th>
    <th>Participant Email</th>
    <th>
      Date Paid
      <i class="sort-icon fas fa-sort"></i>
    </th>
    <th>Reservation Fee</th>
    <th>Event ID</th>
    <th class="hide-column">Event Title</th>
    <th class="hide-column">Date of Birth</th>
    <th class="hide-column">Role</th>
    <th>
      Bill Status
      <i class="sort-icon fas fa-sort"></i>
    </th>
    <th>Action</th>
  `;

  thead.appendChild(headerRow);
  document.querySelector('table').prepend(thead);
};

const removeTableHeader = () => {
  const thead = get('thead');
  if (thead) {
    thead.remove();
  }
};

window.onload = () => {
  const searchInput = getById('search');
  if (searchInput) {
    searchInput.value = '';
  }
};

getById('search').addEventListener('input', (event) => {
  const username = event.target.value;
  // debouncedFetchReservations(username);
});

// Debounce function
function debounce(func, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(null, args);
    }, delay);
  };
}

get('.filter-button').addEventListener('click', () => {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');

  // Clone the table to include hidden columns
  const tableClone = document.querySelector('#paymentTable').cloneNode(true);

  // Remove the action column
  tableClone.querySelectorAll('th:last-child, td:last-child').forEach((cell) => cell.remove());

  // Make hidden columns visible in the cloned table
  tableClone.querySelectorAll('.hide-column').forEach((column) => {
    column.style.display = 'table-cell';
  });

  // Prepare the print content
  const printContent = `
    <html>
    <head>
      <title>Print Payment</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
        }
        @page {
          size: landscape;
        }
      </style>
    </head>
    <body>
      <h1>Payment Details</h1>
      ${tableClone.outerHTML}
    </body>
    </html>
  `;

  // Write the content to the new window
  printWindow.document.open();
  printWindow.document.write(printContent);
  printWindow.document.close();

  // Trigger the print function
  printWindow.focus();
  printWindow.print();

  // Close the print window after printing
  printWindow.onafterprint = () => printWindow.close();
});
