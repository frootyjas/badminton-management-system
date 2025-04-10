const cron = require('node-cron');
const moment = require('moment-timezone');
const Reservation = require('../models/Reservation');
const { convertTo24Hour } = require('../utils/timeConvertion');
const { log, error } = console;

const clearPastReservations = async () => {
  try {
    // get the current date and time in the specified timezone
    const now = moment().tz('Asia/Manila');
    const currentDate = moment.tz('Asia/Manila').startOf('day');
    const startOfDay = moment.tz(currentDate, 'Asia/Manila').startOf('day').toISOString();
    const currentTime12Hour = now.format('hh:mm A');
    const currentTime = convertTo24Hour(currentTime12Hour);

    // log current date and time for debugging
    log(`Current Date: ${currentDate}`);
    log(`Current Time (12-hour): ${currentTime12Hour}`);
    log(`Current Time (24-hour): ${currentTime}`);

    // delete reservations where the date is in the past
    const pastDateReservations = await Reservation.deleteMany({
      date: { $lt: startOfDay }
    });

    log(`Deleted ${pastDateReservations.deletedCount} reservations with past dates.`);

    // delete reservations for today where the time slot has passed
    const currentDateReservations = await Reservation.find({
      date: currentDate // Match today's date
    });

    let countDeleted = 0;
    for (const reservation of currentDateReservations) {
      const fromTime = convertTo24Hour(reservation.timeSlot.from);
      const toTime = convertTo24Hour(reservation.timeSlot.to);

      // check if the reservation's time slot has already passed
      if (toTime < currentTime) {
        await Reservation.deleteOne({ _id: reservation._id });
        log(
          `Deleted Reservation ID: ${reservation._id}, Date: ${reservation.date}, TimeSlot: ${reservation.timeSlot.from} - ${reservation.timeSlot.to}`
        );
        countDeleted++;
      }
    }

    log(`Deleted ${countDeleted} reservations with past time slots for today.`);
  } catch (err) {
    error('Error clearing past reservations:', err);
  }
};
const deleteCancelledReservations = async (io) => {
  try {
    // delete reservations with status 'cancelled'
    const deletedReservations = await Reservation.deleteMany({
      status: 'cancelled'
    });

    log(`Deleted ${deletedReservations.deletedCount} cancelled reservations.`);
    io.emit('reservationStatusUpdated', {
      message: `${deletedReservations.deletedCount} cancelled reservations have been deleted.`,
      timestamp: moment().tz('Asia/Manila').format()
    });
  } catch (err) {
    error('Error deleting cancelled reservations:', err);
  }
};

const deletePendingReservations = async (io) => {
  try {
    // delete reservations with status 'pending'
    const deletedReservations = await Reservation.deleteMany({
      status: 'pending'
    });

    log(`Deleted ${deletedReservations.deletedCount} pending reservations.`);
    io.emit('reservationStatusUpdated', {
      message: `${deletedReservations.deletedCount} pending reservations have been deleted.`,
      timestamp: moment().tz('Asia/Manila').format()
    });
  } catch (err) {
    error('Error deleting pending reservations:', err);
  }
};

// cron job to run every minute (for testing)
const startReservationCleanupCronJob = () => {
  cron.schedule(
    '*/1 * * * *', // Run every minute for testing purposes
    async () => {
      log('Running scheduled job to clear past reservations...');
      await clearPastReservations();
    },
    {
      timezone: 'Asia/Manila'
    }
  );

  log('Cron job scheduled to clean past reservations every minute.');
};

// cron job to delete cancelled reservations every minute
const startCancelledCleanupCronJob = (io) => {
  cron.schedule(
    '*/5 * * * *', // run every minute for cancelled reservations
    async () => {
      log('Running scheduled job to delete cancelled reservations...');
      await deleteCancelledReservations(io);
    },
    {
      timezone: 'Asia/Manila'
    }
  );

  log('Cron job scheduled to delete cancelled reservations every minute.');
};

// cron job to delete pending reservations every 5 minutes
const startPendingCleanupCronJob = (io) => {
  cron.schedule(
    '*/5 * * * *', // Run every 5 minutes for pending reservations
    async () => {
      log('Running scheduled job to delete pending reservations...');
      await deletePendingReservations(io);
    },
    {
      timezone: 'Asia/Manila'
    }
  );

  log('Cron job scheduled to delete pending reservations every 5 minutes.');
};

module.exports = {
  startReservationCleanupCronJob,
  startPendingCleanupCronJob,
  startCancelledCleanupCronJob
};
