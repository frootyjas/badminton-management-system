import '../../../css/components/modal.css';
import '../../../css/components/preloader.css';
import '../../../css/components/sideNavAdmin.css';
import '../../../css/pages/adminviewuserpayment/adminViewUserPayment.css';
import { startSessionChecks } from '../../../utils/sessionUtils.js';
import { openModal } from '../../components/modal.js';
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
    if (column.style.display === 'none' || column.style.display === '') {
      column.style.display = 'table-cell';
      getById('expandButton').innerHTML = 'Collapse Table <i class="fas fa-compress"></i>';
    } else {
      column.style.display = 'none';
      getById('expandButton').innerHTML = 'Expand Table <i class="fas fa-expand"></i>';
    }
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

    if (columnIndex === 6 || columnIndex === 9) {
      const statusOrder = {
        paid: 1,
        pending: 2,
        unpaid: 3,
        cancelled: 4
      };

      const normalizedCellA = cellA.toLowerCase();
      const normalizedCellB = cellB.toLowerCase();

      return isAscending
        ? statusOrder[normalizedCellA] - statusOrder[normalizedCellB]
        : statusOrder[normalizedCellB] - statusOrder[normalizedCellA];
    }

    // handling date sorting
    if (columnIndex === 2 || columnIndex === 5 || columnIndex === 6) {
      return isAscending ? new Date(cellA) - new Date(cellB) : new Date(cellB) - new Date(cellA);
    }

    // handling numeric values (if any)
    if (columnIndex === 3 || columnIndex === 7) {
      return isAscending
        ? parseFloat(cellA.replace(/[^0-9.-]+/g, '')) - parseFloat(cellB.replace(/[^0-9.-]+/g, ''))
        : parseFloat(cellB.replace(/[^0-9.-]+/g, '')) - parseFloat(cellA.replace(/[^0-9.-]+/g, ''));
    }

    // Default string comparison
    return isAscending ? cellA.localeCompare(cellB) : cellB.localeCompare(cellA);
  });

  // Toggle sort order for the next sort
  sortOrder[columnIndex] = !isAscending;

  // Clear existing rows and append sorted rows
  table.innerHTML = '';
  rows.forEach((row) => table.appendChild(row));
}

getAll('#paymentTable thead th').forEach((header, index) => {
  header.addEventListener('click', () => {
    // Note: only add sorting functionality to columns that need sorting
    const sortableColumns = [0, 2, 4, 5, 6, 9];
    if (sortableColumns.includes(index)) {
      sortTable(index);
    }
  });
});

async function fetchReservationData() {
  try {
    const response = await fetch('/user/admin/reservations?');
    const data = await response.json();

    if (data.status === 'success' && data.reservationDates) {
      console.log('Fetched reservationDates:', data.reservationDates);
      removeTableHeader();
      generateTableHeader();
      populateTable(data.reservationDates);
    } else if (data.status === 'error' && data.message === 'No reservations found.') {
      removeTableHeader();
      const tbody = get('tbody');
      tbody.innerHTML = '<tr><td colspan="100%" class="no-reservation">No reservations found</td></tr>';
      log('No reservations found for the date:', reservationDate);
    } else {
      error('Unexpected response structure:', data);
      removeTableHeader();
      tbody.innerHTML = '<tr><td colspan="100%" class="no-reservation">Error fetching reservations</td></tr>';
      log('No reservations found for the date:', reservationDate);
    }
  } catch (error) {
    error('Error fetching reservations:', error);
    removeTableHeader();
    const tbody = get('tbody');
    tbody.innerHTML = '<tr><td colspan="100%" class="no-reservation">Error fetching reservations</td></tr>';
    log('No reservations found for the date:', reservationDate);
  }
}

function populateTable(reservationDates) {
  const tbody = getById('paymentTable').querySelector('tbody');
  tbody.innerHTML = '';

  Object.keys(reservationDates).forEach((date) => {
    reservationDates[date].forEach((reservation) => {
      const row = document.createElement('tr');
      row.dataset.id = reservation.reservationId;

      row.innerHTML = `
        <td>${reservation.user.firstName} ${reservation.user.lastName}</td>
        <td>${reservation.userPayment.transactionId}</td>
        <td>${reservation.userPayment.payerEmail}</td>
        <td>${reservation.userPayment.datePaid}</td>
        <td>&#8369;${reservation.userPayment.reservationFee.toFixed(2)}</td>
        <td class="hide-column">${date}</td>
        <td class="hide-column">${reservation.timeSlot.from} - ${reservation.timeSlot.to}</td>
        <td class="hide-column">Court ${reservation.selectedCourts.map((court) => court + 1).join(', ')}</td>
        <td>&#8369;${reservation.userPayment.totalAmount.toFixed(2)}</td>
        <td class="status-cell">${reservation.billStatus}</td>
        <td>
          <div class="action-buttons">
            <button class="icon-button edit-status" title="Edit Status">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </td>
      `;

      tbody.appendChild(row);
    });
  });

  addEditStatusListeners();
}

