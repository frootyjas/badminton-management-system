const User = require('../models/User');
const File = require('../models/File');
const Reservation = require('../models/Reservation');
const Announcement = require('../models/Announcement');
const Event = require('../models/Event');
const Tournament = require('../models/Tournament');
const { assignFileAccess } = require('../utils/assignFileAccess');
const { isCourtAvailable } = require('../utils/courtAvailability');
const { convertTo24Hour } = require('../utils/timeConvertion');
const { log, error } = console;
const { uploadToR2, deleteFromR2, getFileFromR2 } = require('../services/r2Service');
const mongoose = require('mongoose');
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);
const mime = require('mime-types');
const fileType = require('file-type-cjs');
const Court = require('../models/Court');
const moment = require('moment-timezone');
const calculateTotalAmount = require('../utils/amountCalculator');
const createError = require('http-errors');
const config = require('config');
const Post = require('../models/Post');
const {
  createPayPalPayment,
  capturePayPalPayment,
  createPayPalPayout,
  getPayPalPaymentDetails
} = require('../services/paypalService');
const serveFile = require('../utils/fileUtils');
const path = require('path');
const { geocodeAddress, getAddressFromCoordinates } = require('../utils/addressUtils');
const { handleMultipleFileUploads, handleFileUpload } = require('../utils/fileUpload');
const Category = require('../models/Category');
const Membership = require('../models/Membership');
const sanitizeHtml = require('sanitize-html');
const Hashtag = require('../models/Hashtag');
const Product = require('../models/Product');
const MembershipSubscription = require('../models/MembershipSubscription');
const {
  sendReservationNotification,
  sendJoinEventNotification,
  sendOrderConfirmation,
  sendMembershipConfirmation,
  sendFeedbackEmail
} = require('../services/emailService');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const { createNotification } = require('../utils/notificationUtils');
const Notification = require('../models/Notification');

exports.getCurrentUser = async (req, res) => {
  try {
    let user = await User.findById(req.user.id).select('+isAdmin'); // Select the isAdmin field

    if (!user) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'User not found'
      });
    }

    // if the user is an admin, populate the court field
    if (user.isAdmin) {
      user = await user.populate('court');
    }

    // Send the user object, with court info if admin
    res.json(user);
  } catch (err) {
    error('Error occurred while fetching current user:', err);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal Server Error'
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if the userId is missing
    if (!userId) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'User ID is required'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'User not found'
      });
    }

    res.json(user);
  } catch (err) {
    console.error('Error occurred while fetching user by ID:', err);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal Server Error'
    });
  }
};

exports.updateUserInfo = async (req, res) => {
  try {
    const userId = req.user.id;

    // safely extract the uploaded file and password
    const profile_photo = req.files?.profile_photo;
    const password = req.body.password;
    const newEmail = req.body.email;

    // retrieve the user's current profile
    const user = await User.findById(userId);

    // Check if the new email is the same as the old email
    if (newEmail && newEmail === user.email) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'The new email must be different from the current email.'
      });
    }

    // Check if the new password is the same as the old password
    if (password && password === user.password) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'The new password must be different from the current password.'
      });
    }

    // check if profile_photo is provided and handle the upload
    let fileUrl;
    if (profile_photo) {
      // // Check file size limit (e.g., 5MB)
      // const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
      // if (profile_photo.size > MAX_SIZE) {
      //   return res.status(400).json({
      //     status: 'error',
      //     code: 400,
      //     message: 'File size exceeds the limit of 5MB.'
      //   });
      // }

      // // check the file's MIME type using file-type
      // const fileBuffer = profile_photo.data;
      // const type = await fileType.fromBuffer(fileBuffer);
      // const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];

      // if (!type || !allowedMimeTypes.includes(type.mime)) {
      //   return res.status(400).json({
      //     status: 'error',
      //     code: 400,
      //     message: 'Invalid file type. Only images are allowed.'
      //   });
      // }

      // delete the existing profile photo from Cloudflare R2 if present
      if (user.profile_photo) {
        const fileName = user.profile_photo.split('/').pop(); // Extract the file name from the URL
        await deleteFromR2(fileName); // Delete the old photo
      }

      // upload the new file to Cloudflare R2
      const uploadResult = await uploadToR2(profile_photo.data, profile_photo.name);
      const fileName = uploadResult.fileName;
      fileUrl = `/user/data/${fileName}`;

      // assign access permissions for the new profile photo
      const accessibleUsers = [userId]; // User who uploaded should have access

      const file = new File({
        fileName: uploadResult.fileName,
        owner: userId, // The ID of the user who owns this file
        isPublic: true
      });

      await assignFileAccess(file, userId, [], accessibleUsers);
    }

    // Update user's fields
    if (req.body) {
      Object.assign(user, req.body);
    }

    // Update profile photo URL if it was uploaded
    if (fileUrl) {
      user.profile_photo = fileUrl;
    }

    // If the password is being updated, the pre-save hook will hash it
    if (password) {
      user.password = password;
    }

    // Set email verification to false if the email is being updated
    if (newEmail) {
      user.email = newEmail;
    }

    // Save the user, triggering the pre-save hook
    await user.save();

    return res.status(200).json({
      status: 'success',
      code: 200,
      message: 'User information updated successfully',
      user
    });
  } catch (err) {
    console.error(err);
    if (err instanceof mongoose.Error.StrictModeError) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Invalid fields in the request.'
      });
    }
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal Server Error'
    });
  }
};

exports.serveData = async (req, res) => {
  const { filename } = req.params;

  try {
    // Fetch file stream from R2
    const fileStream = await getFileFromR2(filename);

    if (!fileStream) {
      return res.status(404).json({
        status: 'error',
        message: 'File not found'
      });
    }

    // Set the correct Content-Type based on the file extension
    const mimeType = mime.lookup(filename) || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);

    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    // Pipe the file stream to the response
    await pipelineAsync(fileStream, res);

    // Ensure response is ended properly
    res.end(); // Call to end the response, though pipeline should handle this.
  } catch (err) {
    console.error('Error fetching file:', err);

    // Check if headers are already sent
    if (!res.headersSent) {
      // Handle specific errors
      if (err.code === 'ERR_STREAM_PREMATURE_CLOSE') {
        return res.status(500).json({
          status: 'error',
          message: 'File streaming failed due to an internal error.'
        });
      }

      // Handle other errors
      return res.status(500).json({
        status: 'error',
        code: 500,
        message: 'Internal Server Error'
      });
    }

    // Log if headers are already sent
    console.error('Headers already sent, cannot respond with error:', err);
  }
};

// controller function to get all available courts
exports.getAllCourts = async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Current page, default is 1
  const limit = parseInt(req.query.limit) || 10; // Number of items per page, default is 10
  const skip = (page - 1) * limit; // Calculate how many items to skip

  const query = {};

  // Check for search parameters
  if (req.query.business_name) {
    const businessName = req.query.business_name.trim();

    // Minimum length check to avoid meaningless results
    if (businessName.length >= 3) {
      // Use a regex to match any part of the business name, case-insensitive
      query.business_name = { $regex: businessName, $options: 'i' };
    } else {
      return res.status(400).json({
        status: 'error',
        code: '400',
        message: 'Search term is too short. Please provide at least 3 characters.'
      });
    }
  }
  // check for location search (street address)
  if (req.query.address) {
    try {
      // convert the address to coordinates (geocoding)
      const { latitude, longitude } = await geocodeAddress(req.query.address);
      console.log(latitude, longitude);

      // use MongoDB's geospatial query to find courts near the location
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: 5000 // 5 kilometers (adjust this as needed)
        }
      };
    } catch (error) {
      log(error);
      return res.status(400).json({
        status: 'error',
        code: '400',
        message: 'Invalid address. Could not find location.'
      });
    }
  }

  try {
    // fetch total number of courts for pagination
    const totalCourts = await Court.countDocuments({});
    const courts = await Court.find(query).select('-documents -paypal_email').skip(skip).limit(limit);

    // calculate total pages
    const totalPages = Math.ceil(totalCourts / limit);

    // return the courts data with pagination info
    return res.status(200).json({
      status: 'success',
      code: 200,
      totalCourts,
      totalPages,
      currentPage: page,
      courts
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal Server Error'
    });
  }
};

exports.getCourtById = async (req, res) => {
  try {
    const courtId = req.params.id;

    // check if the courtId is missing
    if (!courtId) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Court ID is required'
      });
    }

    // find the court by ID
    const court = await Court.findById(courtId).select('-documents');

    if (!court) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Court not found'
      });
    }

    // return the court data
    res.json(court);
  } catch (err) {
    console.error('Error occurred while fetching court by ID:', err);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal Server Error'
    });
  }
};

// reservation controller function
exports.createReservation = async (req, res, io) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'User not found'
      });
    }

    const { courtId, date, timeSlot, selectedCourt } = req.body;

    // Validate input
    if (
      !courtId ||
      !date ||
      !timeSlot ||
      !timeSlot.from ||
      !timeSlot.to ||
      !Array.isArray(selectedCourt) ||
      selectedCourt.length === 0
    ) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'All fields are required and selectedCourt must not be empty.'
      });
    }

    const now = moment.tz('Asia/Manila');

    // Convert date to a Date object in Philippine timezone
    const selectedDate = moment.tz(date, 'Asia/Manila');
    const currentDate = moment.tz(new Date(), 'Asia/Manila');

    // Normalize to the start of the day for comparison in Philippine timezone
    const currentDateStartOfDay = now.clone().startOf('day');
    const selectedDateStartOfDay = selectedDate.clone().startOf('day');

    console.log('Now:', now.format());
    console.log('Selected Date:', selectedDate.format());
    console.log('Current Date Start of Day:', currentDateStartOfDay.format());
    console.log('Selected Date Start of Day:', selectedDateStartOfDay.format());

    // Check if the selected date is in the past
    if (selectedDateStartOfDay.isBefore(currentDateStartOfDay)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Cannot check availability for past dates.'
      });
    }

    // if the selected date is today, check the time slot
    if (selectedDateStartOfDay.isSame(currentDateStartOfDay)) {
      const fromTimeString = `${date} ${timeSlot.from}`;
      const fromTime = moment.tz(fromTimeString, 'Asia/Manila');

      // check if the time slot's start time is in the past
      if (fromTime.isBefore(now)) {
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Cannot reserve a time slot that is in the past.'
        });
      }
    }

    // Get the court and its total courts
    const court = await Court.findById(courtId);
    if (!court) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Court not found'
      });
    }

    // use the virtual field to get the total number of courts
    const totalCourts = court.totalCourts;
    log('total courts', totalCourts);

    // Check if the selected court images are within bounds
    if (selectedCourt.some((index) => index < 0 || index >= totalCourts)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: `Selected court indices are out of bounds. Total courts available: ${totalCourts}.`
      });
    }

    // Check court availability
    const courtAvailable = await isCourtAvailable(courtId, selectedDate, timeSlot, selectedCourt.length);
    if (!courtAvailable) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Selected time slot is not available'
      });
    }

    const hourlyRate = court.hourly_rate;

    const { operating_hours } = court;

    // convert operating hours to Date objects for the selected date
    const operatingStart = moment.tz(`${date} ${operating_hours.from}`, 'YYYY-MM-DD h:mm A', 'Asia/Manila');
    const operatingEnd = moment.tz(`${date} ${operating_hours.to}`, 'YYYY-MM-DD h:mm A', 'Asia/Manila');

    // convert time to 24-hour format
    const fromTime24 = convertTo24Hour(timeSlot.from);
    const toTime24 = convertTo24Hour(timeSlot.to);

    // create Date objects for fromTime and toTime
    const fromTime = moment.tz(`${selectedDate.format('YYYY-MM-DD')} ${fromTime24}`, 'Asia/Manila');
    const toTime = moment.tz(`${selectedDate.format('YYYY-MM-DD')} ${toTime24}`, 'Asia/Manila');

    // validate that the time slot falls within operating hours
    if (fromTime.isBefore(operatingStart) || toTime.isAfter(operatingEnd)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: `The selected time slot (${timeSlot.from} - ${timeSlot.to}) is outside of operating hours (${operating_hours.from} - ${operating_hours.to}).`
      });
    }

    // validate time range
    if (fromTime.isAfter(toTime)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'End time must be after start time'
      });
    }

    // ensure the reservation starts at least one hour from now
    const oneHourLater = now.clone().add(1, 'hour'); // Current time + 1 hour
    if (fromTime.isBefore(oneHourLater)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Reservations must start at least one hour from the current time.'
      });
    }

    // calculate total amount
    const totalAmount = calculateTotalAmount(fromTime, toTime, hourlyRate, selectedCourt.length);

    // create a new reservation
    const reservation = new Reservation({
      user: userId,
      court: courtId,
      date: selectedDate.toDate(),
      timeSlot: {
        from: fromTime24,
        to: toTime24
      },
      totalAmount,
      selectedCourt,
      status: 'pending',
      paymentStatus: 'unpaid'
    });

    await reservation.save();

    const reservationId = reservation._id;

    const admin = await User.findOne({ court: courtId, role: 'admin' }).select('payer_id');

    if (!admin) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Admin with specified court ID not found'
      });
    }

    const payerId = admin.payer_id;

    const payment = await createPayPalPayment(hourlyRate, payerId, courtId, reservationId);
    const approvalUrl = payment.links.find((link) => link.rel === 'payer-action').href;

    log(payment);

    io.emit('reservationCreated', {
      courtId,
      date
    });

    return res.status(201).json({
      status: 'success',
      code: 201,
      reservation,
      approvalUrl: approvalUrl
    });
  } catch (err) {
    // handle duplicate key error
    console.error('Error while creating reservation:', err);
    if (err.name === 'MongoServerError' && err.code === 11000) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'This time slot is already booked. Please choose another time.'
      });
    }
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal Server Error'
    });
  }
};

