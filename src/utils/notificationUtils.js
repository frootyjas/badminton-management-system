const Notification = require('../models/Notification');
const { getUserSocket } = require('./userSocketManager');

// utility function to create notifications
const createNotification = async (userId, title, message, type = 'info') => {
  try {
    // create and save the notification in the database
    const notification = new Notification({
      userId,
      title,
      message,
      type
    });
    await notification.save();

    // get the user socket for the current user
    const userSocket = getUserSocket(userId.toString());

    userSocket.emit('newNotification', {
      id: notification._id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      createdAt: notification.createdAt
    });

    console.log('Notification created and sent to frontend:', notification);

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw new Error('Notification creation failed');
  }
};

module.exports = { createNotification };
