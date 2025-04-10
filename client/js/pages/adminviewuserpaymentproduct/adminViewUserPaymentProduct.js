import '../../../css/components/preloader.css';
import '../../../css/components/sideNavAdmin.css';
import '../../../css/pages/adminviewuserpaymentproduct/adminViewUserPaymentProduct.css';
import { startSessionChecks } from '../../../utils/sessionUtils.js';
import '../../components/sideNavAdmin.js';

startSessionChecks();

const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);
const getAll = (selector) => doc.querySelectorAll(selector);
const get = (selector) => doc.querySelector(selector);

document.addEventListener("DOMContentLoaded", () => {
    // Handle dropdown visibility on edit button click
    document.addEventListener("click", (event) => {
      const editButton = event.target.closest(".edit-status");
      const row = event.target.closest("tr");
  
      // Handle "Edit" button click
      if (editButton) {
        const statusCell = row.querySelector(".bill-status");
        const statusText = statusCell.querySelector(".status-text");
        const statusDropdown = statusCell.querySelector(".status-dropdown");
  
        // Hide all other dropdowns
        document.querySelectorAll(".status-dropdown").forEach((dropdown) => {
          dropdown.classList.add("hide");
          dropdown.closest(".bill-status").querySelector(".status-text").classList.remove("hide");
        });
  
        // Show the dropdown for this row
        statusText.classList.add("hide");
        statusDropdown.classList.remove("hide");
  
        // Change the edit button to a save button
        editButton.innerHTML = '<i class="fas fa-save"></i>';
        editButton.classList.add("save-status");
        editButton.classList.remove("edit-status");
      }
  
      // Handle "Save" button click
      const saveButton = event.target.closest(".save-status");
      if (saveButton) {
        const statusCell = row.querySelector(".bill-status");
        const statusText = statusCell.querySelector(".status-text");
        const statusDropdown = statusCell.querySelector(".status-dropdown");
  
        // Save the selected status and revert to text
        statusText.textContent = statusDropdown.value;
        statusText.classList.remove("hide");
        statusDropdown.classList.add("hide");
  
        // Change the save button back to an edit button
        saveButton.innerHTML = '<i class="fas fa-edit"></i>';
        saveButton.classList.add("edit-status");
        saveButton.classList.remove("save-status");
      }
    });
  });
  