exports.getAvailability = async (req, res) => {
  try {
    const { date, courtId } = req.query;
    const userId = req.user.id;

    // Validate the date parameter
    if (!date) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Date is required.'
      });
    }

    // Parse the date
    const selectedDate = moment.tz(date, 'YYYY-MM-DD', 'Asia/Manila').startOf('day');
    const currentDate = moment().tz('Asia/Manila').startOf('day');
    const currentTime = moment().tz('Asia/Manila'); // Capture current time for later checks

    // Log current time for debugging
    console.log('Current Time:', currentTime.format('YYYY-MM-DD h:mm A'));

    // Check if the selected date is in the past
    if (selectedDate.isBefore(currentDate)) {
      return res.status(400).json({ error: 'Cannot check availability for past dates.' });
    }

    const response = {
      status: 'success',
      reservedDates: [],
      userReservedDates: [],
      courts: []
    };

    // find all courts if courtId is not provided
    const courts = courtId ? [await Court.findById(courtId)] : await Court.find();

    if (courtId && !courts[0]) {
      return res.status(404).json({ error: 'Court not found.' });
    }

    // Iterate through each court
    for (const court of courts) {
      const courtResponse = {
        courtId: court._id,
        timeSlot: {
          available: [],
          unavailable: []
        }
      };

      // get only reservations that are confirmed/completed and paid
      const reservations = await Reservation.find({
        court: court._id,
        status: { $in: ['confirmed', 'pending'] },
        paymentStatus: { $in: ['paid', 'unpaid'] }
      });

      reservations.forEach((reservation) => {
        const reservationDate = moment(reservation.date).tz('Asia/Manila').startOf('day');
        if (reservationDate.isSame(currentDate, 'day') || reservationDate.isAfter(currentDate)) {
          // check if the reservation is by the current user
          if (reservation.user.toString() === userId) {
            if (!response.userReservedDates.includes(reservationDate.format('YYYY-MM-DD'))) {
              response.userReservedDates.push(reservationDate.format('YYYY-MM-DD'));
            }
          } else {
            // only push to reservedDates if it's from another user
            if (!response.reservedDates.includes(reservationDate.format('YYYY-MM-DD'))) {
              response.reservedDates.push(reservationDate.format('YYYY-MM-DD'));
            }
          }
        }
      });

      // Get operating hours
      const operatingHours = court.operating_hours;
      const operatingStart = moment.tz(`${date} ${operatingHours.from}`, 'YYYY-MM-DD h:mm A', 'Asia/Manila');
      const operatingEnd = moment.tz(`${date} ${operatingHours.to}`, 'YYYY-MM-DD h:mm A', 'Asia/Manila');

      // Create available time slots
      const availableTimeSlots = [];
      for (let m = operatingStart; m.isBefore(operatingEnd); m.add(1, 'hours')) {
        availableTimeSlots.push(m.format('h:mm A') + ' - ' + m.clone().add(1, 'hour').format('h:mm A'));
      }

      // Log available time slots
      console.log('Available Time Slots Before Reservations:', availableTimeSlots);

      // Mark unavailable slots
      const unavailableTimeSlots = new Set();

      // Mark reservations as unavailable
      reservations.forEach((reservation) => {
        const reservationDate = moment(reservation.date).tz('Asia/Manila').startOf('day');
        if (reservationDate.isSame(selectedDate, 'day')) {
          const from = moment.tz(reservation.timeSlot.from, 'h:mm A', 'Asia/Manila');
          const to = moment.tz(reservation.timeSlot.to, 'h:mm A', 'Asia/Manila');
          for (let m = from; m.isBefore(to); m.add(1, 'hour')) {
            const timeSlotKey = `${m.format('h:mm A')} - ${m.clone().add(1, 'hour').format('h:mm A')}`;
            unavailableTimeSlots.add(timeSlotKey);
          }
        }
      });

      // Check for past time slots and those within the next hour only for today
      const currentDate2 = currentTime.clone().startOf('day'); // Start of current day

      if (selectedDate.isSame(currentDate2, 'day')) {
        const oneHourFromNow = currentTime.clone().add(1, 'hour');

        availableTimeSlots.forEach((slot) => {
          const [fromTimeStr] = slot.split(' - ');
          const fromTime = moment.tz(
            selectedDate.format('YYYY-MM-DD') + ' ' + fromTimeStr,
            'YYYY-MM-DD h:mm A',
            'Asia/Manila'
          );

          // Logging for debugging
          console.log(`Current Time: ${currentTime.format('YYYY-MM-DD HH:mm:ss')}`);
          console.log(`From Time: ${fromTime.format('YYYY-MM-DD HH:mm:ss')}`);
          console.log(`One Hour From Now: ${oneHourFromNow.format('YYYY-MM-DD HH:mm:ss')}`);

          // Mark as unavailable if the slot is in the past
          if (fromTime.isBefore(currentTime)) {
            unavailableTimeSlots.add(slot);
            console.log(`Marking as unavailable (past): ${slot}`);
          }
          // Mark as unavailable if the slot starts within the next hour
          else if (fromTime.isBefore(oneHourFromNow)) {
            if (fromTime.isSame(currentTime, 'hour') && currentTime.isBefore(oneHourFromNow)) {
              console.log(`Skipping marking as unavailable (ongoing): ${slot}`);
            } else {
              unavailableTimeSlots.add(slot);
              console.log(`Marking as unavailable (next hour): ${slot}`);
            }
          }
        });
      }

      // Log unavailable time slots after checking for past slots
      console.log('Final Unavailable Time Slots:', Array.from(unavailableTimeSlots));

      // Assign final available and unavailable slots
      courtResponse.timeSlot.unavailable = Array.from(unavailableTimeSlots);
      courtResponse.timeSlot.available = availableTimeSlots.filter(
        (slot) => !courtResponse.timeSlot.unavailable.includes(slot)
      );

      // Log final available and unavailable slots for the court
      console.log(`Court ID: ${court._id} - Available Slots:`, courtResponse.timeSlot.available);
      console.log(`Court ID: ${court._id} - Unavailable Slots:`, courtResponse.timeSlot.unavailable);

      // Push to response
      response.courts.push(courtResponse);
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error checking court availability:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal Server Error'
    });
  }
};

exports.handleCourtReservation = async (req, res, next, io) => {
  const { token, id } = req.query;
  try {
    const court = await Court.findById(id);
    if (!court) {
      // use createError for court not found
      return next(createError(404, 'Court not found'));
    }

    if (token) {
      const courtOwnerEmail = court.paypal_email;
      const reservation = await Reservation.findOne({ court: id, user: req.user.id }).sort({ createdAt: -1 });

      if (!reservation) {
        // use createError for reservation not found
        return next(createError(404, 'Reservation not found'));
      }

      const totalAmount = reservation.totalAmount;

      try {
        const paymentDetails = await getPayPalPaymentDetails(token);
        const paymentStatus = paymentDetails.status;

        if (paymentStatus === 'PAYER_ACTION_REQUIRED') {
          // Log cancellation and delete reservation
          log(`Payment canceled for reservation ID: ${reservation._id}. Removing reservation.`);
          await Reservation.findByIdAndDelete(reservation._id);
          io.emit('reservationCanceled', {
            reservationId: reservation._id,
            courtId: id,
            date: moment().tz('Asia/Manila').format('YYYY-MM-DD')
          });
        } else if (paymentStatus === 'COMPLETED' || paymentStatus === 'APPROVED') {
          const paymentCapture = await capturePayPalPayment(token);
          log('Payment captured:', paymentCapture);

          await createPayPalPayout(courtOwnerEmail, totalAmount);
          log('Payout to court owner initiated');

          // update reservation with 'paid' payment status and 'confirmed' status
          await Reservation.findByIdAndUpdate(reservation._id, {
            paymentStatus: 'paid',
            status: 'confirmed',
            transactionId: paymentCapture.id,
            payerEmail: paymentDetails.payer.email_address,
            payerId: paymentDetails.payer.payer_id
          });

          const reservationUrl = `${config.get('frontendUrl')}/user/announcements?tab=schedule-reservation`;

          createNotification(req.user.id, 'Reservation Confirmed', 'Your reservation has been confirmed.', 'success');

          await sendReservationNotification(
            req.user.username,
            court.business_name,
            reservation.date,
            reservationUrl,
            req.user.email
          );
        }
      } catch (paymentError) {
        error('Error processing payment:', paymentError);
        return next(createError(500, 'There was an issue processing the payment.'));
      }
    }

    const filePath = path.resolve(__dirname, '../../build/usercourtreservation.html');
    serveFile(filePath, res, next);
  } catch (err) {
    error('Error handling reservation:', err);
    return next(createError(500, 'Internal Server Error'));
  }
};

