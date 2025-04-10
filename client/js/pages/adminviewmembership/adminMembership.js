import '../../../css/components/preloader.css';
import '../../../css/components/sideNavAdmin.css';
import '../../../css/pages/adminviewmembership/adminmembership.css';
import { startSessionChecks } from '../../../utils/sessionUtils.js';
import { openModal } from '../../components/modal.js';
import '../../components/sideNavAdmin.js';

// start session checks on page load
startSessionChecks();

const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);
const getAll = (selector) => doc.querySelectorAll(selector);
const get = (selector) => doc.querySelector(selector);

const subscribersModal = getById('subscribersModal');

// Fetch memberships from the server
async function fetchMemberships() {
  try {
    const response = await fetch('/user/admin/membership/get-memberships', {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch memberships');
    }

    const data = await response.json();
    const membershipList = data.data;

    const membershipListContainer = getById('membership-list');
    membershipListContainer.innerHTML = '';

    if (membershipList && membershipList.length > 0) {
      membershipList.forEach((membership) => {
        renderMembershipCard(membership);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// render a membership card
function renderMembershipCard(membership) {
  const membershipList = getById('membership-list');
  const membershipCard = document.createElement('div');
  const membershipCardContent = `
    <div class="membership-card" data-membership-id="${membership._id}">
      <img src="${membership.imageUrl}" alt="${membership.membershipName}">
      <h3>${membership.membershipName}</h3>
      <div class="price">₱${membership.membershipPrice}</div>
      <div class="description">${membership.membershipDescription}</div>
      <div class="action-buttons">
        <button class="edit-btn"><i class="fas fa-edit"></i></button>
        <button class="view-subscribers-btn"><i class="fas fa-users"></i></button>
        <button class="delete-btn"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `;

  membershipCard.innerHTML = membershipCardContent;
  membershipList.appendChild(membershipCard);

  // delete membership handler
  const deleteButton = membershipCard.querySelector('.delete-btn');
  deleteButton.addEventListener('click', async function () {
    openModal(
      'confirm',
      'Confirm Deletion',
      'Arey you sure you want to delete this membership',
      async () => {
        membershipCard.remove();
        await deleteMembership(membership._id);
      },
      null,
      'Yes, delete it',
      'Cancel'
    );
  });

  // Edit membership handler
  const editButton = membershipCard.querySelector('.edit-btn');
  editButton.addEventListener('click', function () {
    openEditModal(membership);
  });
  const subscribersButton = membershipCard.querySelector('.view-subscribers-btn');
  subscribersButton.addEventListener('click', function () {
    renderSubscribers(membership.subscribers, membership._id);
    subscribersModal.style.display = 'flex';
  });
}

// Fetch and display memberships on page load
document.addEventListener('DOMContentLoaded', function () {
  fetchMemberships();
});

// Modal setup
const editModal = document.getElementById('editModal');
const closeEditModalBtn = document.querySelector('.edit-close');
const closeSubscriberModalBtn = document.querySelector('.subscriber-close');
const updateMembershipButton = document.getElementById('update-membership-btn');

closeSubscriberModalBtn.onclick = function () {
  subscribersModal.style.display = 'none';
};

let currentMembership;

// open the edit modal with pre-filled membership data
function openEditModal(membership) {
  console.log(membership);
  document.getElementById('edit-membership-image').value = '';
  document.getElementById('edit-membership-name').value = membership.membershipName;
  document.getElementById('edit-membership-description').value = membership.membershipDescription;
  document.getElementById('edit-membership-price').value = membership.membershipPrice;

  editModal.style.display = 'block'; // Show the modal
  currentMembership = membership; // Set the current membership to edit
}

closeEditModalBtn.onclick = function () {
  editModal.style.display = 'none';
};

window.onclick = function (event) {
  if (event.target == editModal) {
    editModal.style.display = 'none'; // Close the modal when clicking outside
  }
};

// Update membership
updateMembershipButton.addEventListener('click', async function () {
  const updatedName = document.getElementById('edit-membership-name').value;
  const updatedDescription = document.getElementById('edit-membership-description').value;
  const updatedPrice = document.getElementById('edit-membership-price').value;
  const updatedImage = document.getElementById('edit-membership-image').files[0];

  if (currentMembership && updatedName && updatedPrice && updatedDescription) {
    const updatedMembership = {
      membershipName: updatedName,
      membershipPrice: updatedPrice,
      membershipDescription: updatedDescription,
      image: updatedImage ? updatedImage : currentMembership.image // Upload image only if provided
    };

    // call API to update membership
    await updateMembership(currentMembership._id, updatedMembership);

    // Update UI
    currentMembership.membershipName = updatedName;
    currentMembership.membershipPrice = updatedPrice;
    currentMembership.membershipDescription = updatedDescription;
    if (updatedImage) {
      // Assuming the server returns a new image URL
      currentMembership.image = updatedMembership.image;
    }

    // Update membership card UI
    const membershipCard = document.querySelector(`[data-membership-id="${currentMembership._id}"]`);
    membershipCard.querySelector('h3').innerText = `${updatedName}`;
    membershipCard.querySelector('.price').innerText = `₱${updatedPrice}`;
    membershipCard.querySelector('.description').innerText = `${updatedDescription}`;
    if (updatedImage) {
      membershipCard.querySelector('img').src = URL.createObjectURL(updatedImage); // Create URL for the uploaded image
    }

    editModal.style.display = 'none';
  }
});

// Function to update membership on server
async function updateMembership(membershipId, updatedMembership) {
  try {
    const formData = new FormData();
    formData.append('membershipName', updatedMembership.membershipName);
    formData.append('membershipPrice', updatedMembership.membershipPrice);
    formData.append('membershipDescription', updatedMembership.membershipDescription);
    if (updatedMembership.image) {
      formData.append('image', updatedMembership.image);
    }

    const response = await fetch(`/user/admin/membership/${membershipId}`, {
      method: 'PUT',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to update membership');
    }

    const result = await response.json();
    console.log('membership updated successfully:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Function to delete membership from server
async function deleteMembership(membershipId) {
  try {
    const response = await fetch(`/user/admin/membership/${membershipId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete membership');
    }

    const result = await response.json();
    console.log('membership deleted successfully:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Handling add new membership
doc.getElementById('add-membership-form').addEventListener('submit', async function (event) {
  event.preventDefault(); // Prevents the default form submission behavior

  // Gather form data
  const formData = new FormData(event.target);

  try {
    // Send a POST request to the server to add a new membership
    const response = await fetch('/user/admin/membership/create', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to add membership');
    }

    const result = await response.json();
    console.log('membership added successfully:', result);

    // Optionally, clear the form or update the UI
    event.target.reset();
    alert('membership added successfully!');

    // Reload memberships after adding a new one
    fetchMemberships();
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to add membership. Please try again.');
  }
});

// render subscribers dynamically in the modal
function renderSubscribers(subscribers, subscriptionId) {
  const subscriberTableBody = getById('subscriberTableBody');
  subscriberTableBody.innerHTML = '';

  if (subscribers && subscribers.length > 0) {
    subscribers.forEach((subscriber) => {
      const row = document.createElement('tr');
      const dateSubscribed = new Date(subscriber.subscribedAt).toLocaleDateString();

      row.innerHTML = `
        <td>${subscriber.userId.username}</td>
        <td>${dateSubscribed}</td>
        <td>${subscriber.status.charAt(0).toUpperCase() + subscriber.status.slice(1)}</td>
        <td>
          <button class="remove-btn" data-id="${subscriber.userId.id}">Remove</button>
        </td>
      `;

      subscriberTableBody.appendChild(row);

      // Add click event listener to the remove button
      const removeButton = row.querySelector('.remove-btn');
      removeButton.addEventListener('click', async () => {
        const userId = removeButton.getAttribute('data-id');

        // Confirm before removing
        openModal(
          'confirm',
          'Confirm Removal',
          `Are you sure you want to remove ${subscriber.userId.username} from this membership?`,
          async () => {
            await removeSubscriber(subscriptionId, userId);
            // Re-fetch subscribers after successful removal
            const updatedSubscribers = await fetchSubscribers(subscriptionId);
            renderSubscribers(updatedSubscribers, subscriptionId);
          },
          null,
          'Yes, Remove',
          'Cancel'
        );
      });
    });
  } else {
    subscriberTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center">No subscribers found</td>
      </tr>
    `;
  }
}

// Function to remove a subscriber
async function removeSubscriber(subscriptionId, userId) {
  try {
    const response = await fetch(`/user/admin/membership/${subscriptionId}/remove/${userId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to remove subscriber');
    }
    const result = await response.json();
    console.log('Subscriber removed successfully:', result);
    alert(`Subscriber removed successfully!`);
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to remove subscriber. Please try again.');
  }
}
async function fetchSubscribers(subscriptionId) {
  try {
    const response = await fetch(`/user/admin/membership/${subscriptionId}/subscribers`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch subscribers');
    }

    const data = await response.json();
    return data.subscribers;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}
