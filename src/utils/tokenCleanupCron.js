const cron = require('node-cron');
const Blacklist = require('../models/Blacklist');
const { log, error } = console;

// function to delete expired tokens
const deleteExpiredTokens = async () => {
  try {
    const currentTime = new Date();

    // Find and delete expired tokens
    const result = await Blacklist.deleteMany({ expiresAt: { $lt: currentTime } });
    log(`Deleted expired tokens: ${result.deletedCount}`);
  } catch (err) {
    error('Error deleting expired tokens:', err);
  }
};

// cron job to run every 5 minutes
const startTokenCleanupCronJob = () => {
  cron.schedule('*/2 * * * *', () => {
    log('Running cron job to delete expired tokens...');
    deleteExpiredTokens();
  });
  log('Cron job scheduled to clean expired tokens every 2 minutes.');
};

module.exports = {
  startTokenCleanupCronJob
};
