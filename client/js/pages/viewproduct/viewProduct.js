import '../../../css/components/preloader.css';
import '../../../css/components/sideNavAdmin.css';
import '../../../css/pages/viewproduct/viewProduct.css';
import { startSessionChecks } from '../../../utils/sessionUtils.js';
import '../../components/sideNavAdmin.js';

startSessionChecks();

const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);
const getAll = (selector) => doc.querySelectorAll(selector);
const get = (selector) => doc.querySelector(selector);

doc.addEventListener('DOMContentLoaded', function () {
  const addProductButton = getById('addProductButton');
  const modal = getById('addProductModal');
  const cancelProductModal = getById('cancelProductModal');

  addProductButton.addEventListener('click', function (e) {
    e.preventDefault();
    modal.style.display = 'block';
  });

  cancelProductModal.addEventListener('click', function () {
    modal.style.display = 'none';
  });

  window.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  };
});

function toggleTables() {
  const productTableContainer = document.getElementById('productTableContainer');
  const archiveTableContainer = document.getElementById('archiveTableContainer');
  const toggleButton = document.getElementById('toggleTableButton');

  if (productTableContainer.style.display === 'none') {
    productTableContainer.style.display = 'block';
    archiveTableContainer.style.display = 'none';
    toggleButton.innerHTML = 'Archive <i class="fas fa-archive"></i>';
  } else {
    productTableContainer.style.display = 'none';
    archiveTableContainer.style.display = 'block';
    toggleButton.innerHTML = 'Product List <i class="fas fa-box"></i>';
  }
}
