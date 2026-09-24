const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
  status: { type: String, enum: ['pending', 'active', 'expired', 'cancelled'], default: 'pending' },
  startDate: Date,
  endDate: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
