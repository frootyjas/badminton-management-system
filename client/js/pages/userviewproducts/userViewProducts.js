import { io } from 'socket.io-client';
import '../../../css/components/footer.css';
import '../../../css/components/navBarUser.css';
import '../../../css/components/preloader.css';
import '../../../css/pages/userviewproducts/userViewProducts.css';
import { startSessionChecks, validateSessionAndNavigate } from '../../../utils/sessionUtils.js';
import { openModal } from '../../components/modal.js';
import '../../components/navBarUser.js';
import { setupLogoutListener } from '../../global/logout.js';

startSessionChecks();

setupLogoutListener();

const cartIcon = document.getElementById('cart-icon');
const cartItemCount = document.getElementById('cart-item-count');
const cartContainer = document.getElementById('cart');
const closeCartBtn = document.getElementById('close-cart');
const clearCartBtn = document.getElementById('clear-cart');
const totalElement = document.getElementById('total-price');
const cartItemsElement = document.getElementById('cart-items');
const productList = document.getElementById('product-list');
const checkoutBtn = document.getElementById('checkout');
const searchBar = document.getElementById('search-bar');
const categoryFilter = document.getElementById('category-filter');
const shopFilter = document.getElementById('shop-filter');

let cart = JSON.parse(localStorage.getItem('cart')) || [];

// fetch products from the server
async function fetchProducts(withPreloader = true) {
  try {
    const searchQuery = searchBar.value.toLowerCase();
    const selectedCategory = categoryFilter.value;
    // get the selected shop from localStorage if set
    const selectedShop = localStorage.getItem('selectedShop') || shopFilter.value;

    const url = `/user/get-products?search=${searchQuery}&category=${selectedCategory}&shopName=${selectedShop}`;
    const response = await fetch(url, {
      withPreloader
    });
    const data = await response.json();

    if (data.status === 'success') {
      renderProducts(data.data);
    } else {
      console.error('Failed to load products');
    }
  } catch (error) {
    console.error('Error fetching products:', error);
  }
}

// fetch products from the server
async function getShopFilter(withPreloader = true) {
  try {
    const url = `/user/get-products`;
    const response = await fetch(url, {
      withPreloader
    });
    const data = await response.json();

    if (data.status === 'success') {
      updateShopFilter(data.data);
    } else {
      console.error('Failed to load products');
    }
  } catch (error) {
    console.error('Error fetching products:', error);
  }
}

async function fetchCartFromBackend() {
  try {
    const response = await fetch('/user/cart', {
      withPreloader: false
    });
    const data = await response.json();

    if (data.status === 'success') {
      // ensure that each cart item has a productId (fallback if missing)
      cart = data.cart.map((item) => ({
        ...item,
        productId: item?.product._id,
        quantity: item?.quantity || 1
      }));

      saveCartToLocalStorage();
      renderCart();
    }
  } catch (error) {
    console.error('Error fetching cart:', error);
  }
}

// Render products dynamically
function renderProducts(products) {
  productList.innerHTML = ''; // Clear the product list first
  products.forEach((product) => {
    const productCard = document.createElement('div');
    productCard.classList.add('product-card');
    productCard.setAttribute('data-name', product.name);
    productCard.setAttribute('data-category', product.category);
    productCard.setAttribute('data-product-id', product._id);
    productCard.setAttribute('data-shop', product.owner.court.business_name);
    productCard.setAttribute('data-stock', product.stock);

    // dynamically determine if the product is in stock
    const inStock = product.stock > 0;
    const stockStatus = inStock ? 'In Stock' : 'Out of Stock';
    const stockClass = inStock ? 'stock-available' : 'stock-unavailable';

    productCard.innerHTML = `
      <img src="${product.image}" alt="${product.name}" />
      <h3>${product.name}</h3>
      <div class="category">Category: ${product.category}</div>
      <div class="shop-name">Shop: ${product.owner.court.business_name}</div>
      <div class="price">₱${product.price}</div>
      <div class="stock-status ${stockClass}">${stockStatus}</div>
      <button data-name="${product.name}" data-shop="${product.owner.court.business_name}"data-price="${
      product.price
    }" data-image="${product.image}" 
              ${!inStock ? 'disabled' : ''}>
        ${inStock ? 'Add to Cart' : 'Out of Stock'}
      </button>
    `;

    productList.appendChild(productCard);
  });

  // attach event listener to dynamically generated product cards
  addProductToCartListener();
}

