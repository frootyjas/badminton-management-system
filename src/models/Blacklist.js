const mongoose = require('mongoose');

const blacklistSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true
    },
    type: {
      type: String,
      enum: ['access', 'refresh', 'reset', 'verify', 'courtAccess'],
      required: true
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

const Blacklist = mongoose.model('Blacklist', blacklistSchema);

module.exports = Blacklist;