exports.getReservations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { dateFilter, statusFilter, sortOrder } = req.query;

    const query = { user: userId };

    moment.updateLocale('en', {
      week: {
        dow: 1 // Start the week on a different day
      }
    });

    const now = moment.tz('Asia/Manila');

    // Date Filter Logic
    if (dateFilter) {
      const today = moment.tz('Asia/Manila').startOf('day');
      let startDate;
      let endDate;

      switch (dateFilter) {
        case 'Today':
          startDate = today;
          endDate = today.clone().endOf('day');
          break;
        case 'This Week':
          startDate = today.clone().startOf('week');
          endDate = today.clone().endOf('week');
          break;
        case 'This Month':
          startDate = today.clone().startOf('month');
          endDate = today.clone().endOf('month');
          break;
        default:
          return res.status(400).json({ status: 'error', message: 'Invalid date filter.' });
      }
      query.date = { $gte: startDate.toDate(), $lte: endDate.toDate() };
    }

    // Status Filter Logic
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'ongoing'];
    if (statusFilter && !validStatuses.includes(statusFilter.toLowerCase())) {
      return res.status(400).json({ status: 'error', message: 'Invalid status filter.' });
    }

    // If the statusFilter is "ongoing", we don't need to set it in the query,
    // as we will handle this in the mapping process
    if (statusFilter && statusFilter.toLowerCase() !== 'ongoing') {
      query.status = statusFilter.toLowerCase();
    }

    // Fetch reservations from the database
    const reservations = await Reservation.find(query)
      .populate('court', 'business_name location.coordinates')
      .sort({ date: sortOrder === 'descending' ? -1 : 1 });

    // If no reservations found
    if (reservations.length === 0) {
      return res.status(404).json({ status: 'success', message: 'No reservations found.' });
    }

    // Prepare the response structure
    const reservationData = await Promise.all(
      reservations.map(async (reservation) => {
        const reservationDate = moment.tz(reservation.date, 'Asia/Manila');

        // Convert stored 24-hour format times to 12-hour format
        const timeFrom24 = convertTo24Hour(reservation.timeSlot.from);
        const timeTo24 = convertTo24Hour(reservation.timeSlot.to);

        // Set reservationStart and reservationEnd based on 24-hour times
        const reservationStart = reservationDate.clone().set({
          hour: parseInt(timeFrom24.split(':')[0], 10),
          minute: parseInt(timeFrom24.split(':')[1], 10)
        });

        const reservationEnd = reservationDate.clone().set({
          hour: parseInt(timeTo24.split(':')[0], 10),
          minute: parseInt(timeTo24.split(':')[1], 10)
        });

        // Determine if the reservation is ongoing
        const isOngoing = now.isBetween(reservationStart, reservationEnd, null, '[]');

        // Get the address from coordinates
        const address = await getAddressFromCoordinates(reservation.court.location.coordinates);

        return {
          reservationId: reservation._id,
          courtId: reservation.court._id,
          businessName: reservation.court.business_name,
          date: reservationDate.format('YYYY-MM-DD'),
          timeSlot: {
            from: moment.tz(reservation.timeSlot.from, 'h:mm A', 'Asia/Manila').format('h:mm A'),
            to: moment.tz(reservation.timeSlot.to, 'h:mm A', 'Asia/Manila').format('h:mm A')
          },
          status: isOngoing ? 'ongoing' : reservation.status,
          paymentStatus: reservation.paymentStatus,
          location: address
        };
      })
    );

    // Filter for ongoing reservations if statusFilter is set to "ongoing"
    const filteredReservations =
      statusFilter && statusFilter.toLowerCase() === 'ongoing'
        ? reservationData.filter((reservation) => reservation.status === 'ongoing')
        : reservationData;

    return res.status(200).json({
      status: 'success',
      reservations: filteredReservations
    });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal Server Error'
    });
  }
};

exports.cancelReservation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reservationId } = req.body;

    if (!reservationId) {
      return res.status(400).json({ status: 'error', message: 'Reservation ID is required.' });
    }

    // find the reservation by ID and ensure it belongs to the authenticated user
    const reservation = await Reservation.findOne({
      _id: reservationId,
      user: userId
    });

    console.log('Fetched reservation:', reservation);

    // if the reservation does not exist, respond with an error
    if (!reservation) {
      return res.status(404).json({
        status: 'error',
        message: 'Reservation not found or does not belong to the user.'
      });
    }

    // update the status of the reservation to 'cancelled' using findByIdAndUpdate
    const updatedReservation = await Reservation.findByIdAndUpdate(
      reservationId,
      { status: 'cancelled' },
      { new: true }
    );

    // log the updated reservation for debugging
    console.log('Updated reservation:', updatedReservation);

    // if the update fails, respond with an error
    if (!updatedReservation) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to update reservation status.'
      });
    }

    // respond with success message
    return res.status(200).json({ status: 'success', message: 'Reservation cancelled successfully.' });
  } catch (error) {
    // log the error for debugging
    console.error('Error cancelling reservation:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal Server Error'
    });
  }
};

