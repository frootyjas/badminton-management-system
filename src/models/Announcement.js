const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    heading: {
      type: String,
      required: [true, 'Heading is required'],
      trim: true,
      minlength: [5, 'Heading must be at least 5 characters long']
    },
    details: {
      type: String,
      required: [true, 'Details are required'],
      minlength: [10, 'Details must be at least 10 characters long']
    },
    images: {
      type: [String],
      default: []
    },
    court: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Court',
      required: [true, 'Court reference is required']
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Admin who posted the announcement is required']
    }
  },
  {
    timestamps: true,
    strict: 'throw'
  }
);

// populate the court and postedBy fields automatically on find
announcementSchema.pre(/^find/, function (next) {
  this.populate('court', 'business_logo business_name location contact number business_email description').populate(
    'postedBy',
    'first_name last_name role'
  );
  next();
});

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;
