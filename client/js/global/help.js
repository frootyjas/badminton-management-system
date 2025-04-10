const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);
const getAll = (selector) => doc.querySelectorAll(selector);
const get = (selector) => doc.querySelector(selector);

// Function to set up help button listener
export function setupHelp() {
  const helpButton = getById('helpButton');
  if (helpButton) {
    helpButton.addEventListener('click', function () {
      window.location.href = '/user/dashboard';
    });
  } else {
    log('Help button not found');
  }
}
