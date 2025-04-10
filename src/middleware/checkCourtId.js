const mongoose = require('mongoose');
const Court = require('../models/Court');
const createError = require('http-errors');

// middleware to check courtId
const checkCourtId = async (req, res, next) => {
  const { id } = req.query;
  try {
    // check if courtId is a valid ObjectId
    if (!isValidObjectId(id)) {
      return next(createError(400, 'Invalid id format.'));
    }

    // check if courtId exists in the database
    const court = await Court.findById(id);
    if (!court) {
      return next(createError(404, 'Court not found.'));
    }

    // proceed if court exists
    next();
  } catch (error) {
    console.error(error);
    return next(createError(500, 'Internal Server Error'));
  }
};

// Function to check if an ID is a valid ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

module.exports = checkCourtId;
