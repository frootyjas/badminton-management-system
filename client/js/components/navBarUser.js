import { io } from 'socket.io-client';
import { capitalizeFirstLetter, fetchUserData } from '../../utils/userData.js';

const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);

let unseenCount = 0;

(async () => {
  try {
    const userData = await fetchUserData();
    if (userData && userData.username) {
      const usernameElement = getById('username');
      usernameElement.textContent = `Hello, ${capitalizeFirstLetter(userData.username)}!`;

      const userId = userData.id;
      initializeSocket(userId);
      fetchNotifications();
    } else {
      error('User data not found');
    }
  } catch (err) {
    error('Failed to update username', err);
  }
})();

function initializeSocket(userId) {
  if (userId) {
    const socket = io({ query: { userId } });

    socket.on('newNotification', (notification) => {
      console.log('New notification received:', notification);
      addNotificationUI({ notifications: [notification] });
      // renderNotifications({ notifications: [notification] });
    });
    console.log('Socket initialized with userId:', userId);
  } else {
    error('User ID could not be retrieved.');
  }
}

async function fetchNotifications() {
  try {
    const response = await fetch(`/user/notifications`, {
      withPreloader: false
    });
    const data = await response.json();
    console.log('Notifications:', data);
    renderNotifications(data);
  } catch (err) {
    console.error('Failed to fetch notifications', err);
  }
}

const notificationBell = document.getElementById('notificationBell');
const notificationDropdown = document.getElementById('notificationDropdown');
const notificationList = document.getElementById('notificationList');
const notificationCount = document.getElementById('notificationCount');

function addNotificationUI(response) {
  // Access the notifications array from the response object
  const notifications = response.notifications;

  // Check if notifications exist and is an array
  if (Array.isArray(notifications)) {
    console.log(notifications);

    const noNotificationsItem = notificationList.querySelector('li.no-notifications-message');
    if (noNotificationsItem) {
      // Remove the "No notifications available" message if it exists
      noNotificationsItem.remove();
    }

    notifications.forEach((notification) => {
      const li = document.createElement('li');
      li.classList.add('notification-item', getTypeClass(notification.type));

      const title = document.createElement('h6');
      title.textContent = notification.title;

      const message = document.createElement('p');
      message.textContent = notification.message;

      li.appendChild(title);
      li.appendChild(message);

      if (!notification.isRead) {
        li.classList.add('unread');
        unseenCount++;
      } else {
        li.classList.add('read');
      }

      // Mark as read on click
      li.addEventListener('click', async () => {
        // If it's not already read, mark it as read
        if (!notification.isRead) {
          notification.isRead = true; // Update the notification status in the array
          li.classList.remove('unread'); // Remove the 'unread' class
          li.classList.add('read'); // Add the 'read' class
          unseenCount--; // Decrement unseen count
          console.log('Marked as read:', notification);

          // Update the notification read status in the backend (or wherever applicable)
          await updateNotificationReadStatus(notification.id);
          updateNotificationCount(unseenCount);
        }
      });

      notificationList.prepend(li);
    });

    // update notification count
    const notificationCount = document.getElementById('notificationCount');
    notificationCount.textContent = parseInt(notificationCount.textContent) + 1;
    notificationCount.style.display = 'block';
  } else {
    console.error('No notifications found in the response.');
  }
}

function renderNotifications(response) {
  // Access the notifications array from the response object
  const notifications = response.notifications;

  // Check if notifications exist and is an array
  if (Array.isArray(notifications) && notifications.length > 0) {
    console.log(notifications);
    notificationList.innerHTML = '';

    notifications.forEach((notification) => {
      const li = document.createElement('li');
      li.classList.add('notification-item', getTypeClass(notification.type));

      const title = document.createElement('h6');
      title.textContent = notification.title;

      const message = document.createElement('p');
      message.textContent = notification.message;

      li.appendChild(title);
      li.appendChild(message);

      if (!notification.isRead) {
        li.classList.add('unread');
        unseenCount++;
      } else {
        li.classList.add('read');
      }

      // Mark as read on click
      li.addEventListener('click', async () => {
        // If it's not already read, mark it as read
        if (!notification.isRead) {
          notification.isRead = true; // Update the notification status in the array
          li.classList.remove('unread'); // Remove the 'unread' class
          li.classList.add('read'); // Add the 'read' class
          unseenCount--; // Decrement unseen count
          console.log('Marked as read:', notification);

          // Update the notification read status in the backend (or wherever applicable)
          await updateNotificationReadStatus(notification._id);

          // Update the notification count on the UI
          updateNotificationCount(unseenCount);
        }
      });

      notificationList.appendChild(li);
    });

    updateNotificationCount(unseenCount);
  } else {
    console.error('No notifications found in the response.');
    updateNotificationCount(0); // Reset the unread count to 0
    notificationList.innerHTML = '<li class="no-notifications-message">No notifications available at the moment.</li>';
  }
}

function updateNotificationCount(unseenCount) {
  // Update the notification count and visibility
  notificationCount.textContent = unseenCount;
  notificationCount.style.display = unseenCount > 0 ? 'block' : 'none';
}

async function updateNotificationReadStatus(notificationId) {
  try {
    await fetch(`/user/notification/mark-read/${notificationId}`, {
      method: 'PATCH',
      withPreloader: false
    });
  } catch (err) {
    console.error('Failed to update notification status', err);
  }
}

// Helper function to get type-specific classes
function getTypeClass(type) {
  switch (type) {
    case 'info':
      return 'notification-info';
    case 'warning':
      return 'notification-warning';
    case 'success':
      return 'notification-success';
    case 'error':
      return 'notification-error';
    default:
      return '';
  }
}

// Clear all notifications
document.getElementById('clearNotificationsBtn').addEventListener('click', async () => {
  try {
    const response = await fetch('/user/notifications/clear', {
      method: 'DELETE',
      withPreloader: false
    });

    const data = await response.json();

    if (data.status === 'success') {
      updateNotificationCount(0); // Reset the unread count to 0
      notificationList.innerHTML =
        '<li class="no-notifications-message">No notifications available at the moment.</li>';
    } else {
      console.warn(data.message);
    }
  } catch (err) {
    console.error('Failed to clear notifications', err);
  }
});

// Toggle notification dropdown
notificationBell.addEventListener('click', () => {
  const isVisible = notificationDropdown.style.display === 'block';
  notificationDropdown.style.display = isVisible ? 'none' : 'block';
});

// Hide dropdown when clicking outside
document.addEventListener('click', (event) => {
  if (!notificationBell.contains(event.target) && !notificationDropdown.contains(event.target)) {
    notificationDropdown.style.display = 'none';
  }
});
