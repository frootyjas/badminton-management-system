const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: [true, 'Feedback message is required'],
      trim: true,
      minlength: [10, 'Feedback message should be at least 10 characters'],
      maxlength: [1000, 'Feedback message should not exceed 1000 characters']
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Feedback', FeedbackSchema);
