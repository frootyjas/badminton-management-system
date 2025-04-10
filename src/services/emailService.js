require('dotenv').config();
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { generateOTP } = require('../utils/otpUtils');
const { error, log } = console;
const config = require('config');
const fs = require('fs').promises; // Use promises for cleaner async/await syntax
const path = require('path');

exports.sendOTP = async (email) => {
  try {
    const otp = generateOTP(); //Generate OTP using the utility
    const otpExpiration = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

    // store the OTP and expiration time in the database associated with the user
    const updateResult = await User.updateOne({ email }, { otp, otpExpires: otpExpiration }).exec();

    if (updateResult.nModified === 0) {
      return error(`No user found with email: ${email}`);
    }

    log(`OTP updated for user: ${email}`);

    // Configure Nodemailer to send the email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.gmail.user,
        pass: config.gmail.pass
      }
    });

    const templatePath = path.join(__dirname, '../../client/html/otpEmailTemplate.html');

    // Use async/await to read the HTML template
    const htmlContent = await fs.readFile(templatePath, 'utf8');

    // Replace placeholder with actual OTP
    const emailContent = htmlContent.replace('[OTP_PLACEHOLDER]', otp);

    const mailOptions = {
      from: config.gmail.user,
      to: email,
      subject: 'Email Verification',
      html: emailContent
    };

    // Send the email using your email service here
    const info = await transporter.sendMail(mailOptions);
    log('OTP sent:', info.response);
  } catch (err) {
    if (err.code === 'ENOENT') {
      error('Error: HTML template file not found');
    } else {
      error('Error in sendOTP function:', err);
    }
  }
};

exports.sendForgotPasswordEmail = async (email, resetToken) => {
  try {
    // Configure Nodemailer to send the email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.gmail.user,
        pass: config.gmail.pass
      }
    });

    const templatePath = path.join(__dirname, '../../client/html/forgotPassEmailTemplate.html');

    // Use async/await to read the HTML template
    const htmlContent = await fs.readFile(templatePath, 'utf8');

    // Create a reset link with the reset token
    const resetLink = `${config.frontendUrl}/reset-password?token=${resetToken}`;

    // Replace placeholder with actual reset link
    const emailContent = htmlContent.replace('[RESET_LINK_PLACEHOLDER]', resetLink);

    const mailOptions = {
      from: config.gmail.user,
      to: email,
      subject: 'Password Reset Request',
      html: emailContent
    };

    // Send the email using your email service
    const info = await transporter.sendMail(mailOptions);
    log('Password reset email sent:', info.response);
  } catch (err) {
    if (err.code === 'ENOENT') {
      error('Error: HTML template file not found');
    } else {
      error('Error in sendForgotPasswordEmail function:', err);
    }
  }
};

exports.sendReservationNotification = async (userName, courtName, reservationDate, reservationUrl, userEmail) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.gmail.user,
        pass: config.gmail.pass
      }
    });

    const formattedDate = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(reservationDate));

    const templatePath = path.join(__dirname, '../../client/html/reservationSuccessTemplate.html');
    const htmlContent = await fs.readFile(templatePath, 'utf8');

    // Replace placeholders in the email template
    const emailContent = htmlContent
      .replace('[USER_NAME_PLACEHOLDER]', userName)
      .replace('[COURT_NAME_PLACEHOLDER]', courtName)
      .replace('[RESERVATION_DATE_PLACEHOLDER]', formattedDate)
      .replace('[RESERVATION_URL_PLACEHOLDER]', reservationUrl);

    const mailOptions = {
      from: config.gmail.user,
      to: userEmail,
      subject: 'Court Reservation Successful',
      html: emailContent
    };

    const info = await transporter.sendMail(mailOptions);
    log('Reservation confirmation email sent:', info.response);
  } catch (err) {
    error('Error sending reservation notification:', err);
  }
};

exports.sendJoinEventNotification = async (userName, eventName, eventDate, userEmail) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.gmail.user,
        pass: config.gmail.pass
      }
    });

    const formattedDate = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      timeZone: 'Asia/Manila'
    }).format(new Date(eventDate));

    const templatePath = path.join(__dirname, '../../client/html/joinEventTemplate.html');
    const htmlContent = await fs.readFile(templatePath, 'utf8');

    // Replace placeholders in the email template
    const emailContent = htmlContent
      .replace('[USER_NAME_PLACEHOLDER]', userName)
      .replace('[EVENT_NAME_PLACEHOLDER]', eventName)
      .replace('[EVENT_DATE_PLACEHOLDER]', formattedDate);

    const mailOptions = {
      from: config.gmail.user,
      to: userEmail,
      subject: `Event Registration: ${eventName}`,
      html: emailContent
    };

    const info = await transporter.sendMail(mailOptions);
    log('Join event notification email sent:', info.response);
  } catch (err) {
    if (err.code === 'ENOENT') {
      error('Error: HTML template file not found');
    } else {
      error('Error in sendJoinEventNotification function:', err);
    }
  }
};

