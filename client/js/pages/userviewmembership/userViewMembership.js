import '../../../css/components/footer.css';
import '../../../css/components/navBarUser.css';
import '../../../css/components/preloader.css';
import '../../../css/pages/userviewmembership/userViewMembership.css';
import { startSessionChecks, validateSessionAndNavigate } from '../../../utils/sessionUtils.js';
import { openModal } from '../../components/modal.js';
import '../../components/navBarUser.js';
import { setupLogoutListener } from '../../global/logout.js';

startSessionChecks();
setupLogoutListener();

function openModalList() {
  const modal = document.getElementById('listModal');
  modal.style.display = 'flex'; // Open modal when list icon is clicked
}

function closeModalList() {
  const modal = document.getElementById('listModal');
  modal.style.display = 'none';
}

// Add event listeners to the list icon and close buttons
document.querySelector('.list-icon').addEventListener('click', openModalList);
document.querySelector('.close-btn').addEventListener('click', closeModalList);

const fetchMemberships = async () => {
  try {
    const response = await fetch('/user/membership/get-memberships');
    const result = await response.json();

    if (result.status === 'success' && Array.isArray(result.data)) {
      const cardContainer = document.querySelector('.card-container');
      cardContainer.innerHTML = '';

      result.data.forEach((membership) => {
        const {
          _id,
          membershipName,
          membershipDescription,
          membershipPrice,
          imageUrl,
          court: { business_name },
          isSubscribed,
          isCancelled
        } = membership;

        // Create the membership card
        const membershipCard = document.createElement('div');
        membershipCard.className = 'membership-card';

        // Dynamically render the button based on subscription or cancellation status
        let buttonHTML = '';
        if (isSubscribed) {
          buttonHTML = `<button class="subscribe-btn subscribed-btn" disabled>Subscribed</button>`;
        } else if (isCancelled) {
          buttonHTML = `<button class="subscribe-btn cancelled-btn" disabled>Cancelled</button>`;
        } else {
          buttonHTML = `<button 
                class="subscribe-btn" 
                data-membership-id="${_id}" 
                data-membership-name="${membershipName}" 
                data-membership-price="${membershipPrice}" 
                data-business-name="${business_name}">
                Subscribe
             </button>`;
        }

        membershipCard.innerHTML = `
          <img src="${imageUrl}" alt="${membershipName}" />
          <div class="card-content">
            <div class="membership-name" style="font-size: 1.2em; font-weight: bold;">${membershipName}</div>
            <div class="court-name" style="font-weight: bold;">${business_name}</div>
            <div class="card-description">${membershipDescription}</div>
            <div class="price">₱${membershipPrice}</div>
          </div>
          ${buttonHTML}
        `;

        // Append the card to the container
        cardContainer.appendChild(membershipCard);
      });

      // Add event listeners for the "Subscribe" buttons
      document.querySelectorAll('.subscribe-btn:not(.subscribed-btn, .cancelled-btn)').forEach((btn) => {
        btn.addEventListener('click', handleSubscribeClick);
      });
    } else {
      console.error('Failed to fetch memberships:', result.message || 'Unknown error');
    }
  } catch (error) {
    console.error('Error fetching memberships:', error);
  }
};

// Load memberships on page load
document.addEventListener('DOMContentLoaded', fetchMemberships);

