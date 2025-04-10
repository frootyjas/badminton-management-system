const mongoose = require('mongoose');

const joinedMembershipSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    membership: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Membership',
      required: true
    },
    joinDate: {
      type: Date,
      default: Date.now
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending'
    }
  },
  {
    timestamps: true,
    strict: 'throw'
  }
);

const MemberList = mongoose.model('MemberList', joinedMembershipSchema);

module.exports = MemberList;