exports.sendOrderConfirmation = async (
  customerFirstname,
  customerLastname,
  shopName,
  products,
  totalAmount,
  userEmail
) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.gmail.user,
        pass: config.gmail.pass
      }
    });
    console.log(customerFirstname, customerLastname, shopName, products, totalAmount, userEmail);

    const templatePath = path.join(__dirname, '../../client/html/orderConfirmationTemplate.html');
    const htmlContent = await fs.readFile(templatePath, 'utf8');

    // dynamically generate product rows
    const productRows = products
      .map(
        (product) => `
      <tr>
        <td>${product.product.name}</td>
        <td>${product.quantity}</td>
        <td>₱${product.price.toFixed(2)}</td>
        <td>₱${(product.price * product.quantity).toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    const formattedTotalAmount = Number(totalAmount).toFixed(2);
    // Replace placeholders in the email template
    const emailContent = htmlContent
      .replace('[CUSTOMER_NAME]', `${customerFirstname} ${customerLastname}`)
      .replace('[PRODUCT_ROWS]', productRows)
      .replace('[TOTAL_AMOUNT]', formattedTotalAmount)
      .replace('[SHOP_NAME]', shopName);

    const mailOptions = {
      from: config.gmail.user,
      to: userEmail,
      subject: `Order Confirmation from ${shopName}`,
      html: emailContent
    };

    const info = await transporter.sendMail(mailOptions);
    log('Order confirmation email sent:', info.response);
  } catch (err) {
    if (err.code === 'ENOENT') {
      error('Error: HTML template file not found');
    } else {
      error('Error in sendOrderConfirmation function:', err);
    }
  }
};

exports.sendMembershipConfirmation = async (userName, courtName, membershipName, userEmail) => {
  try {
    // create the email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.gmail.user,
        pass: config.gmail.pass
      }
    });

    // Define the path to the membership confirmation HTML template
    const templatePath = path.join(__dirname, '../../client/html/membershipConfirmationTemplate.html');
    const htmlContent = await fs.readFile(templatePath, 'utf8');

    // Replace the placeholders with actual values
    const emailContent = htmlContent
      .replace('[USER_NAME_PLACEHOLDER]', userName) // Replace user name placeholder
      .replace('[COURT_NAME_PLACEHOLDER]', courtName) // Replace court name placeholder
      .replace('[MEMBERSHIP_NAME_PLACEHOLDER]', membershipName); // Replace membership name placeholder

    // Set up the email options
    const mailOptions = {
      from: config.gmail.user,
      to: userEmail,
      subject: `Membership Subscription Confirmation: ${membershipName}`,
      html: emailContent
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    log('Membership confirmation email sent:', info.response);
  } catch (err) {
    if (err.code === 'ENOENT') {
      error('Error: HTML template file not found');
    } else {
      error('Error in sendMembershipConfirmation function:', err);
    }
  }
};

exports.sendFeedbackEmail = async (userId, feedbackText, emojiValue) => {
  try {
    // fetch user details from the database
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // map emoji value to the corresponding emoji and label
    let emoji;
    let label;
    switch (emojiValue) {
      case '5':
        emoji = '😄'; // Excellent
        label = 'EXCELLENT';
        break;
      case '4':
        emoji = '😊'; // Good
        label = 'GOOD';
        break;
      case '3':
        emoji = '😐'; // Medium
        label = 'MEDIUM';
        break;
      case '2':
        emoji = '😟'; // Poor
        label = 'POOR';
        break;
      case '1':
        emoji = '😞'; // Very Bad
        label = 'VERY BAD';
        break;
      default:
        emoji = ''; // default emoji if no match
        label = '';
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.gmail.user,
        pass: config.gmail.pass
      }
    });

    const templatePath = path.join(__dirname, '../../client/html/feedbackTemplate.html');
    const htmlContent = await fs.readFile(templatePath, 'utf8');

    // replace placeholders with actual values, including the emoji and label
    const emailContent = htmlContent
      .replace('[USER_EMAIL]', user.email)
      .replace('[USER_FEEDBACK]', feedbackText)
      .replace('[FEEDBACK_EMOJI]', emoji)
      .replace('[FEEDBACK_LABEL]', label);

    const mailOptions = {
      from: config.gmail.user,
      to: config.gmail.user,
      subject: 'User Feedback Received',
      html: emailContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Feedback email sent:', info.response);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error('Error: Feedback email template not found');
    } else {
      console.error('Error in sendFeedbackEmail function:', err);
    }
  }
};
