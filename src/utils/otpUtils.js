/**
 * Generates a random 6-digit OTP.
 * @returns {number} A random OTP.
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000); // generates a number between 100000 and 999999
}

module.exports = {
  generateOTP
};
