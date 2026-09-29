const express = require('express');
const Invoice = require('../models/Invoice');
const Subscription = require('../models/Subscription');
const Booking = require('../models/Booking');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/invoices/mine -> my invoices (plan subscriptions + program bookings)
router.get('/mine', auth, async (req, res) => {
  const [mySubs, myBookings] = await Promise.all([
    Subscription.find({ userId: req.user.userId }).select('_id'),
    Booking.find({ userId: req.user.userId }).select('_id')
  ]);
  const invoices = await Invoice.find({
    $or: [
      { subscriptionId: { $in: mySubs.map(s => s._id) } },
      { bookingId: { $in: myBookings.map(b => b._id) } }
    ]
  }).sort({ issuedAt: -1 });
  res.json(invoices);
});

module.exports = router;