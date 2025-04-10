const mongoose = require('mongoose');

const membershipSubscriptionSchema = new mongoose.Schema({
  membershipName: {
    type: String,
    required: true
  },
  membershipDescription: {
    type: String,
    required: true
  },
  membershipPrice: {
    type: Number,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  subscribers: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      status: { type: String, enum: ['active', 'canceled'], default: 'active' },
      subscribedAt: { type: Date, default: Date.now },
      canceledAt: { type: Date, default: null }
    }
  ],
  court: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Court',
    required: true
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const MembershipSubscription = mongoose.model('MembershipStorage', membershipSubscriptionSchema);
module.exports = MembershipSubscription;