exports.getAdminReservations = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { date, username, dateOnly } = req.query;

    const query = {};

    // fetch the admin user to check their registered courts
    const adminUser = await User.findById(adminId).populate('court');
    if (!adminUser) {
      return res.status(404).json({ status: 'error', message: 'Admin user not found.' });
    }

    // check if the admin has any registered courts
    if (!adminUser.court) {
      return res.status(404).json({ status: 'error', message: 'No courts registered for this admin.' });
    }

    // include court ID in the query
    query.court = adminUser.court._id;

    // if dateOnly is provided, fetch unique reservation dates
    if (dateOnly) {
      const reservations = await Reservation.find({ court: query.court }).select('date').sort({ date: 1 });

      const uniqueDates = [
        ...new Set(reservations.map((reservation) => moment.tz(reservation.date, 'Asia/Manila').format('YYYY-MM-DD')))
      ];

      return res.status(200).json({ status: 'success', dates: uniqueDates });
    }

    // check if a date is provided
    if (date) {
      // validate date format (YYYY-MM-DD)
      const isValidDate = moment(date, 'YYYY-MM-DD', true).isValid();
      if (!isValidDate) {
        return res.status(400).json({ status: 'error', message: 'Invalid date format. Use YYYY-MM-DD.' });
      }

      // set query date to find reservations for the specified date
      query.date = moment.tz(date, 'Asia/Manila').startOf('day').toDate();
    }

    // add username filter if provided
    if (username) {
      const user = await User.findOne({ username: new RegExp(username, 'i') });
      if (user) {
        query.user = user._id;
      } else {
        return res.status(404).json({ status: 'error', message: 'User not found.' });
      }
    }

    // fetch all reservations based on the constructed query
    const reservations = await Reservation.find(query)
      .populate('court')
      .populate('user', 'first_name last_name')
      .sort({ date: 1 });

    // if no reservations found
    if (reservations.length === 0) {
      return res.status(404).json({ status: 'error', message: 'No reservations found.' });
    }

    const reservationDates = {};

    reservations.forEach((reservation) => {
      const reservationDate = moment.tz(reservation.date, 'Asia/Manila').format('YYYY-MM-DD');

      if (!reservationDates[reservationDate]) {
        reservationDates[reservationDate] = [];
      }

      reservationDates[reservationDate].push({
        reservationId: reservation._id,
        courtId: reservation.court._id,
        selectedCourts: reservation.selectedCourt,
        billStatus: reservation.billStatus,
        totalCourts: reservation.court.totalCourts,
        operatingHours: reservation.court.operating_hours,
        user: {
          userId: reservation.user._id,
          firstName: reservation.user.first_name,
          lastName: reservation.user.last_name
        },
        timeSlot: {
          from: moment.tz(reservation.timeSlot.from, 'h:mm A', 'Asia/Manila').format('h:mm A'),
          to: moment.tz(reservation.timeSlot.to, 'h:mm A', 'Asia/Manila').format('h:mm A')
        },
        status: reservation.status,
        paymentStatus: reservation.paymentStatus,
        userPayment: {
          payerEmail: reservation.payerEmail,
          paymentMethod: reservation.paymentMethod,
          transactionId: reservation.transactionId,
          reservationFee: reservation.court.hourly_rate,
          totalAmount: reservation.totalAmount,
          datePaid: reservation.createdAt ? moment(reservation.createdAt).tz('Asia/Manila').format('YYYY-MM-DD') : null
        }
      });
    });

    return res.status(200).json({ status: 'success', reservationDates });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.postAdminTournament = async (req, res, io) => {
  try {
    const user = req.user;
    const adminId = user.id;

    if (!user.isAdmin) {
      return res.status(403).json({ status: 'error', message: 'Access denied. Admins only.' });
    }

    // extracting fields from request body
    const { heading, details, startDate, endDate, reservationFee, tournamentFee } = req.body;

    // extract tournamentCategories from req.body dynamically
    const tournamentCategories = [];
    const categoryKeys = Object.keys(req.body).filter((key) => key.startsWith('tournamentCategories['));

    for (let key of categoryKeys) {
      const index = key.match(/\d+/)[0]; // extract the index from the key
      const property = key.replace(`tournamentCategories[${index}][`, '').replace(']', '');

      if (!tournamentCategories[index]) {
        tournamentCategories[index] = {}; // initialize the object if it doesn't exist
      }

      tournamentCategories[index][property] = req.body[key];
    }

    // validate required fields
    if (!heading || !details || !startDate || !endDate || !tournamentCategories) {
      return res.status(400).json({
        status: 'error',
        message: 'Heading, details, start date, end date, participant limit, and tournament categories are required.'
      });
    }

    const courtId = user.court;

    // handle image uploads
    const allowedImages = ['image/jpeg', 'image/png', 'image/gif'];
    let imagesUrls = [];

    if (req.files && req.files.images) {
      const images = req.files.images;

      if (Array.isArray(images)) {
        // handle multiple file uploads
        imagesUrls = await handleMultipleFileUploads(images, adminId, 'tournamentImage', allowedImages);
      } else {
        // handle single file upload
        imagesUrls.push(await handleFileUpload(images, adminId, 'tournamentImage', allowedImages));
      }
    }

    // Create category objects and push their ObjectIds to tournamentCategories
    const categoryIds = [];
    for (const category of tournamentCategories) {
      const existingCategory = await Category.findOne({ name: category.name });
      if (existingCategory) {
        // Check if the participant limit is within the existing category limit
        if (category.participantLimit <= existingCategory.participantLimit) {
          categoryIds.push(existingCategory._id); // Use existing category
        } else {
          return res.status(400).json({
            status: 'error',
            message: `Participant limit for ${category.name} exceeds allowed limit.`
          });
        }
      } else {
        const newCategory = new Category(category);
        await newCategory.save();
        categoryIds.push(newCategory._id);
      }
    }

    // create and save the new tournament
    const tournament = new Tournament({
      heading,
      details,
      startDate,
      endDate,
      reservationFee,
      tournamentFee,
      tournamentCategories: categoryIds,
      participants: [], // initialize as empty array, we will populate it as needed
      images: imagesUrls,
      court: courtId,
      postedBy: adminId
    });

    await tournament.save();

    // emit event for the new tournament
    io.emit('newTournament', {
      status: 'success',
      data: tournament
    });

    return res.status(201).json({ status: 'success', data: tournament });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};
exports.getAllEventParticipants = async (req, res) => {
  try {
    const user = req.user;

    // check if the user is an admin
    if (!user.isAdmin) {
      return res.status(403).json({ status: 'error', message: 'Access denied. Admins only.' });
    }

    // retrieve all events and their participants
    const events = await Event.find().populate('participants');

    // create an array to hold participants for all events
    const allParticipants = events.map((event) => ({
      eventId: event._id,
      eventTitle: event.heading,
      eventFee: event.eventFee,
      reservationFee: event.reservationFee,
      participants: event.participants,
      createdAt: event.createdAt
    }));

    return res.status(200).json({ status: 'success', data: allParticipants });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId).populate('participants');

    if (!event) {
      return res.status(404).json({ status: 'error', message: 'Event not found' });
    }

    const eventDetails = {
      eventId: event._id,
      eventTitle: event.heading,
      eventFee: event.eventFee,
      reservationFee: event.reservationFee,
      participants: event.participants,
      createdAt: event.createdAt
    };

    return res.status(200).json({ status: 'success', data: eventDetails });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.postAdminEvent = async (req, res, io) => {
  try {
    const user = req.user;
    const adminId = user.id;

    if (!user.isAdmin) {
      return res.status(403).json({ status: 'error', message: 'Access denied. Admins only.' });
    }

    const { heading, details, startDate, endDate, reservationFee, eventFee, participantLimit } = req.body;

    // validate required fields
    if (!heading || !details || !startDate || !endDate || !participantLimit) {
      return res.status(400).json({
        status: 'error',
        message: 'Heading, details, start date, end date, and participant limit are required.'
      });
    }

    const courtId = user.court;

    const allowedImages = ['image/jpeg', 'image/png', 'image/gif'];

    let imagesUrls = [];
    if (req.files && req.files.images) {
      const images = req.files.images;

      if (Array.isArray(images)) {
        // handle multiple file uploads
        imagesUrls = await handleMultipleFileUploads(images, adminId, 'eventImage', allowedImages);
      } else {
        // handle single file upload
        imagesUrls.push(await handleFileUpload(images, adminId, 'eventImage', allowedImages));
      }
    }

    const parsedStartDate = moment.tz(startDate, 'Asia/Manila');
    const parsedEndDate = moment.tz(endDate, 'Asia/Manila');

    // create and save the new event
    const event = new Event({
      heading,
      details,
      startDate: parsedStartDate.toDate(),
      endDate: parsedEndDate.toDate(),
      reservationFee,
      eventFee,
      participantLimit,
      participants: [], // initialize as empty array we will populate it as needed
      images: imagesUrls,
      court: courtId,
      postedBy: adminId
    });

    await event.save();

    io.emit('newEvent', {
      status: 'success',
      data: event
    });

    return res.status(201).json({ status: 'success', data: event });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.postAdminAnnouncement = async (req, res, io) => {
  try {
    const user = req.user;
    const adminId = user.id;

    if (!user.isAdmin) {
      return res.status(403).json({ status: 'error', message: 'Access denied. Admins only.' });
    }

    const { heading, details } = req.body;
    if (!heading || !details) {
      return res.status(400).json({ status: 'error', message: 'Heading and details are required.' });
    }

    const courtId = user.court;

    const allowedImages = ['image/jpeg', 'image/png', 'image/gif'];

    let imagesUrls = [];
    if (req.files && req.files.images) {
      const images = req.files.images;

      if (Array.isArray(images)) {
        // handle multiple file uploads
        imagesUrls = await handleMultipleFileUploads(images, adminId, 'announcementImage', allowedImages);
      } else {
        // handle single file upload
        imagesUrls.push(await handleFileUpload(images, adminId, 'announcementImage', allowedImages));
      }
    }

    // create and save the new announcement
    const announcement = new Announcement({
      heading,
      details,
      images: imagesUrls,
      court: courtId,
      postedBy: adminId
    });

    await announcement.save();

    io.emit('newAnnouncement', {
      status: 'success',
      data: announcement
    });

    return res.status(201).json({ status: 'success', data: announcement });
  } catch (err) {
    error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.getAllPosts = async (req, res) => {
  try {
    const { type, dateFilter, sort } = req.query;

    // base query
    const query = {};

    // filter by type if provided
    if (type === 'announcement') {
      query.__t = { $ne: 'Event' }; // only announcements
    } else if (type === 'event') {
      query.__t = 'Event'; // only events
    } else if (type === 'tournament') {
      query.__t = 'Tournament'; // only tournaments
    }

    // date Filter Logic
    if (dateFilter) {
      const today = moment.tz('Asia/Manila').startOf('day');
      let startDate;
      let endDate;

      switch (dateFilter.toLowerCase()) {
        case 'today':
          startDate = today;
          endDate = today.clone().endOf('day');
          break;
        case 'this week':
          startDate = today.clone().startOf('week');
          endDate = today.clone().endOf('week');
          break;
        case 'this month':
          startDate = today.clone().startOf('month');
          endDate = today.clone().endOf('month');
          break;
        default:
          return res.status(400).json({ status: 'error', message: 'Invalid date filter.' });
      }
      query.createdAt = { $gte: startDate.toDate(), $lte: endDate.toDate() };
    }

    let sortCriteria = { createdAt: -1 }; // default sorting by createdAt in descending order
    if (sort) {
      const [field, order] = sort.split(':');
      sortCriteria = {
        [field]: order === 'asc' ? 1 : -1 // ascending if 'asc' is specified, otherwise descending
      };
    }

    // fetch posts based on the constructed query
    const posts = await Announcement.find(query).sort(sortCriteria);

    return res.status(200).json({ status: 'success', data: posts });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.getAdminPosts = async (req, res) => {
  try {
    const user = req.user;

    // get the court ID from the user object
    const courtId = user.court;

    // get the type of items to fetch from query parameters (can be 'all', 'announcement', or 'event')
    const { type } = req.query;

    // build the base query object
    const query = {
      court: courtId,
      postedBy: user.id
    };

    // modify query based on the type
    if (type === 'announcement') {
      // exclude events by filtering out documents with the __t field
      query.__t = { $ne: 'Event' }; // get all documents that are not Events
    } else if (type === 'event') {
      query.__t = 'Event'; // filter for events only
      // if type is 'all', do not modify the query (all items for the court by the user will be fetched)
    } else if (type === 'tournament') {
      query.__t = 'Tournament'; // filter for tournaments only
    } else if (type === 'membership') {
      query.__t = 'Membership'; // filter for membership only
    }

    log(query);

    const posts = await Announcement.find(query).sort({ createdAt: -1 });

    return res.status(200).json({ status: 'success', data: posts });
  } catch (err) {
    error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.removeAnnouncement = async (req, res, io) => {
  try {
    const user = req.user;

    log(user);

    // allow only admins to delete announcements
    if (!user.isAdmin) {
      return res.status(403).json({ status: 'error', message: 'Access denied. Admins only.' });
    }

    const { announcementId } = req.params;

    // find the announcement and check if it belongs to the admin's court
    const announcement = await Announcement.findById(announcementId);

    if (!announcement) {
      return res.status(404).json({ status: 'error', message: 'Announcement not found.' });
    }

    // check if the admin is from the same court as the announcement
    if (!announcement.court.equals(user.court) && !announcement.postedBy.equals(user.id)) {
      return res.status(403).json({ status: 'error', message: 'You can only delete your own court’s announcements.' });
    }

    // proceed with deletion if checks pass
    await Announcement.findByIdAndDelete(announcementId);

    io.emit('deleteAnnouncement', {
      status: 'success'
    });

    return res.status(200).json({ status: 'success', message: 'Announcement deleted successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.removeEvent = async (req, res, io) => {
  try {
    const user = req.user;

    // allow only admins to delete events
    if (!user.isAdmin) {
      return res.status(403).json({ status: 'error', message: 'Access denied. Admins only.' });
    }

    const { eventId } = req.params;

    // find the event and check if it belongs to the admin's court
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ status: 'error', message: 'Event not found.' });
    }

    // check if the admin is from the same court as the event
    if (!event.court.equals(user.court) && !event.postedBy.equals(user.id)) {
      return res.status(403).json({ status: 'error', message: 'You can only delete your own court’s events.' });
    }

    // proceed with deletion if checks pass
    await Event.findByIdAndDelete(eventId);

    io.emit('deleteEvent', {
      status: 'success'
    });

    return res.status(200).json({ status: 'success', message: 'Event deleted successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.joinMembership = async (req, res, io) => {
  try {
    const userId = req.user.id;
    const { membershipId } = req.body;

    if (!membershipId) {
      return res.status(400).json({ status: 'error', message: 'Membership ID is required.' });
    }
    const membership = await Membership.findById(membershipId);

    if (!membership) {
      return res.status(404).json({ status: 'error', message: 'Membership not found.' });
    }

    // check if user is already a participant
    if (membership.participants.includes(userId)) {
      return res.status(400).json({ status: 'error', message: 'User is already a participant.' });
    }

    // calculate total payment required
    const totalAmount = membership.membershipFee;

    const returnUrl = `${config.get('frontendUrl')}/user/confirm-membership-payment?membershipId=${membershipId}`;
    const cancelUrl = `${config.get('frontendUrl')}/user/announcements?tab=my-feed`;

    if (totalAmount > 0) {
      // if there is a fee, create a PayPal payment
      const payment = await createPayPalPayment(totalAmount, null, null, null, returnUrl, cancelUrl);
      const approvalUrl = payment.links.find((link) => link.rel === 'payer-action').href;

      // respond with the approval URL to redirect the user for payment
      return res.status(200).json({
        status: 'payment_required',
        message: 'Payment is required to join the event.',
        approvalUrl
      });
    }

    // add user to participants array
    membership.participants.push(userId);
    await event.save();

    // emit an event to notify all clients about the new participant
    io.emit('participantJoined', {
      status: 'success',
      eventId: membership._id,
      participantId: userId,
      participantsCount: membership.participants.length
    });

    return res
      .status(200)
      .json({ status: 'success', message: 'Successfully joined the membership program.', data: membership });
  } catch (err) {
    error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.joinEvent = async (req, res, io) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({ status: 'error', message: 'Event ID is required.' });
    }

    // find the event by ID
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ status: 'error', message: 'Event not found.' });
    }

    // check if the event is ongoing
    const currentTime = moment.tz('Asia/Manila');
    log('current time: ', currentTime);
    if (currentTime.isAfter(moment(event.endDate))) {
      return res.status(400).json({ status: 'error', message: 'Cannot join the event as it has already ended.' });
    }

    // check if participant limit is reached
    if (event.participants.length >= event.participantLimit) {
      return res.status(400).json({ status: 'error', message: 'Participant limit reached.' });
    }

    // check if user is already a participant
    if (event.participants.includes(userId)) {
      return res.status(400).json({ status: 'error', message: 'User is already a participant.' });
    }

    // calculate total payment required
    // const totalAmount = (event.reservationFee || 0) + (event.eventFee || 0);
    const totalAmount = event.eventFee || 0;

    const returnUrl = `${config.get('frontendUrl')}/user/confirm-event-payment?eventId=${eventId}`;
    const cancelUrl = `${config.get('frontendUrl')}/user/announcements?tab=my-feed`;

    if (totalAmount > 0) {
      // if there is a fee, create a PayPal payment
      const payment = await createPayPalPayment(totalAmount, null, null, null, returnUrl, cancelUrl);
      const approvalUrl = payment.links.find((link) => link.rel === 'payer-action').href;

      // respond with the approval URL to redirect the user for payment
      return res.status(200).json({
        status: 'payment_required',
        message: 'Payment is required to join the event.',
        approvalUrl
      });
    }

    // add user to participants array
    event.participants.push(userId);
    await event.save();

    // emit an event to notify all clients about the new participant
    io.emit('participantJoined', {
      status: 'success',
      eventId: event._id,
      participantId: userId,
      participantsCount: event.participants.length
    });

    return res.status(200).json({ status: 'success', message: 'Successfully joined the event.', data: event });
  } catch (err) {
    error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.getOngoingEvents = async (req, res) => {
  try {
    const currentTime = moment.tz('Asia/Manila');
    const ongoingEvents = await Event.find({
      endDate: { $gte: currentTime.toDate() }
    });

    return res.status(200).json({ status: 'success', data: ongoingEvents });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.checkIfUserJoined = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ status: 'error', message: 'Event not found.' });
    }

    const isJoined = event.participants.includes(userId);
    return res.status(200).json({ status: 'success', isJoined });
  } catch (err) {
    error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.confirmEventPayment = async (req, res, next) => {
  const { token, eventId } = req.query;

  try {
    const event = await Event.findById(eventId).populate('court');
    if (!event) {
      return next(createError(404, 'Event not found'));
    }

    // get the court owner's email from the populated court data
    const courtOwnerEmail = event.court.paypal_email;

    // Process the payment if the token is provided
    if (token) {
      const paymentCapture = await capturePayPalPayment(token);
      if (paymentCapture.status !== 'COMPLETED') {
        return next(createError(400, 'Payment was not successful'));
      }
      const paymentDetails = paymentCapture.purchase_units[0].payments;
      const transaction = paymentDetails.captures[0];
      const totalAmount = transaction.amount.value;
      log(totalAmount);

      // Initiate payout to the event owner
      await createPayPalPayout(courtOwnerEmail, totalAmount);
      log('Payout to event owner initiated');

      // Add user to event participants
      const userId = req.user.id;
      event.participants.push(userId);
      await event.save();

      // Optional: Notify clients about the new participant
      // io.emit('participantJoined', {
      //   status: 'success',
      //   eventId: event._id,
      //   participantId: userId,
      //   participantsCount: event.participants.length
      // });

      await sendJoinEventNotification(req.user.username, event.heading, event.startDate, req.user.email);

      // Redirect to the specified URL
      return res.redirect(`/user/announcements?tab=my-feed`);
    }

    // If no token, return an error indicating a token is required
    return next(createError(400, 'Payment token is required'));
  } catch (err) {
    error('Error confirming event payment:', err);
    return next(createError(500, 'Internal Server Error'));
  }
};

// controller function to handle membership posting by admin or court owner
exports.postAdminMembership = async (req, res) => {
  try {
    const user = req.user;
    const adminId = user.id;

    // check if the user is an admin or court owner
    if (!user.isAdmin && !user.isCourtOwner) {
      return res.status(403).json({ status: 'error', message: 'Access denied. Admins or court owners only.' });
    }

    const { heading, details, reservationFee, membershipFee } = req.body;

    // validate required fields
    if (!heading || !details) {
      return res.status(400).json({
        status: 'error',
        message: 'Heading and details are required.'
      });
    }

    const courtId = user.court;

    // create new membership document
    const newMembership = new Membership({
      heading,
      details,
      images: req.body.images || [],
      court: courtId,
      postedBy: adminId,
      reservationFee,
      membershipFee
    });

    await newMembership.save();

    res.status(201).json({
      status: 'success',
      data: {
        membership: newMembership
      }
    });
  } catch (err) {
    error('Error posting membership:', err);
    res.status(500).json({ status: 'error', message: 'Server error. Please try again later.' });
  }
};

exports.checkPaymentStatus = async (req, res, next) => {
  const { reservationId } = req.query;

  log(reservationId);

  try {
    // find the reservation by ID
    const reservation = await Reservation.findById(reservationId);

    if (!reservation) {
      return res.status(404).json({ status: 'error', message: 'Reservation not found' });
    }

    if (reservation.paymentStatus === 'paid') {
      return res.json({
        success: true,
        message: 'Payment was successful and reservation is confirmed.',
        reservationStatus: reservation.status,
        paymentStatus: reservation.paymentStatus
      });
    } else {
      // payment not yet completed
      return res.json({
        success: false,
        message: 'Payment is still pending.',
        reservationStatus: reservation.status,
        paymentStatus: reservation.paymentStatus
      });
    }
  } catch (err) {
    error('Error checking payment status:', err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

// function to create a new post
exports.createPost = async (req, res, io) => {
  try {
    const userId = req.user.id;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Content is required to create a post.'
      });
    }

    const sanitizedContent = sanitizeHtml(content);
    // extract hashtags from the content using a regular expression
    // const hashtags = (content.match(/#(\w+)/g) || []).map((tag) => tag.toLowerCase());

    const hashtags = content.match(/#\w+/g) || [];

    // normalize hashtags (convert to lowercase, remove #)
    const normalizedHashtags = hashtags.map((tag) => tag.toLowerCase().substring(1));

    // create the new post
    const newPost = new Post({
      userId, // set the userId to the currently authenticated user
      content: sanitizedContent,
      hashtags: normalizedHashtags
    });

    // save the post to the database
    await newPost.save();

    // update the Hashtag collection
    for (let hashtag of normalizedHashtags) {
      let hashtagEntry = await Hashtag.findOne({ hashtag });

      if (hashtagEntry) {
        // if hashtag already exists, increment count
        hashtagEntry.count += 1;
        hashtagEntry.lastUsed = new Date();
        await hashtagEntry.save();
      } else {
        // if hashtag doesn't exist, create a new entry
        await Hashtag.create({
          hashtag,
          count: 1
        });
      }
    }

    io.emit('newPost', {
      status: 'success',
      message: 'A new post has been created!',
      post: newPost
    });

    // return the created post along with a success message
    return res.status(201).json({
      status: 'success',
      message: 'Post created successfully.',
      data: {
        post: newPost
      }
    });
  } catch (err) {
    console.error('Error creating post:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }
};

exports.retrieveAllPosts = async (req, res) => {
  try {
    const { dateFilter, sort, hashtag, page = 1, limit = 10 } = req.query;

    // base query object for finding posts
    const query = {};

    // date filter (Today, This Week, This Month)
    if (dateFilter) {
      const today = moment.tz('Asia/Manila').startOf('day');
      let startDate;
      let endDate;

      switch (dateFilter.toLowerCase()) {
        case 'today':
          startDate = today;
          endDate = today.clone().endOf('day');
          break;
        case 'this week':
          startDate = today.clone().startOf('week');
          endDate = today.clone().endOf('week');
          break;
        case 'this month':
          startDate = today.clone().startOf('month');
          endDate = today.clone().endOf('month');
          break;
        default:
          return res.status(400).json({ status: 'error', message: 'Invalid date filter.' });
      }
      query.createdAt = { $gte: startDate.toDate(), $lte: endDate.toDate() };
    }

    // apply Hashtag Filtering (if provided)
    if (hashtag) {
      // Split the hashtags by comma and remove extra spaces
      const hashtagsArray = hashtag.split(',').map((h) => h.trim().replace(/^#/, ''));

      // Build the regex for matching posts containing any of the hashtags
      const hashtagRegexArray = hashtagsArray.map((h) => new RegExp(`#${h}`, 'i'));

      // Use the $or operator to match any of the hashtags
      query.content = { $in: hashtagRegexArray };
    }

    // sorting Logic
    let sortCriteria = { createdAt: -1 }; // Default: sort by createdAt in descending order
    if (sort) {
      const [field, order] = sort.split(':');
      sortCriteria = {
        [field]: order === 'asc' ? 1 : -1 // ascending if 'asc', descending if 'desc'
      };
    }

    // pagination Logic
    const skip = (page - 1) * limit;
    const limitNumber = Number(limit);

    // fetch posts based on the constructed query with pagination and sorting
    const posts = await Post.find(query)
      .populate('userId', 'username email role profile_photo')
      .sort(sortCriteria)
      .skip(skip) // skip the calculated number of posts
      .limit(limitNumber); // limit the number of posts returned

    // Get the total count of posts for pagination metadata
    const totalPosts = await Post.countDocuments(query);

    // If no posts are found, return a 404 error
    if (!posts.length) {
      return res.status(404).json({ status: 'error', message: 'No posts found.' });
    }

    // Return posts along with pagination metadata
    return res.status(200).json({
      status: 'success',
      data: {
        posts,
        pagination: {
          page: Number(page),
          limit: limitNumber,
          totalPosts,
          totalPages: Math.ceil(totalPosts / limitNumber)
        }
      }
    });
  } catch (err) {
    console.error('Error fetching posts:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }
};

exports.removePost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.id;

    // find the post by its ID
    const post = await Post.findById(postId);

    // if the post doesn't exist, return an error
    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: 'Post not found.'
      });
    }

    // check if the current user is the one who created the post
    if (post.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only delete your own posts.'
      });
    }

    // optionally: If you want to also clean up associated comments and likes
    // removing the post (with optional associated cleanup)
    await Post.deleteOne({ _id: postId });

    return res.status(200).json({
      status: 'success',
      message: 'Post deleted successfully.'
    });
  } catch (err) {
    error('Error deleting post:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }
};

exports.addLike = async (req, res, io) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.id;

    // find the post by ID
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    // check if the user has already liked the post
    if (post.likedBy.includes(userId)) {
      return res.status(400).json({ status: 'error', message: 'You have already liked this post' });
    }

    // add the user to the likedBy array
    post.likedBy.push(userId);

    // increment the likesCount
    post.likesCount = post.likedBy.length;

    // save the post
    await post.save();

    io.emit('newLike', {
      status: 'success'
    });

    return res.status(201).json({
      status: 'success',
      message: 'Post liked successfully',
      data: { likesCount: post.likesCount, likedBy: post.likedBy }
    });
  } catch (err) {
    console.error('Error adding like:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }
};

exports.removeLike = async (req, res, io) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.id;

    // find the post by ID
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    // check if the user has already liked the post
    const likeIndex = post.likedBy.indexOf(userId);

    if (likeIndex === -1) {
      return res.status(400).json({ status: 'error', message: 'You have not liked this post' });
    }

    // remove the user from the likedBy array
    post.likedBy.splice(likeIndex, 1);

    // decrement the likesCount
    post.likesCount = post.likedBy.length;

    // save the post
    await post.save();

    io.emit('removeLike', {
      status: 'success'
    });

    return res.status(200).json({
      status: 'success',
      message: 'Like removed successfully',
      data: { likesCount: post.likesCount, likedBy: post.likedBy }
    });
  } catch (err) {
    console.error('Error removing like:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }
};

exports.addComment = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.id;
    const { content } = req.body;

    // check if the content is provided
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Comment content cannot be empty'
      });
    }

    // find the post by ID
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    // create the new comment
    const newComment = {
      userId,
      content,
      date: new Date()
    };

    // add the comment to the post
    post.comments.push(newComment);

    // increment the commentCount
    post.commentCount = post.comments.length;

    // save the post with updated comment
    await post.save();

    return res.status(201).json({
      status: 'success',
      message: 'Comment added successfully',
      data: { comment: newComment, commentCount: post.commentCount }
    });
  } catch (err) {
    console.error('Error adding comment:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }
};

exports.removeComment = async (req, res) => {
  try {
    const postId = req.params.postId;
    const commentId = req.params.commentId;
    const userId = req.user.id;

    // find the post by ID
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    // find the index of the comment to remove
    const commentIndex = post.comments.findIndex((comment) => comment._id.toString() === commentId);

    if (commentIndex === -1) {
      return res.status(404).json({ status: 'error', message: 'Comment not found' });
    }

    // ensure the user removing the comment is the author of the comment
    if (post.comments[commentIndex].userId.toString() !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only remove your own comments'
      });
    }

    // remove the comment
    post.comments.splice(commentIndex, 1);

    // update the commentCount
    post.commentCount = post.comments.length;

    // save the post with updated comments
    await post.save();

    return res.status(200).json({
      status: 'success',
      message: 'Comment removed successfully',
      data: { commentCount: post.commentCount }
    });
  } catch (err) {
    console.error('Error removing comment:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }
};

exports.fetchComments = async (req, res) => {
  try {
    const postId = req.params.postId;

    // find the post by ID
    const post = await Post.findById(postId).populate('comments.userId', 'username');

    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    // return the comments for the post
    return res.status(200).json({
      status: 'success',
      data: {
        comments: post.comments
      }
    });
  } catch (err) {
    console.error('Error fetching comments:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }
};

exports.editPost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.id;
    const { content } = req.body;

    // check if content is provided
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Post content cannot be empty'
      });
    }

    // find the post by ID
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Post not found' });
    }

    // check if the user is the one who created the post
    if (post.userId.toString() !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only edit your own posts'
      });
    }

    // update the post content
    post.content = content;
    post.date = new Date();

    // save the updated post
    await post.save();

    return res.status(200).json({
      status: 'success',
      message: 'Post updated successfully',
      data: { post }
    });
  } catch (err) {
    console.error('Error editing post:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }
};

exports.getPopularHashtags = async (req, res) => {
  try {
    // fetch top 10 most popular hashtags
    const hashtags = await Hashtag.find().sort({ count: -1 }).limit(10).exec();

    if (hashtags.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No popular hashtags found'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: { hashtags }
    });
  } catch (err) {
    console.error('Error fetching popular hashtags:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }
};

exports.getPostsByHashtag = async (req, res) => {
  try {
    const { hashtag } = req.params;

    // find posts containing the hashtag (normalized to lowercase)
    const posts = await Post.find({ hashtags: hashtag.toLowerCase() }).sort({ date: -1 });

    if (posts.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `No posts found with hashtag #${hashtag}`
      });
    }

    return res.status(200).json({
      status: 'success',
      data: { posts }
    });
  } catch (err) {
    console.error('Error fetching posts by hashtag:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Internal Server Error'
    });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, price, stock, category } = req.body;

    // check if the user is authenticated
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    // check for required fields
    if (!name || !price || !stock || !category) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, price, stock, and category  are required.'
      });
    }

    if (!req.files || !req.files.image) {
      return res.status(400).json({
        status: 'error',
        message: 'Product image is required.'
      });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const imageUrl = await handleFileUpload(req.files.image, userId, 'productImage', allowedTypes);

    const product = new Product({
      owner: userId,
      name,
      price,
      stock,
      category,
      image: imageUrl
    });

    await product.save();

    return res.status(201).json({ status: 'success', data: product });
  } catch (err) {
    error('An error occurred while processing the product:', err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const { category, shopName, search } = req.query;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // initialize filter object
    const filter = {};

    // filter by category if provided
    if (category) {
      filter.category = category;
    }

    // search logic: filter by product name if search is provided
    if (search) {
      const regexSearch = new RegExp(search, 'i');
      filter.name = regexSearch;
    }

    let products;

    if (userRole === 'admin') {
      // admin or court owner: can view their own products
      filter.owner = userId;
      products = await Product.find({ owner: userId }).populate('owner', 'username email court');
      log(products);
    } else {
      // ordinary user: can view all products
      products = await Product.find(filter).populate({
        path: 'owner',
        select: 'username email court',
        populate: {
          path: 'court',
          select: 'business_name'
        }
      });

      // if shopName is provided, filter by owner's court's business_name
      if (shopName) {
        const regexShopName = new RegExp(shopName, 'i'); // Case-insensitive search
        products = products.filter((product) => product.owner?.court?.business_name?.match(regexShopName));
      }
    }

    return res.status(200).json({ status: 'success', data: products });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // fetch the product by its ID
    const product = await Product.findById(id).populate('owner', 'username email');

    if (!product) {
      return res.status(404).json({ status: 'error', message: 'Product not found' });
    }

    // if the user is not an admin, ensure they can only access their own product
    if (userRole !== 'admin' && product.owner.toString() !== userId) {
      return res.status(403).json({ status: 'error', message: 'You are not authorized to view this product' });
    }

    return res.status(200).json({ status: 'success', data: product });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.removeProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // check if the product exists
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ status: 'error', message: 'Product not found' });
    }

    // ensure the user is the owner of the product or an admin
    if (product.owner.toString() !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'You are not authorized to delete this product' });
    }

    // delete the product using findByIdAndDelete
    await Product.findByIdAndDelete(id);

    return res.status(200).json({ status: 'success', message: 'Product deleted successfully' });
  } catch (err) {
    error('Error deleting product by ID:', err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, stock, category } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // check if the product exists
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ status: 'error', message: 'Product not found' });
    }

    // ensure the user is the owner of the product or has admin privileges
    if (product.owner.toString() !== userId && userRole !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'You are not authorized to update this product' });
    }

    // validate required fields if they are included in the request body
    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Product name cannot be empty' });
    }
    if (price !== undefined && price <= 0) {
      return res.status(400).json({ status: 'error', message: 'Price must be greater than zero' });
    }
    if (stock !== undefined && stock < 0) {
      return res.status(400).json({ status: 'error', message: 'Stock cannot be negative' });
    }

    // handle image upload if a new image is provided
    let imageUrl = product.image;
    if (req.files && req.files.image) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      imageUrl = await handleFileUpload(req.files.image, userId, 'productsImage', allowedTypes);
    }

    // update product fields
    if (name !== undefined) product.name = name;
    if (price !== undefined) product.price = price;
    if (stock !== undefined) product.stock = stock;
    if (category !== undefined) product.category = category;
    if (imageUrl !== product.image) product.image = imageUrl;

    // save the updated product to the database
    await product.save();

    return res.status(200).json({ status: 'success', data: product });
  } catch (err) {
    console.error('Error updating product:', err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    if (!productId || quantity <= 0) {
      return res.status(400).json({ message: 'Invalid product or quantity' });
    }

    // Fetch product details
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check stock availability
    if (quantity > product.stock) {
      return res.status(400).json({
        status: 'error',
        message: `Requested quantity (${quantity}) exceeds available stock (${product.stock})`
      });
    }

    // Find the user's cart or create a new one
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({ user: userId, products: [] });
    }

    // Check if the product is already in the cart
    const existingProduct = cart.products.find((p) => p.product.toString() === productId);

    if (existingProduct) {
      // Check if the updated quantity exceeds stock
      if (existingProduct.quantity + quantity > product.stock) {
        return res.status(400).json({
          status: 'error',
          message: `Total quantity (${existingProduct.quantity + quantity}) exceeds available stock (${product.stock})`
        });
      }
      existingProduct.quantity += quantity;
    } else {
      cart.products.push({ product: productId, quantity });
    }

    // Save the updated cart
    await cart.save();

    // Populate the cart products after saving
    await cart.populate({
      path: 'products.product',
      populate: {
        path: 'owner',
        select: 'court',
        populate: {
          path: 'court',
          select: 'business_name'
        }
      }
    });

    console.log('cart', cart.products);

    // Add the shopName (business_name) to each cart item
    const updatedCartProducts = cart.products.map((item) => ({
      ...item.toObject(),
      shopName: item.product.owner?.court?.business_name || 'Unknown Shop'
    }));

    // Send the response with the updated cart
    return res.status(200).json({
      status: 'success',
      message: 'Product added to cart',
      cart: updatedCartProducts
    });
  } catch (err) {
    console.error('Error adding to cart:', err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.getCartByUser = async (req, res) => {
  try {
    const userId = req.user.id;

    // find the user's cart and populate product details including shop (business_name from court)
    const cart = await Cart.findOne({ user: userId }).populate({
      path: 'products.product',
      match: { stock: { $gte: 0 } }, // ensure only products in stock are included
      populate: {
        path: 'owner',
        select: 'court', // select only necessary owner fields
        populate: {
          path: 'court',
          select: 'business_name' // get business_name from court
        }
      }
    });

    if (!cart) {
      return res.status(200).json({ status: 'success', cart: [] });
    }

    // map through the products to add shopName (business_name) directly to each item
    const updatedCartProducts = cart.products.map((item) => {
      // create a new object for each item, adding shopName directly
      return {
        ...item.toObject(), // convert mongoose object to plain JS object
        shopName: item.product.owner?.court?.business_name || 'Unknown Shop'
      };
    });

    // send the response with the updated cart and shopName added
    return res.status(200).json({
      status: 'success',
      cart: updatedCartProducts
    });
  } catch (err) {
    console.error('Error fetching cart:', err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.updateCartQuantity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    if (!productId || quantity < 0) {
      return res.status(400).json({ message: 'Invalid product or quantity' });
    }

    // Fetch product details
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check stock availability
    if (quantity > product.stock) {
      return res.status(400).json({
        status: 'error',
        message: `Requested quantity (${quantity}) exceeds available stock (${product.stock})`
      });
    }

    // Find the user's cart
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Find the product in the cart
    const productInCart = cart.products.find((p) => p.product.toString() === productId);

    if (!productInCart) {
      return res.status(404).json({ message: 'Product not found in cart' });
    }

    if (quantity === 0) {
      // Remove product if quantity is set to 0
      cart.products = cart.products.filter((p) => p.product.toString() !== productId);
    } else {
      // Update the quantity
      productInCart.quantity = quantity;
    }

    // Save the updated cart
    await cart.save();

    // Populate products for the response
    await cart.populate('products.product');

    return res.status(200).json({ status: 'success', message: 'Cart updated', cart });
  } catch (err) {
    console.error('Error updating cart quantity:', err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.removeAllCartItems = async (req, res) => {
  try {
    const userId = req.user.id;

    // find and delete the cart
    await Cart.findOneAndDelete({ user: userId });

    return res.status(200).json({ status: 'success', message: 'All cart items removed' });
  } catch (err) {
    console.error('Error removing all cart items:', err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.removeProductFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    // find the user's cart
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // filter out the product by ID
    const updatedProducts = cart.products.filter((p) => p.product.toString() !== productId);

    if (updatedProducts.length === cart.products.length) {
      return res.status(404).json({ message: 'Product not found in cart' });
    }

    cart.products = updatedProducts;

    // Save the updated cart
    await cart.save();

    // Populate products for the response
    await cart.populate('products.product');

    return res.status(200).json({ status: 'success', message: 'Product removed from cart', cart });
  } catch (err) {
    console.error('Error removing product from cart:', err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
};

exports.serveCheckoutPage = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return next(createError(400, 'Your cart is empty.'));
    }

    // serve the checkout page if the cart is not empty
    const filePath = path.resolve(__dirname, '../../build/usercheckout.html');
    serveFile(filePath, res, next);
  } catch (error) {
    console.error(error);
    next(createError(500, 'An error occurred while loading the checkout page.'));
  }
};

exports.createOrder = async (req, res, next) => {
  try {
    const { products, pickupSchedule } = req.body;

    // ensure products array is not empty
    if (!products || products.length === 0) {
      return next(createError(400, 'Cart cannot be empty.'));
    }

    // validate the pickupSchedule to disallow past dates
    const currentDate = moment.tz('Asia/Manila').startOf('day');
    const pickupDate = moment.tz(pickupSchedule, 'Asia/Manila').startOf('day');

    if (pickupDate.isBefore(currentDate)) {
      return res.status(400).json({
        status: 'error',
        message: 'Pickup schedule cannot be in the past.'
      });
    }

    // extract the vendor (court owner) from the first product
    const firstProduct = await Product.findById(products[0].product);
    const courtOwnerId = firstProduct.owner.id;

    // check if all products belong to the same vendor (court)
    for (const item of products) {
      const product = await Product.findById(item.product);
      if (product.owner.id.toString() !== courtOwnerId.toString()) {
        return next(createError(400, 'You can only order products from the same shop.'));
      }
    }

    // calculate total price and include price in products array
    let totalPrice = 0;
    const enrichedProducts = [];
    for (const item of products) {
      const product = await Product.findById(item.product);
      const productTotal = product.price * item.quantity;
      totalPrice += productTotal;

      enrichedProducts.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price
      });
    }

    const reservationFee = totalPrice * 0.1;

    // create the order
    const order = new Order({
      user: req.user.id,
      products: enrichedProducts,
      totalAmount: totalPrice,
      reservationFee,
      reservationDate: pickupSchedule
    });

    // save the order
    await order.save();

    // create PayPal payment
    const returnUrl = `${config.get('frontendUrl')}/user/products/orders/confirm?orderId=${order._id}`;
    const cancelUrl = `${config.get('frontendUrl')}/user/products`;
    const payment = await createPayPalPayment(reservationFee, null, null, null, returnUrl, cancelUrl);

    // get approval URL from PayPal
    const approvalUrl = payment.links.find((link) => link.rel === 'payer-action').href;

    // respond with approval URL to complete payment
    return res.status(201).json({
      message: 'Order created successfully.',
      orderId: order._id,
      approvalUrl
    });
  } catch (err) {
    console.error(err);
    return next(createError(500, 'Error creating the order.'));
  }
};

exports.confirmOrderPayment = async (req, res, next) => {
  const { token, orderId } = req.query;

  try {
    const order = await Order.findById(orderId).populate('products.product');
    if (!order) {
      return next(createError(404, 'Order not found'));
    }
    console.log(order);

    // get the court owner's email
    const courtOwnerId = order.products[0].product.owner;
    console.log(courtOwnerId);

    const grandTotalAmount = order.products.reduce((total, item) => {
      return total + item.product.price * item.quantity;
    }, 0);

    // find the court associated with the owner to get the PayPal email
    const court = await Court.findOne({ user: courtOwnerId });
    if (!court || !court.paypal_email) {
      return next(createError(404, 'Court or PayPal email not found'));
    }
    const courtOwnerEmail = court.paypal_email;

    console.log(courtOwnerEmail);

    // process the payment if the token is provided
    if (token) {
      const paymentCapture = await capturePayPalPayment(token);
      if (paymentCapture.status !== 'COMPLETED') {
        return next(createError(400, 'Payment was not successful'));
      }

      const paymentDetails = paymentCapture.purchase_units[0].payments;
      const transaction = paymentDetails.captures[0];
      const totalAmount = transaction.amount.value;

      log(`Payment of ${totalAmount} captured successfully.`);

      // initiate payout to the court owner
      await createPayPalPayout(courtOwnerEmail, totalAmount);
      log(`Payout to court owner (${courtOwnerEmail}) initiated.`);

      // update order status to 'Confirmed'
      order.status = 'paid';
      await order.save();

      // update stock and sales count for each product
      for (const item of order.products) {
        const product = item.product;

        if (product) {
          product.salesCount += item.quantity; // increment sales count
          product.stock -= item.quantity; // reduce stock
          if (product.stock < 0) {
            return next(createError(400, `Insufficient stock for product: ${product.name}`));
          }

          await product.save();
        }
      }

      // Notify the client
      // io.emit('orderConfirmed', {
      //   status: 'success',
      //   orderId: order._id,
      //   totalAmount,
      // });

      //  send a confirmation email to the user
      // await sendOrderConfirmation(req.user.email, order._id, order.products, totalAmount);
      await sendOrderConfirmation(
        req.user.first_name,
        req.user.last_name,
        court.business_name,
        order.products,
        grandTotalAmount,
        req.user.email
      );

      return res.redirect(`/user/products?orderId=${orderId}`);
    }

    // if no token, return an error indicating a token is required
    return next(createError(400, 'Payment token is required'));
  } catch (err) {
    console.error('Error confirming order payment:', err);
    return next(createError(500, 'Internal Server Error'));
  }
};

exports.getOrderStatus = async (req, res) => {
  const { orderId } = req.query;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // respond with the current order status
    return res.status(200).json({
      success: true,
      status: order.status,
      message: `Order status is ${order.status}`
    });
  } catch (err) {
    console.error('Error getting order status:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

exports.getPaidOrders = async (req, res, next) => {
  try {
    // Find all orders for the authenticated user with the 'paid' status
    const orders = await Order.find({ user: req.user.id, status: 'paid' })
      .populate({
        path: 'products.product',
        populate: {
          path: 'owner',
          select: 'court', // Select the court field of the owner
          populate: {
            path: 'court',
            select: 'business_name' // Get the business_name from the court
          }
        }
      })
      .exec();

    // If no orders are found, return a message indicating so
    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No paid orders found for this user.'
      });
    }

    // Add shopName (business_name) to each product in every order
    const updatedOrders = orders.map((order) => {
      const updatedProducts = order.products.map((item) => ({
        ...item.toObject(), // Convert mongoose object to plain JS object
        shopName: item.product.owner?.court?.business_name || 'Unknown Shop'
      }));
      return {
        ...order.toObject(), // Convert the order to a plain JS object
        products: updatedProducts
      };
    });

    // Send the updated orders with shopName included
    return res.status(200).json({
      success: true,
      orders: updatedOrders
    });
  } catch (err) {
    console.error('Error fetching paid orders:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

exports.getOrdersForOwner = async (req, res, next) => {
  try {
    const ownerId = req.user.id;

    console.log(ownerId);

    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Permission denied. You must be an admin.' });
    }

    // Fetch the products owned by the owner using `owner` field directly
    const ownedProducts = await Product.find({ owner: ownerId }).select('_id');
    const ownedProductIds = ownedProducts.map((product) => product._id);

    console.log('ownedProducts', ownedProducts);
    console.log('ownedProductIds', ownedProductIds);

    if (!ownedProductIds.length) {
      return res.status(404).json({ message: 'No products owned by this user.' });
    }

    // Find orders that include the owner's products
    const orders = await Order.find({ 'products.product': { $in: ownedProductIds } })
      .populate({
        path: 'products.product',
        select: 'name price owner'
      })
      .populate('user', 'email first_name last_name')
      .exec();

    if (!orders.length) {
      return res.status(404).json({ message: 'No orders found for this owner.' });
    }

    res.status(200).json({
      status: true,
      orders
    });
  } catch (error) {
    console.error('Error fetching orders for owner:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

exports.updateBillStatus = async (req, res) => {
  try {
    const reservationId = req.params.id;
    const { billStatus } = req.body;

    // ensure billStatus is valid
    if (!['unpaid', 'paid'].includes(billStatus)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Invalid bill status, must be either "unpaid" or "paid"'
      });
    }

    // get the reservation to update
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Reservation not found'
      });
    }

    // find the court admin (owner) associated with this reservation's court
    const courtAdmin = await User.findOne({ court: reservation.court, role: 'admin' });
    if (!courtAdmin) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'Court owner not found'
      });
    }

    // check if the user making the request is the court admin
    if (req.user.id !== courtAdmin._id.toString()) {
      return res.status(403).json({
        status: 'error',
        code: 403,
        message: 'You do not have permission to update the bill status of this reservation'
      });
    }

    // update the billStatus of the reservation
    reservation.billStatus = billStatus;
    await reservation.save();

    return res.status(200).json({
      status: 'success',
      code: 200,
      message: `Bill status updated to ${billStatus}`,
      reservation
    });
  } catch (err) {
    console.error('Error while updating bill status:', err);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal Server Error'
    });
  }
};