function saveCartToLocalStorage() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

// Filter products by updating the selected shop
function filterProducts() {
  fetchProducts(false);
}

document.getElementById('clear-search').addEventListener('click', () => {
  searchBar.value = '';
  categoryFilter.value = '';
  shopFilter.value = '';
  localStorage.removeItem('selectedShop');
  filterProducts();
});

// load products when the page loads
document.addEventListener('DOMContentLoaded', () => {
  fetchProducts();
  getShopFilter();
  // set the shop filter based on localStorage
  const storedShop = localStorage.getItem('selectedShop');
  if (storedShop) {
    shopFilter.value = storedShop; // set the shop filter to the stored value
  }
});

// Event listeners for filters
searchBar.addEventListener('input', filterProducts);
categoryFilter.addEventListener('change', filterProducts);

// update the shop filter and save it in localStorage
shopFilter.addEventListener('change', (event) => {
  const selectedShop = event.target.value;
  // save the selected shop in localStorage
  localStorage.setItem('selectedShop', selectedShop);
  filterProducts();
  // ensure the selected value is retained when fetching products
  shopFilter.value = selectedShop;
});

function updateShopFilter(products) {
  const shopFilter = document.getElementById('shop-filter');
  const uniqueShops = new Set();

  products.forEach((product) => {
    uniqueShops.add(product.owner.court.business_name);
  });

  // clear existing shop filter options
  shopFilter.innerHTML = '<option value="">All Shops</option>';

  // add each unique shop as an option in the filter
  uniqueShops.forEach((shop) => {
    const option = document.createElement('option');
    option.value = shop;
    option.textContent = `${shop}'s Shop`;
    shopFilter.appendChild(option);
  });
}

// pop-up message
function showPopupMessage(message) {
  const popup = document.createElement('div');
  popup.classList.add('popup-message');
  popup.innerText = message;

  document.body.appendChild(popup);

  // show the pop-up
  setTimeout(() => {
    popup.classList.add('show');
  }, 10);

  // hide and remove the pop-up after 3 seconds
  setTimeout(() => {
    popup.classList.remove('show');
    setTimeout(() => popup.remove(), 500);
  }, 3000);
}

cartIcon.addEventListener('click', () => {
  cartContainer.classList.toggle('open');
});

closeCartBtn.addEventListener('click', () => {
  cartContainer.classList.remove('open');
});

//cart logic

// initial render
document.addEventListener('DOMContentLoaded', async () => {
  // renderCart();
  updateCheckoutButtonState();
  await fetchCartFromBackend();
  addProductToCartListener();
});

clearCartBtn.addEventListener('click', async () => {
  cart = [];
  await clearCartFromBackend();
  saveCartToLocalStorage();
  renderCart();
  updateCartItemCount();
  updateCheckoutButtonState();
});

// Add event listener to dynamically generated product cards
function addProductToCartListener() {
  productList.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      const productName = e.target.getAttribute('data-name');
      const productPrice = parseInt(e.target.getAttribute('data-price'));
      const productImage = e.target.getAttribute('data-image');
      const productShop = e.target.closest('.product-card').getAttribute('data-shop');
      const productId = e.target.closest('.product-card').getAttribute('data-product-id');
      const productStock = parseInt(e.target.closest('.product-card').getAttribute('data-stock'));

      // check if item already exists in cart
      const existingItem = cart.find((item) => item.name === productName);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        const product = {
          name: productName,
          price: productPrice,
          image: productImage,
          shopName: productShop,
          productId: productId,
          stock: productStock
        };
        addProductToCart(product);
        addToCart(productId);
        saveCartToLocalStorage();
      }
    }
  });
}

