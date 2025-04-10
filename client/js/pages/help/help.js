import { io } from 'socket.io-client';
import '../../../css/components/navBarUser.css';
import '../../../css/components/preloader.css';
import '../../../css/pages/help/help.css';
import { startSessionChecks, validateSessionAndNavigate } from '../../../utils/sessionUtils.js';
import { openModal } from '../../components/modal.js';
import '../../components/navBarUser.js';
import { setupLogoutListener } from '../../global/logout.js';

setupLogoutListener();

// start session checks on page load
startSessionChecks();

var acc = document.getElementsByClassName('accordion');
var i;

for (i = 0; i < acc.length; i++) {
  acc[i].addEventListener('click', function () {
    this.classList.toggle('active');
    this.parentElement.classList.toggle('active');

    var panel = this.nextElementSibling;

    // Check if the panel is currently displayed
    if (panel.style.display === 'block') {
      panel.style.display = 'none'; // Hide it
    } else {
      panel.style.display = 'block'; // Show it
      // Ensure all other panels are closed
      var allPanels = document.querySelectorAll('.pannel');
      allPanels.forEach(function (p) {
        if (p !== panel) {
          p.style.display = 'none'; // Hide other panels
        }
      });
    }
  });
}

document.querySelectorAll('.rating-option').forEach((option) => {
  option.addEventListener('click', function () {
    // Clear previous selection
    document.querySelectorAll('.rating-option').forEach((opt) => opt.classList.remove('selected'));

    // Mark current as selected
    this.classList.add('selected');

    // Set the hidden input's value based on the selected emoji
    const emojiValue = this.getAttribute('data-value');
    document.getElementById('emojiValue').value = emojiValue;
  });
});

document.getElementById('feedbackForm').addEventListener('submit', function (e) {
  e.preventDefault();

  // get feedback text and emoji value
  const feedbackText = document.querySelector('[name="feedbackText"]').value;
  const emojiValue = document.getElementById('emojiValue').value;

  // create payload
  const feedbackData = { feedbackText, emojiValue };

  fetch('/user/feedback/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(feedbackData)
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.status === 'success') {
        openModal('success', 'Success', data.message, null, null, 'OK');
      } else {
        openModal('error', 'Error', 'Failed to submit feedback', null, null, 'OK');
      }
    })
    .catch((error) => {
      console.error('Error submitting feedback:', error);
      openModal('error', 'Error', 'An error occured. Please try again', null, null, 'OK');
    });
});
