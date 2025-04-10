import { io } from 'socket.io-client';
import '../../../css/components/footer.css';
import '../../../css/components/navBarUser.css';
import '../../../css/components/preloader.css';
import '../../../css/pages/userorderlist/userOrderList.css';
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

// IIFE to fetch and populate orders
(async () => {
  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  const populateOrders = async () => {
    try {
      const response = await fetch('/user/products/orders/paid', {
        method: 'GET'
      });

      // Parse the response JSON
      const data = await response.json();

      if (!data.success) {
        log('No paid orders found.');
        return;
      }

      const orders = data.orders;
      const tableBody = get('#orderTable tbody');

      // clear existing rows
      tableBody.innerHTML = '';

      // populate the table rows
      orders.forEach((order) => {
        order.products.forEach((product) => {
          const shopName = product.shopName || 'Unknown Shop';
          const courtName = product.product.owner.court.business_name || 'Unknown Court';

          // combine shop and court names with proper capitalization
          const shopAndCourt = `${capitalize(shopName)} Court`;

          const row = doc.createElement('tr');

          // populate cells with order data
          row.innerHTML = `
            <td>${shopAndCourt}</td>
            <td>${product.product.name || 'Unnamed Product'}</td>
            <td>${product.quantity || 0}</td>
            <td>${new Date(order.reservationDate).toISOString().split('T')[0]}</td>
            <td>₱${order.reservationFee.toFixed(2)}</td>
            <td>₱${order.totalAmount.toFixed(2)}</td>
            <td>${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</td>
          `;

          tableBody.appendChild(row);
        });
      });
    } catch (err) {
      error('Error fetching or populating orders:', err);
    }
  };

  // call populateOrders inside the IIFE
  await populateOrders();
})();