async function addProductToCart(product) {
  const existingItem = cart.find((item) => item.productId === product.productId);

  if (existingItem) {
    const totalQuantity = existingItem.quantity + 1;
    console.log('Found existing item:', existingItem);
    console.log('Total quantity:', totalQuantity, 'Available stock:', product.stock);

    if (totalQuantity > product.stock) {
      showPopupMessage(`Total quantity (${totalQuantity}) exceeds available stock (${product.stock}).`);
      return;
    }

    // Ensure the existing item is being updated
    existingItem.quantity += 1;
    console.log('Updated item:', existingItem);
  } else {
    console.log('Adding new product:', product);
    if (product.stock < 1) {
      showPopupMessage('This item is out of stock.');
      return;
    }

    const newProduct = {
      name: product.name,
      price: product.price,
      image: product.image,
      shopName: product.shopName,
      productId: product.productId,
      quantity: 1,
      stock: product.stock
    };
    cart.push(newProduct);
    console.log('New product added:', newProduct);
  }

  saveCartToLocalStorage();
  showPopupMessage(`${product.name} has been added to the cart!`);
  renderCart();
  updateCartItemCount();
}

// Update cart item count in the cart icon
function updateCartItemCount() {
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartItemCount.textContent = itemCount;
}

// update total price
function updateTotalPrice() {
  // Ensure cart.products is an array and calculate total from that
  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  totalElement.textContent = `Total: ₱${total.toLocaleString()}`;
}

// Render the cart
function renderCart() {
  cartItemsElement.innerHTML = '';

  if (cart.length === 0) {
    cartContainer.classList.add('empty');
    cartItemsElement.innerHTML = '<h2>Your cart is empty!</h2>';
    updateTotalPrice();
    validateCartForCheckout();
    updateCheckoutButtonState();
    return;
  }

  cartContainer.classList.remove('empty');

  cart.forEach((item, index) => {
    const { product, quantity, shopName, name, image, productId, price, stock } = item;

    console.log(item);
    const maxQuantity = product.stock || stock;

    const cartRow = document.createElement('tr');
    cartRow.classList.add('cart-item-row');
    cartRow.innerHTML = `
      <td class="cart-item-radio"><input type="radio" name="checkout-item" /></td>
      <td><img src="${product?.image || image}" alt="${product?.name || name}" /></td>
      <td class="cart-item-details">
        <div class="cart-item-name">${product?.name || name}</div>
        <div class="shop-name">Shop: ${shopName}</div>
      </td>
     <td class="cart-item-actions">
        <div class="cart-item-quantity">
          <input 
            type="number" 
            value="${quantity}" 
            min="1" 
            max="${maxQuantity}" 
            data-index="${index}" 
            class="quantity-input" 
            data-product-id="${productId || product?.id}" 
            data-stock="${maxQuantity}" />
        </div>
      </td>
      <td class="cart-item-price">₱${(product?.price || price * quantity).toLocaleString()}</td>
      <td><button class="remove-button" data-index="${index}" data-product-id="${
      product?.id || productId
    }">REMOVE</button></td>

    `;
    cartItemsElement.appendChild(cartRow);
  });
  attachCartListeners();
  updateTotalPrice();
  updateCartItemCount();
  validateCartForCheckout();
  updateCheckoutButtonState();
}

// Add event listeners for cart quantity changes and item removal
function attachCartListeners() {
  const quantityInputs = document.querySelectorAll('.quantity-input');
  quantityInputs.forEach((input) => {
    input.addEventListener('change', async (e) => {
      const index = e.target.dataset.index;
      const newQuantity = parseInt(e.target.value);
      const productId = e.target.dataset.productId;
      const availableStock = parseInt(e.target.dataset.stock);

      console.log(availableStock, 'dfdf');

      const previousQuantity = cart[index].quantity;

      if (newQuantity > 0 && newQuantity <= availableStock) {
        cart[index].quantity = newQuantity;
        saveCartToLocalStorage();
        renderCart();
        await updateCartItemQuantity(productId, newQuantity);
      } else {
        if (newQuantity > availableStock) {
          showPopupMessage('Quantity exceeds available stock!');
        } else {
          showPopupMessage('Quantity must be at least 1');
        }
        e.target.value = previousQuantity;
        saveCartToLocalStorage();
      }
    });
  });

  const removeButtons = document.querySelectorAll('.remove-button');
  const radioButtons = document.querySelectorAll('.cart-item-radio input[type="radio"]');

  removeButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
      const index = e.target.dataset.index;
      const productId = e.target.dataset.productId;

      // check if the corresponding radio button is selected
      if (radioButtons[index].checked) {
        removeProductFromCart(productId);
        cart.splice(index, 1); // Remove the selected item
        saveCartToLocalStorage();
        renderCart();
        updateCartItemCount();
      } else {
        // show a warning message if no item is selected for deletion
      }
    });
  });
}

