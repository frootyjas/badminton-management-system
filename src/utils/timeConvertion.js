/**
 * Convert 12-hour format time (e.g., '02:30 PM') to 24-hour format
 * @param {String} time12h - Time in 'HH:MM AM/PM' format.
 * @returns {String} - Time in 'HH:MM' 24-hour format.
 */
function convertTo24Hour(time12h) {
  const [time, modifier] = time12h.split(' '); // split into time and AM/PM
  let [hours, minutes] = time.split(':');
  hours = parseInt(hours, 10);
  if (modifier === 'PM' && hours < 12) {
    hours += 12; // convert PM hour to 24-hour format
  } else if (modifier === 'AM' && hours === 12) {
    hours = 0; // midnight case
  }
  return `${String(hours).padStart(2, '0')}:${minutes}`; // return in HH:MM format
}

module.exports = {
  convertTo24Hour
};
