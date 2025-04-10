const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', 
    },
    court: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Court', 
      required: true, 
    },
    image: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    membershipFee: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
    strict: 'throw',
  }
);

const Membership = mongoose.model('Membership', membershipSchema);

module.exports = Membership;