function addEditStatusListeners() {
  const editButtons = document.querySelectorAll('.edit-status');
  editButtons.forEach((button) => {
    button.addEventListener('click', function () {
      const row = this.closest('tr');
      const statusCell = row.querySelector('.status-cell');
      const currentStatus = statusCell.textContent.trim();
      const reservationId = row.dataset.id; // Access the reservation ID from the data-id attribute

      if (this.classList.contains('editing')) {
        // Save changes
        const dropdown = statusCell.querySelector('select');
        const newStatus = dropdown.value;
        statusCell.textContent = newStatus;

        // Update the bill status by making an API call
        updateBillStatus(reservationId, newStatus);

        // Revert icon to edit
        this.innerHTML = '<i class="fas fa-edit"></i>';
        this.title = 'Edit Status';
        this.classList.remove('editing');
      } else {
        // Replace status text with dropdown
        statusCell.innerHTML = `
          <select>
            <option value="unpaid" ${currentStatus === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
            <option value="paid" ${currentStatus === 'Paid' ? 'selected' : ''}>Paid</option>
          </select>
        `;

        // Change icon to save
        this.innerHTML = '<i class="fas fa-save"></i>';
        this.title = 'Save Status';
        this.classList.add('editing');
      }
    });
  });
}

async function updateBillStatus(reservationId, newStatus) {
  try {
    const response = await fetch(`/user/admin/reservations/${reservationId}/bill-status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ billStatus: newStatus })
    });

    const data = await response.json();

    if (data.status === 'success') {
      openModal(
        'info', // Modal type: info (can be success or error)
        'Bill Status Updated',
        `Bill status for reservation ${reservationId} updated to ${newStatus}.`,
        null, // No onConfirm action needed
        null, // No onCancel action needed
        'OK' // Button text
      );
      fetchReservationData();
    } else {
      openModal(
        'error', // Modal type: error
        'Error Updating Bill Status',
        `Error updating bill status: ${data.message}`,
        null, // No onConfirm action needed
        null, // No onCancel action needed
        'OK' // Button text
      );
    }
  } catch (error) {
    console.error('Error during API call:', error);
  }
}

// function addEditStatusListeners() {
//   const editButtons = document.querySelectorAll('.edit-status');
//   editButtons.forEach((button) => {
//     button.addEventListener('click', function () {
//       const row = this.closest('tr');
//       const statusCell = row.querySelector('.status-cell');
//       const currentStatus = statusCell.textContent.trim();

//       if (this.classList.contains('editing')) {
//         // Save changes
//         const dropdown = statusCell.querySelector('select');
//         const newStatus = dropdown.value;
//         statusCell.textContent = newStatus;

//         // Revert icon to edit
//         this.innerHTML = '<i class="fas fa-edit"></i>';
//         this.title = 'Edit Status';
//         this.classList.remove('editing');
//       } else {
//         // Replace status text with dropdown
//         statusCell.innerHTML = `
//           <select>
//             <option value="Unpaid" ${currentStatus === 'Unpaid' ? 'selected' : ''}>Upaid</option>
//             <option value="Paid" ${currentStatus === 'Paid' ? 'selected' : ''}>Paid</option>
//           </select>
//         `;

//         // Change icon to save
//         this.innerHTML = '<i class="fas fa-save"></i>';
//         this.title = 'Save Status';
//         this.classList.add('editing');
//       }
//     });
//   });
// }

fetchReservationData();

const fetchReservationsByUsername = async (username) => {
  if (username) {
    try {
      const response = await fetch(`/user/admin/reservations?username=${username}`, {
        withPreloader: false
      });
      const data = await response.json();
      if (data.status === 'success') {
        clearTable();
        populateTable(data.reservationDates);
      } else {
        removeTableHeader();
        const tbody = get('tbody');
        tbody.innerHTML = '<tr><td colspan="100%" class="no-reservation">No reservations found</td></tr>';
      }
    } catch (err) {
      error('Error fetching reservations by username:', err);
    }
  } else {
    removeTableHeader();
    generateTableHeader();
    fetchReservationData();
  }
};
const generateTableHeader = () => {
  const thead = doc.createElement('thead');
  const headerRow = doc.createElement('tr');

  headerRow.innerHTML = `
    <th>
      Name
      <i class="sort-icon fas fa-sort"></i>
    </th>
    <th>Payer Email</th>
    <th>
      Date Paid
      <i class="sort-icon fas fa-sort"></i>
    </th>
    <th>Reservation Fee</th>
    <th>Transaction ID</th>
    <th class="hide-column">
      Date Reserved
      <i class="sort-icon fas fa-sort"></i>
    </th>
    <th class="hide-column">Time Reserved</th>
    <th class="hide-column">Court Reserved</th>
    <th>Total Bill</th>
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

function clearTable() {
  getAll('tbody td').forEach((cell) => {
    cell.innerHTML = '';
  });
}

window.onload = () => {
  const searchInput = getById('search');
  if (searchInput) {
    searchInput.value = '';
  }
};

const debouncedFetchReservations = debounce(fetchReservationsByUsername, 300);

getById('search').addEventListener('input', (event) => {
  const username = event.target.value;
  debouncedFetchReservations(username);
});

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
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
