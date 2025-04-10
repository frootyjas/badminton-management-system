const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);
const getAll = (selector) => doc.querySelectorAll(selector);
const get = (selector) => doc.querySelector(selector);

export function openModal(
  type,
  heading,
  message,
  onConfirm = null,
  onCancel = null,
  confirmText = 'Yes',
  cancelText = 'Cancel'
) {
  // Define modal HTML structure
  let modalHTML = `
    <div id="dynamicModal" class="modal ${type}-modal">
      <div class="modal-content ${type}-box">
        <span class="close" aria-label="Close">&times;</span>
        <h2>${heading}</h2>
        <p>${message}</p>
  `;

  // add buttons depending on the modal type (confirmation or other)
  if (type === 'confirm') {
    modalHTML += `
      <button class="btn confirm-btn">${confirmText}</button>
      <button class="btn cancel-btn">${cancelText}</button>
    `;
  } else {
    // default to OK button if no confirmation is needed
    modalHTML += `<button class="btn confirm-btn">${confirmText}</button>`;
  }

  modalHTML += `</div></div>`;

  // inject the modal HTML into the modalContainer
  const modalContainer = getById('modalContainer'); // Use getById for modalContainer
  modalContainer.innerHTML = modalHTML;

  // show the modal
  const modal = getById('dynamicModal'); // Use getById for modal
  modal.style.display = 'block';

  // add event listener to close the modal when the close button is clicked
  const closeButton = get('.close');
  closeButton.addEventListener('click', () => {
    closeModal('dynamicModal');
  });

  // add event listener for confirm button (Yes/OK)
  const confirmButton = get('.confirm-btn');
  confirmButton.addEventListener('click', () => {
    if (onConfirm) {
      onConfirm();
    }
    closeModal('dynamicModal');
  });

  // if it's a confirmation modal, add cancel functionality
  if (type === 'confirm') {
    const cancelButton = get('.cancel-btn');
    cancelButton.addEventListener('click', () => {
      if (onCancel) {
        onCancel();
      }
      closeModal('dynamicModal');
    });
  }
}

// function to close the modal
export function closeModal(modalId) {
  const modal = getById(modalId);
  if (modal) {
    modal.style.display = 'none';
    modal.remove();
  }
}
