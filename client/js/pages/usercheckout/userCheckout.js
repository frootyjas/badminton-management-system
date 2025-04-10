import { io } from 'socket.io-client';
import '../../../css/components/footer.css';
import '../../../css/components/navBarUser.css';
import '../../../css/components/preloader.css';
import '../../../css/pages/usercheckout/userCheckout.css';
import { startSessionChecks, validateSessionAndNavigate } from '../../../utils/sessionUtils.js';
import { openModal } from '../../components/modal.js';
import '../../components/navBarUser.js';
import { setupLogoutListener } from '../../global/logout.js';

setupLogoutListener();
startSessionChecks();

// DOM selector functions
const getById = (id) => document.getElementById(id);
const getAll = (selector) => document.querySelectorAll(selector);
const get = (selector) => document.querySelector(selector);

// fetch the cart data when the page loads
async function fetchCartData() {
  try {
    const response = await fetch('/user/cart', {
      method: 'GET'
    });
    const data = await response.json();

    if (data.status === 'success') {
      const courtName =
        data.cart.length > 0 && data.cart[0].product.owner.court.business_name
          ? data.cart[0].product.owner.court.business_name
          : 'Court Name';
      renderCourtName(courtName);
      renderCart(data.cart);
    } else {
      openModal('error', 'Error', 'error fetching cart data', null, null, 'OK', null);
    }
  } catch (error) {
    console.error('Error:', error);
    openModal('error', 'Error', 'An Error occured while fetching cart data', null, null, 'OK', null);
  }
}

// function to render the cart data dynamically
function renderCart(cart) {
  const cartContainer = get('.cart-summary');
  const totalPriceContainer = get('.cart-summary .total-price');
  let totalPrice = 0;

  // empty the cart container before rendering new data
  cartContainer.innerHTML = '';

  // loop through each item in the cart and add it to the page
  cart.forEach((item) => {
    const product = item.product;
    const quantity = item.quantity;
    const itemTotalPrice = product.price * quantity;

    // add product to the cart summary
    const cartItemHtml = `
      <div class="cart-item" data-product-id="${product._id}">
        <img src="${product.image}" alt="Item Image" class="item-image">
        <p>${product.name}</p>
        <p class="quantity">x${quantity}</p>
        <p>${formatCurrency(itemTotalPrice)}</p>
      </div>
    `;

    cartContainer.innerHTML += cartItemHtml;

    // add to total price
    totalPrice += itemTotalPrice;
  });

  // update the total price section
  totalPriceContainer.innerHTML = `${formatCurrency(totalPrice)}`;

  // calculate and display the reservation fee (10%)
  const reservationFee = totalPrice * 0.1;
  const reservationFeeElement = get('.cart-summary .reservation-fee');
  reservationFeeElement.innerHTML = `${formatCurrency(reservationFee)}`;
}

// helper function to format price in PHP (as HTML entity)
function formatCurrency(amount) {
  return `&#8369;${amount.toFixed(2)}`;
}

window.onload = fetchCartData;

// add event listener to the "Reserve Now" button
get('.checkout button').addEventListener('click', async () => {
  try {
    // get the pickup schedule from the input field
    const pickupSchedule = getById('reservation-date').value;
    if (!pickupSchedule) {
      openModal('info', 'Pick Schedule', 'Please select a pickup schedule', null, null, 'OK', null);
      return;
    }

    // fetch cart data
    const cartItems = Array.from(getAll('.cart-item')).map((item) => {
      const productId = item.dataset.productId;
      const quantity = parseInt(item.querySelector('.quantity').innerText.replace('x', ''), 10);
      return { product: productId, quantity };
    });

    if (cartItems.length === 0) {
      alert('Your cart is empty.');
      openModal('info', 'Cart', 'Your cart is empty', null, null, 'OK', null);
      return;
    }

    // prepare payload
    const payload = {
      products: cartItems,
      pickupSchedule
    };

    // make API request to create an order
    const response = await fetch('/user/products/orders/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (response.ok) {
      // redirect user to the PayPal approval URL
      window.location.href = result.approvalUrl;
    } else {
      // handle server-side validation errors
      openModal('error', 'Error creating order', result?.message, null, null, 'OK', null);
    }
  } catch (error) {
    console.error('Error creating order:', error);
    openModal('error', 'Error creating order', 'An unexpected error occured. Please try again', null, null, 'OK', null);
  }
});

function renderCourtName(courtName) {
  const courtNameElement = get('.summary-section h4');
  courtNameElement.textContent = courtName;
}
