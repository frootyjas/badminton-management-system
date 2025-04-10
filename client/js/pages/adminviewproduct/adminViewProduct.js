import '../../../css/components/preloader.css';
import '../../../css/components/sideNavAdmin.css';
import '../../../css/pages/adminviewproduct/adminproduct.css';
import { startSessionChecks } from '../../../utils/sessionUtils.js';
import '../../components/sideNavAdmin.js';

// start session checks on page load
startSessionChecks();

const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);
const getAll = (selector) => doc.querySelectorAll(selector);
const get = (selector) => doc.querySelector(selector);

// Fetch products from the server
async function fetchProducts() {
  try {
    const response = await fetch('/user/get-products', {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }

    const data = await response.json();
    const productList = data.data;

    const productListContainer = document.getElementById('product-list');
    productListContainer.innerHTML = '';

    if (productList && productList.length > 0) {
      productList.forEach((product) => {
        renderProductCard(product);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Render a product card
function renderProductCard(product) {
  const productList = document.getElementById('product-list');
  const productCard = document.createElement('div');
  const productCardContent = `
    <div class="product-card" data-product-id="${product._id}">
      <img src="${product.image}" alt="${product.name}">
      <h3>${product.name} - ${product.category}</h3>
      <div class="price">₱${product.price}</div>
      <div class="action-buttons">
        <button class="edit-btn"><i class="fas fa-edit"></i></button>
        <button class="delete-btn"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `;

  productCard.innerHTML = productCardContent;
  productList.appendChild(productCard);

  // Delete product handler
  const deleteButton = productCard.querySelector('.delete-btn');
  deleteButton.addEventListener('click', async function () {
    await deleteProduct(product._id);
    productCard.remove();
  });

  // Edit product handler
  const editButton = productCard.querySelector('.edit-btn');
  editButton.addEventListener('click', function () {
    openEditModal(product);
  });
}

// Fetch and display products on page load
document.addEventListener('DOMContentLoaded', function () {
  fetchProducts();
});

// Modal setup
const modal = document.getElementById('editModal');
const closeButton = document.getElementById('close-edit-modal');
const closeModal = document.querySelector('.close');
const updateProductButton = document.getElementById('update-product-btn');

let currentProduct;

// Open the edit modal with pre-filled product data
function openEditModal(product) {
  document.getElementById('edit-product-name').value = product.name;
  document.getElementById('edit-product-price').value = product.price;
  document.getElementById('edit-product-stock').value = product.stock;
  document.getElementById('edit-product-category').value = product.category;
  document.getElementById('edit-product-image').value = ''; // Reset image field

  modal.style.display = 'block'; // Show the modal
  currentProduct = product; // Set the current product to edit
}

closeModal.onclick = function () {
  modal.style.display = 'none'; // Close the modal
};

window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = 'none'; // Close the modal when clicking outside
  }
};

// Update product
updateProductButton.addEventListener('click', async function () {
  const updatedName = document.getElementById('edit-product-name').value;
  const updatedPrice = document.getElementById('edit-product-price').value;
  const updatedStock = document.getElementById('edit-product-stock').value;
  const updatedCategory = document.getElementById('edit-product-category').value;
  const updatedImage = document.getElementById('edit-product-image').files[0];

  if (currentProduct && updatedName && updatedPrice && updatedCategory && updatedStock) {
    const updatedProduct = {
      name: updatedName,
      price: updatedPrice,
      stock: updatedStock,
      category: updatedCategory,
      image: updatedImage ? updatedImage : currentProduct.image // Upload image only if provided
    };

    // Call API to update product
    await updateProduct(currentProduct._id, updatedProduct);

    // Update UI
    currentProduct.name = updatedName;
    currentProduct.price = updatedPrice;
    currentProduct.stock = updatedStock;
    currentProduct.category = updatedCategory;
    if (updatedImage) {
      // Assuming the server returns a new image URL
      currentProduct.image = updatedProduct.image;
    }

    // Update product card UI
    const productCard = document.querySelector(`[data-product-id="${currentProduct._id}"]`);
    productCard.querySelector('h3').innerText = `${updatedName} - ${updatedCategory}`;
    productCard.querySelector('.price').innerText = `₱${updatedPrice}`;
    if (updatedImage) {
      productCard.querySelector('img').src = URL.createObjectURL(updatedImage); // Create URL for the uploaded image
    }

    modal.style.display = 'none'; // Close the modal
  }
});

// Function to update product on server
async function updateProduct(productId, updatedProduct) {
  try {
    const formData = new FormData();
    formData.append('name', updatedProduct.name);
    formData.append('price', updatedProduct.price);
    formData.append('stock', updatedProduct.stock);
    formData.append('category', updatedProduct.category);
    if (updatedProduct.image) {
      formData.append('image', updatedProduct.image);
    }

    const response = await fetch(`/user/products/${productId}`, {
      method: 'PUT',
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to update product');
    }

    const result = await response.json();
    console.log('Product updated successfully:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Function to delete product from server
async function deleteProduct(productId) {
  try {
    const response = await fetch(`/user/products/${productId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to delete product');
    }

    const result = await response.json();
    console.log('Product deleted successfully:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Handling add new product
document.getElementById('add-product-form').addEventListener('submit', async function (event) {
  event.preventDefault(); // Prevents the default form submission behavior

  // Gather form data
  const formData = new FormData(event.target);

  try {
    // Send a POST request to the server to add a new product
    const response = await fetch('/user/products', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to add product');
    }

    const result = await response.json();
    console.log('Product added successfully:', result);

    // Optionally, clear the form or update the UI
    event.target.reset();
    alert('Product added successfully!');

    // Reload products after adding a new one
    fetchProducts();
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to add product. Please try again.');
  }
});

fetch('/user/admin/products/get-orders')
  .then((response) => response.json())
  .then((data) => {
    if (data.status) {
      const orders = data.orders;
      let htmlContent = '';

      orders.forEach((order) => {
        const user = order.user;
        const products = order.products.map((product) => product.product.name).join(', ');
        const quantity = order.products.reduce((total, product) => total + product.quantity, 0); // Calculate total quantity
        const totalPrice = order.totalAmount; // Assuming totalAmount is provided in the API response
        const reservationFee = order.reservationFee; // Assuming reservationFee is provided
        const reservationDate = new Date(order.reservationDate).toLocaleDateString(); // Format date

        htmlContent += `
          <tr>
            <td>${user.first_name} ${user.last_name}</td>
            <td>${products}</td>
            <td>${quantity}</td>
            <td>₱${totalPrice}</td>
            <td>₱${reservationFee}</td>
            <td>${reservationDate}</td>
          </tr>
        `;
      });

      // Inject the HTML into the table body
      document.getElementById('order-list').innerHTML = htmlContent;
    }
  })
  .catch((error) => {
    console.error('Error fetching orders:', error);
  });
