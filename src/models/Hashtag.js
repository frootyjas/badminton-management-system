const mongoose = require('mongoose');

const hashtagSchema = new mongoose.Schema(
  {
    hashtag: {
      type: String,
      required: true,
      unique: true, // ensures unique hashtags
      lowercase: true
    },
    count: {
      type: Number,
      default: 0
    },
    lastUsed: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

const Hashtag = mongoose.model('Hashtag', hashtagSchema);

module.exports = Hashtag;
