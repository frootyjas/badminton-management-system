const Reservation = require('../models/Reservation');
const Court = require('../models/Court');
const moment = require('moment-timezone');
const { convertTo24Hour } = require('./timeConvertion');

/**
 * Function to check if the selected courts are available for the given date and time slot
 * @param {String} courtId - ID of the court to check availability for.
 * @param {Date} selectedDate - Date of the reservation.
 * @param {Object} timeSlot - Object with 'from' and 'to' time in 'HH:mm AM/PM' format.
 * @param {Array} selectedCourt - Array of indices representing selected courts.
 * @returns {Boolean} - Returns true if courts are available, otherwise false.
 */

async function isCourtAvailable(courtId, selectedDate, timeSlot, selectedCourt) {
  try {
    // convert selectedDate to UTC and get the start and end of the day
    const startOfDay = moment.utc(selectedDate).startOf('day').toISOString();
    const endOfDay = moment.utc(selectedDate).endOf('day').toISOString();

    // convert time slots to 24-hour format
    const fromTime = convertTo24Hour(timeSlot.from);
    const toTime = convertTo24Hour(timeSlot.to);

    console.log('Checking availability between', fromTime, 'and', toTime);

    // find reservations for the specified court and date
    const reservations = await Reservation.find({
      court: courtId,
      date: { $gte: startOfDay, $lt: endOfDay },
      $or: [
        {
          // new slot starts before an existing slot ends and ends after it starts
          $and: [{ 'timeSlot.from': { $lt: toTime } }, { 'timeSlot.to': { $gt: fromTime } }]
        },
        {
          // new slot starts within an existing slot
          $and: [{ 'timeSlot.from': { $lte: fromTime } }, { 'timeSlot.to': { $gte: toTime } }]
        },
        {
          // new slot completely overlaps an existing slot
          $and: [{ 'timeSlot.from': { $gte: fromTime } }, { 'timeSlot.to': { $lte: toTime } }]
        }
      ]
    });

    // check if any conflicting reservations were found
    if (reservations.length > 0) {
      console.log('Conflicting reservations found:', reservations);
      return false; // Time slot is not available
    }

    // get the total number of courts available at the venue
    const court = await Court.findById(courtId);
    if (!court) {
      throw new Error('Court not found');
    }

    // ensure the total courts reserved plus the new request does not exceed the available courts
    const numberOfSelectedCourts = selectedCourt.length;
    if (reservations.length + numberOfSelectedCourts > court.totalCourts) {
      console.log('Not enough courts available');
      return false;
    }

    console.log('Court is available');
    return true;
  } catch (error) {
    console.error('Error checking court availability:', error);
    throw error;
  }
}

module.exports = { isCourtAvailable };