const handleSubscribeClick = async (event) => {
  const button = event.target;

  // Extract membership details from data attributes
  const membershipId = button.getAttribute('data-membership-id');
  const membershipName = button.getAttribute('data-membership-name');
  const membershipPrice = button.getAttribute('data-membership-price');
  const businessName = button.getAttribute('data-business-name');

  // Display confirmation before proceeding

  openModal(
    'confirm',
    'Subscribe Confirmation',
    `Are you sure you want to subscribe to "${membershipName}" from ${businessName} for ₱${membershipPrice}?`,
    async () => {
      try {
        // Make the subscription request
        const response = await fetch(`/user/membership/subscribe/${membershipId}`, {
          method: 'POST'
        });

        if (response.ok) {
          const result = await response.json();
          if (result.status === 'success') {
            const { approvalUrl } = result;
            console.log(approvalUrl);

            if (approvalUrl) {
              // Redirect the user to the approval URL
              window.location.href = approvalUrl;
            } else {
              alert('Subscription successful, but no approval URL provided.');
            }
          } else {
            alert(`Subscription failed: ${result.message}`);
          }
        } else {
          const error = await response.json();
          alert(`Error: ${error.message}`);
        }
      } catch (err) {
        console.error('Error subscribing:', err);
        alert('An error occurred while subscribing. Please try again later.');
      }
    },
    null,
    'Yes, Subscribe',
    'Cancel'
  );
};

// Fetch subscriptions
const fetchSubscriptions = async () => {
  try {
    const response = await fetch('/user/membership/get-subscriptions');
    const result = await response.json();

    const membershipTableBody = document.querySelector('#membershipTable tbody');
    membershipTableBody.innerHTML = ''; // Clear existing rows

    if (result.status === 'success' && Array.isArray(result.data) && result.data.length > 0) {
      // Loop through the subscriptions data and create rows dynamically
      result.data.forEach((membership) => {
        membership.subscribers.forEach((subscriber) => {
          const { membershipName, membershipPrice } = membership;

          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${membershipName}</td>
            <td>₱${membershipPrice}</td>
            <td>
              <button class="cancel-btn" data-membership-name="${membershipName}" data-membership-id="${membership._id}" data-user-id="${subscriber.userId}">
                Cancel
              </button>
            </td>
          `;

          membershipTableBody.appendChild(row);
        });
      });

      // Add event listeners for cancel buttons
      document.querySelectorAll('.cancel-btn').forEach((btn) => {
        btn.addEventListener('click', handleCancelClick);
      });
    } else {
      // If no subscriptions, display a "No subscriptions" row
      const noSubscriptionRow = document.createElement('tr');
      noSubscriptionRow.innerHTML = `
        <td colspan="3" class="text-center">No subscriptions found</td>
      `;
      membershipTableBody.appendChild(noSubscriptionRow);
    }
  } catch (error) {
    console.error('Error fetching subscriptions:', error);

    // Handle error case by showing a message in the table
    const membershipTableBody = document.querySelector('#membershipTable tbody');
    membershipTableBody.innerHTML = `
      <tr>
        <td colspan="3" class="text-center">Error fetching subscriptions. Please try again later.</td>
      </tr>
    `;
  }
};

// Fetch subscriptions on page load
document.addEventListener('DOMContentLoaded', fetchSubscriptions);

const handleCancelClick = async (event) => {
  const button = event.target;
  const membershipId = button.getAttribute('data-membership-id');
  const membershipName = button.getAttribute('data-membership-name');

  openModal(
    'confirm',
    'Confirm Removal',
    `Are you sure you want to cancel your subscription from  ${membershipName} ?`,
    async () => {
      try {
        // make the cancel subscription request
        const response = await fetch(`/user/membership/cancel/${membershipId}`, {
          method: 'POST'
        });

        if (response.ok) {
          const result = await response.json();
          if (result.status === 'success') {
            openModal('success', 'Success', result.message, null, null, 'OK');
            button.disabled = true;
            button.innerText = 'Cancelled';
            button.classList.add('cancelled-btn');
            fetchMemberships();
            fetchSubscriptions();
          } else {
            alert(`Failed to cancel subscription: ${result.message}`);
          }
        } else {
          const error = await response.json();
          alert(`Error: ${error.message}`);
        }
      } catch (err) {
        console.error('Error cancelling subscription:', err);
        alert('An error occurred while cancelling the subscription. Please try again later.');
      }
    },
    null,
    'Yes',
    'Cancel'
  );
};
