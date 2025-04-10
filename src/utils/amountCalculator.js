/**
 * Calculate the total amount for a reservation based on the hourly rate and time slot.
 * @param {Date} fromTime - The start time of the reservation.
 * @param {Date} toTime - The end time of the reservation.
 * @param {number} hourlyRate - The hourly rate of the court.
 * @param {number} numberOfCourts - The number of courts being reserved.
 * @returns {number} - The total amount for the reservation.
 * @throws Will throw an error if the end time is not after the start time.
 */
const calculateTotalAmount = (fromTime, toTime, hourlyRate, numberOfCourts) => {
  // Calculate hours
  const hours = (toTime - fromTime) / (1000 * 60 * 60); // Convert milliseconds to hours

  // Check if the hours are valid
  if (hours <= 0) {
    throw new Error('End time must be after start time.');
  }

  // Calculate the total amount
  return hours * hourlyRate * numberOfCourts;
};

module.exports = calculateTotalAmount;
