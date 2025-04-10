const mongoose = require('mongoose');
const Announcement = require('./Announcement');

const eventSchema = new mongoose.Schema(
  {
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    reservationFee: {
      type: Number,
      required: false,
      default: null
    },
    eventFee: {
      type: Number,
      required: false,
      default: null
    },
    participantLimit: {
      type: Number,
      required: [true, 'Participant limit is required']
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    timestamps: true,
    strict: 'throw'
  }
);

// event model using the announcement model as a base
const Event = Announcement.discriminator('Event', eventSchema);

module.exports = Event;
