const moment = require('moment-timezone'); // Make sure to include moment-timezone

/**
 * Helper function to generate time slots between a given start and end time.
 * @param {String} startTime - The start time in 'HH:mm AM/PM' format.
 * @param {String} endTime - The end time in 'HH:mm AM/PM' format.
 * @param {Number} slotDuration - Slot duration in minutes.
 * @returns {Array} - Array of time slot objects with 'from' and 'to' keys.
 */
function generateTimeSlots(startTime, endTime, slotDuration) {
  const slots = [];
  let currentTime = moment(startTime, 'hh:mm A');
  const end = moment(endTime, 'hh:mm A');

  while (currentTime.isBefore(end)) {
    const nextTime = moment(currentTime).add(slotDuration, 'minutes');
    slots.push({
      from: currentTime.format('hh:mm A'),
      to: nextTime.format('hh:mm A')
    });
    currentTime = nextTime;
  }

  return slots;
}

module.exports = { generateTimeSlots };