async function updateCartItemQuantity(productId, quantity) {
  try {
    const response = await fetch('/user/cart/update-quantity', {
      method: 'PATCH',
      withPreloader: false,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ productId, quantity })
    });

    const data = await response.json();

    if (data.status === 'success') {
      // if successful, fetch the updated cart
      // fetchCartFromBackend();
    } else {
      // if failed, revert the quantity spinner to previous value and show error message
      console.error('Failed to update cart:', data.message);
      showPopupMessage(data.message);
    }
  } catch (error) {
    console.error('Error updating cart item quantity:', error);
    showPopupMessage('An error occurred while updating the cart. Please try again.');
  }
}

checkoutBtn.addEventListener('click', (e) => {
  if (!areProductsFromSameShop(cart)) {
    e.preventDefault(); // prevent navigation if validation fails
    showPopupMessage('Please ensure all items in your cart are from the same shop.');
  } else {
    window.location.href = '/user/products/checkout';
  }
});

async function clearCartFromBackend() {
  try {
    const response = await fetch('/user/cart/clear', {
      method: 'DELETE',
      withPreloader: false
    });

    const data = await response.json();
    if (data.status !== 'success') {
      console.error('Failed to clear cart on backend');
    }
  } catch (error) {
    console.error('Error clearing cart from backend:', error);
  }
}

async function removeProductFromCart(productId) {
  try {
    const response = await fetch(`/user/cart/remove/${productId}`, {
      method: 'DELETE',
      withPreloader: false
    });

    const data = await response.json();

    if (data.status === 'success') {
      // update the cart after successful product removal
      fetchCartFromBackend();
    } else {
      console.error('Failed to remove product:', data.message);
    }
  } catch (error) {
    console.error('Error removing product from cart:', error);
  }
}

async function addToCart(productId) {
  try {
    const response = await fetch('/user/cart/add', {
      method: 'POST',
      withPreloader: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity: 1 })
    });
    const data = await response.json();

    if (data.status === 'success') {
      cart = data.cart; // update local cart with server response

      saveCartToLocalStorage();
      renderCart();
    } else {
    }
  } catch (error) {
    console.error('Error adding to cart:', error);
  }
}

function areProductsFromSameShop(cart) {
  if (cart.length === 0) return true;
  const shopName = cart[0].shopName;
  return cart.every((item) => item.shopName === shopName);
}

// validate cart before allowing checkout
function validateCartForCheckout() {
  const isValid = areProductsFromSameShop(cart);
  if (!isValid) {
    showPopupMessage('All items in your cart must be from the same shop to proceed to checkout.');
  }
  checkoutBtn.disabled = !isValid;
}

function updateCheckoutButtonState() {
  if (cart.length === 0) {
    checkoutBtn.disabled = true;
    return;
  }
}

async function fetchOrderStatus(orderId) {
  try {
    const response = await fetch(`/user/products/orders/status?orderId=${orderId}`);
    const data = await response.json();

    console.log(data);

    if (data.success) {
      openModal(
        'success',
        'Order Status',
        `Order Status: ${data.status}`,
        () => {
          // this function will be executed if the user clicks "Confirm"
          window.location.href = '/user/products/order-list';
        },
        null,
        'OK', // Text for the "Confirm" button
        'Cancel' // Text for the "Cancel" button
      );
    } else {
      console.error('Failed to fetch order status');
    }
  } catch (error) {
    console.error('Error fetching order status:', error);
  }
}

function removeOrderIdFromURL() {
  const url = new URL(window.location);
  url.searchParams.delete('orderId');
  window.history.replaceState({}, '', url.toString());
}

document.addEventListener('DOMContentLoaded', handleOrderStatus);

function handleOrderStatus() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId');

  if (orderId) {
    fetchOrderStatus(orderId);
    removeOrderIdFromURL();
  }
}