exports.createMembership = async (req, res) => {
  try {
    const userId = req.user.id;
    const courtId = req.user.court;

    // check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Only admins can create membership cards'
      });
    }

    // validate required fields
    const { membershipName, membershipDescription, membershipPrice } = req.body;
    if (!membershipName || !membershipDescription || !membershipPrice) {
      return res.status(400).json({
        status: 'error',
        message: 'All fields are required'
      });
    }

    // handle image upload
    if (!req.files || !req.files.image) {
      return res.status(400).json({
        status: 'error',
        message: 'Image is required'
      });
    }

    // upload image to R2
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const imageUrl = await handleFileUpload(req.files.image, userId, 'membershipImage', allowedTypes);

    // create new membership
    const membershipStorage = new MembershipSubscription({
      membershipName,
      membershipDescription,
      membershipPrice,
      imageUrl,
      court: courtId,
      postedBy: userId
    });

    await membershipStorage.save();

    res.status(201).json({
      status: 'success',
      data: membershipStorage
    });
  } catch (err) {
    console.error('Error creating membership:', err);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

exports.getMembershipsForCourtOwner = async (req, res) => {
  try {
    const userId = req.user.id;

    // ensure the user is an admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Only court owners can access this resource.'
      });
    }

    // find all membership cards created by this court owner
    const memberships = await MembershipSubscription.find({ postedBy: userId })
      .populate('court', 'business_name')
      .populate('subscribers.userId', 'username')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: memberships
    });
  } catch (err) {
    console.error('Error fetching memberships for court owner:', err);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

exports.deleteMembership = async (req, res) => {
  try {
    const userId = req.user.id;
    const { membershipId } = req.params;

    // ensure the user is an admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Only court owners can delete membership cards.'
      });
    }

    // find the membership and ensure it belongs to the logged-in admin
    const membership = await MembershipSubscription.findOneAndDelete({
      _id: membershipId,
      postedBy: userId
    });

    if (!membership) {
      return res.status(404).json({
        status: 'error',
        message: 'Membership card not found or you do not have permission to delete it.'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Membership card deleted successfully.'
    });
  } catch (err) {
    console.error('Error deleting membership:', err);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

exports.updateMembership = async (req, res) => {
  try {
    const userId = req.user.id;
    const { membershipId } = req.params;

    // ensure the user is an admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Only court owners can update membership cards.'
      });
    }

    // find the membership and ensure it belongs to the logged-in admin
    const membership = await MembershipSubscription.findOne({
      _id: membershipId,
      postedBy: userId
    });

    if (!membership) {
      return res.status(404).json({
        status: 'error',
        message: 'Membership card not found or you do not have permission to update it.'
      });
    }

    // update fields
    const { membershipName, membershipDescription, membershipPrice } = req.body;
    if (membershipName) membership.membershipName = membershipName;
    if (membershipDescription) membership.membershipDescription = membershipDescription;
    if (membershipPrice) membership.membershipPrice = membershipPrice;

    // handle image upload if provided
    if (req.files && req.files.image) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      const imageUrl = await handleFileUpload(req.files.image, userId, 'membershipImage', allowedTypes);
      membership.imageUrl = imageUrl;
    }

    await membership.save();

    res.status(200).json({
      status: 'success',
      message: 'Membership card updated successfully.',
      data: membership
    });
  } catch (err) {
    console.error('Error updating membership:', err);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

exports.getAllMembershipCards = async (req, res) => {
  try {
    const userId = req.user.id;

    const memberships = await MembershipSubscription.find()
      .populate('court', 'business_name location')
      .populate('postedBy', 'username email');

    // add `isSubscribed` for each membership
    const membershipsWithSubscriptionStatus = memberships.map((membership) => {
      const isSubscribed = membership.subscribers.some(
        (subscriber) => subscriber.userId.toString() === userId && subscriber.status === 'active'
      );

      return {
        ...membership.toObject(), // convert the Mongoose document to a plain object
        isSubscribed // add the `isSubscribed` property
      };
    });

    res.status(200).json({
      status: 'success',
      data: membershipsWithSubscriptionStatus
    });
  } catch (err) {
    console.error('Error fetching membership cards:', err);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

exports.subscribeToMembership = async (req, res) => {
  try {
    const userId = req.user.id;
    const { membershipId } = req.params;

    const membership = await MembershipSubscription.findById(membershipId);

    if (!membership) {
      return res.status(404).json({
        status: 'error',
        message: 'Membership card not found'
      });
    }

    // check if the user already has a subscription
    const existingSubscription = membership.subscribers.find((subscriber) => subscriber.userId.toString() === userId);

    if (existingSubscription && existingSubscription.status === 'active') {
      return res.status(400).json({
        status: 'error',
        message: 'You are already subscribed to this membership card.'
      });
    }

    // calculate subscription price
    const membershipPrice = membership.membershipPrice;

    // generate payPal payment link
    const returnUrl = `${config.get(
      'frontendUrl'
    )}/user/membership/confirm?membershipId=${membershipId}&userId=${userId}`;
    const cancelUrl = `${config.get('frontendUrl')}/user/memberships`;

    const payment = await createPayPalPayment(membershipPrice, null, null, null, returnUrl, cancelUrl);

    // get approval URL from PayPal
    const approvalUrl = payment.links.find((link) => link.rel === 'payer-action').href;

    res.status(201).json({
      status: 'success',
      message: 'Subscription initiated successfully.',
      approvalUrl
    });
  } catch (err) {
    console.error('Error initiating subscription:', err);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

exports.confirmMembershipPayment = async (req, res, next) => {
  const { token, membershipId, userId } = req.query;

  try {
    // find the membership by ID and populate the court's information
    const membership = await MembershipSubscription.findById(membershipId).populate({
      path: 'court',
      select: 'business_email business_name'
    });

    if (!membership) {
      return res.status(404).json({
        status: 'error',
        message: 'Membership card not found'
      });
    }

    // extract courtOwnerEmail
    const courtOwnerEmail = membership.court.business_email;
    if (!courtOwnerEmail) {
      return res.status(404).json({
        status: 'error',
        message: 'Court owner email not found'
      });
    }

    // process the payment if a token is provided
    if (token) {
      const paymentCapture = await capturePayPalPayment(token);
      if (paymentCapture.status !== 'COMPLETED') {
        return next(createError(400, 'Payment was not successful'));
      }

      const paymentDetails = paymentCapture.purchase_units[0].payments;
      const transaction = paymentDetails.captures[0];
      const totalAmount = transaction.amount.value;
      log(totalAmount);

      // initiate payout to the event owner
      await createPayPalPayout(courtOwnerEmail, totalAmount);
      log('Payout to event owner initiated');

      // find or create the subscriber entry in the membership
      const existingSubscription = membership.subscribers.find((subscriber) => subscriber.userId.toString() === userId);

      if (existingSubscription) {
        existingSubscription.status = 'active';
        existingSubscription.subscribedAt = Date.now();
        existingSubscription.canceledAt = null;
      } else {
        membership.subscribers.push({
          userId,
          status: 'active',
          subscribedAt: Date.now()
        });
      }

      // save the updated membership
      await membership.save();

      sendMembershipConfirmation(
        req.user.username,
        membership.court.business_name,
        membership.membershipName,
        req.user.email
      );

      // redirect to the memberships page
      return res.redirect(`/user/memberships`);
    }

    // if no token, return an error indicating a token is required
    return next(createError(400, 'Payment token is required'));
  } catch (err) {
    console.error('Error confirming subscription payment:', err);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

exports.subscribeMembership = async (req, res) => {
  try {
    const userId = req.user.id;
    const { membershipId } = req.params;

    // Find membership
    const MembershipSubscription = await MembershipSubscription.findById(membershipId);
    if (!MembershipSubscription) {
      return res.status(404).json({
        status: 'error',
        message: 'Membership not found'
      });
    }

    // Check if user is already subscribed
    const existingSubscription = MembershipSubscription.subscribers.find(
      (sub) => sub.userId.toString() === userId && sub.status === 'active'
    );

    if (existingSubscription) {
      return res.status(400).json({
        status: 'error',
        message: 'User is already subscribed to this membership'
      });
    }

    // Add subscriber
    MembershipSubscription.subscribers.push({
      userId,
      dateSubscribed: new Date(),
      status: 'active'
    });

    await MembershipSubscription.save();

    res.status(200).json({
      status: 'success',
      message: 'Successfully subscribed to membership'
    });
  } catch (err) {
    console.error('Error subscribing to membership:', err);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

exports.getUserSubscriptions = async (req, res) => {
  try {
    const userId = req.user.id;

    // find all active subscriptions related to the user
    const subscriptions = await MembershipSubscription.find({
      subscribers: {
        $elemMatch: {
          userId: userId,
          status: 'active' // Only include active subscriptions
        }
      }
    })
      .populate('court', 'business_name location') // Populate court details
      .sort({ 'subscribers.subscribedAt': -1 }); // Sort by subscription date

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No active subscriptions found for this user.'
      });
    }

    res.status(200).json({
      status: 'success',
      data: subscriptions
    });
  } catch (err) {
    console.error('Error fetching subscriptions for user:', err);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { membershipId } = req.params;

    const membership = await MembershipSubscription.findById(membershipId);

    if (!membership) {
      return res.status(404).json({
        status: 'error',
        message: 'Membership card not found'
      });
    }

    const subscriber = membership.subscribers.find((sub) => sub.userId.toString() === userId);

    if (!subscriber || subscriber.status === 'canceled') {
      return res.status(400).json({
        status: 'error',
        message: 'You are not actively subscribed to this membership card.'
      });
    }

    subscriber.status = 'canceled';
    subscriber.canceledAt = Date.now();

    await membership.save();

    res.status(200).json({
      status: 'success',
      message: 'Subscription canceled successfully'
    });
  } catch (err) {
    console.error('Error canceling subscription:', err);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

exports.removeUserSubscription = async (req, res) => {
  try {
    const { userId, subscriptionId } = req.params;
    const courtOwnerId = req.user.id;

    // ensure the user is an admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Only court owners can remove subscriptions.'
      });
    }

    // find the membership and ensure it belongs to the court owner
    const membership = await MembershipSubscription.findOne({
      _id: subscriptionId,
      postedBy: courtOwnerId
    });

    if (!membership) {
      return res.status(404).json({
        status: 'error',
        message: 'Membership not found or does not belong to you.'
      });
    }

    // check if the user exists in the subscribers array
    const subscriberIndex = membership.subscribers.findIndex((sub) => sub.userId.toString() === userId);

    if (subscriberIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'User is not subscribed to this membership.'
      });
    }

    // remove the subscriber from the array
    membership.subscribers.splice(subscriberIndex, 1);

    // save the updated membership document
    await membership.save();

    res.status(200).json({
      status: 'success',
      message: `Subscription for user ${userId} has been removed.`,
      data: membership
    });
  } catch (err) {
    console.error('Error removing subscription:', err);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

exports.getSubscribersForMembership = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    // Find the membership subscription by ID
    const membership = await MembershipSubscription.findById(subscriptionId).populate(
      'subscribers.userId',
      'username email'
    ); // Populate user details (username, email, etc.)

    if (!membership) {
      return res.status(404).json({
        status: 'error',
        message: 'Membership subscription not found.'
      });
    }

    res.status(200).json({
      status: 'success',
      subscribers: membership.subscribers // Return subscribers array
    });
  } catch (err) {
    console.error('Error fetching subscribers for membership:', err);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

exports.submitFeedback = async (req, res) => {
  try {
    const { feedbackText, emojiValue } = req.body;
    const userId = req.user.id;

    // validate the input data
    if (!feedbackText || !emojiValue) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: feedbackText or emojiValue.'
      });
    }

    // send the feedback email
    await sendFeedbackEmail(userId, feedbackText, emojiValue);

    // respond with success
    res.status(200).json({
      status: 'success',
      message: 'Feedback received and email sent successfully.'
    });
  } catch (err) {
    console.error('Error submitting feedback:', err);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    // fetch notifications for the user and sort by createdAt in descending order
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });

    // if no notifications found, return an appropriate response
    if (notifications.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No notifications found',
        notifications: []
      });
    }
    // return the notifications
    return res.status(200).json({
      status: 'success',
      message: 'Notifications fetched successfully.',
      notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

exports.markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    // validate if userId and notificationId are provided
    if (!userId || !notificationId) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID and notification ID are required.'
      });
    }

    // find the notification and mark it as read
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId, isRead: false },
      { isRead: true },
      { new: true } // To return the updated notification
    );

    // if the notification does not exist or was already read
    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found or already marked as read.'
      });
    }

    // return success response
    return res.status(200).json({
      status: 'success',
      message: 'Notification marked as read successfully.',
      notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error while marking notification as read.'
    });
  }
};

