const userSockets = new Map();

const addUserSocket = (userId, socket) => {
  userSockets.set(userId, socket);
  console.log(`User ${userId} connected. Current users:`, Array.from(userSockets.keys()));
};

const removeUserSocket = (userId) => {
  userSockets.delete(userId);
  console.log(`User ${userId} disconnected. Remaining users:`, Array.from(userSockets.keys()));
};

const getUserSocket = (userId) => {
  return userSockets.get(userId);
};
const getUserList = (userId) => {
  return Array.from(userSockets.keys());
};

module.exports = {
  addUserSocket,
  removeUserSocket,
  getUserList,
  getUserSocket
};