exports.markNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    // validate if the userId exists
    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID is required.'
      });
    }

    // mark notifications as read for the user
    const result = await Notification.updateMany({ userId, isRead: false }, { isRead: true });

    // if no notifications were updated
    if (result.nModified === 0) {
      return res.status(404).json({
        status: 'info',
        message: 'No unread notifications found for this user.'
      });
    }

    // return success response
    return res.status(200).json({
      status: 'success',
      message: 'All unread notifications have been marked as read.'
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error while marking notifications as read.'
    });
  }
};

exports.clearNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    // validate if the userId exists
    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID is required.'
      });
    }

    // clear notifications for the user
    const result = await Notification.deleteMany({ userId });

    // if no notifications were deleted
    if (result.deletedCount === 0) {
      return res.status(404).json({
        status: 'info',
        message: 'No notifications found to clear for this user.'
      });
    }

    // return success response
    return res.status(200).json({
      status: 'success',
      message: 'All notifications have been cleared.'
    });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error while clearing notifications.'
    });
  }
};

exports.testWebsocketNotif = async (req, res) => {
  try {
    const userId = req.user.id;

    createNotification(userId, 'Reservation Confirmed', 'Your reservation has been confirmed.', 'success');

    return res.status(200).json({
      status: 'success'
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error while clearing notifications.'
    });
  }
};
