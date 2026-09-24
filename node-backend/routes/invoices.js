const express = require('express');
const Invoice = require('../models/Invoice');
const Subscription = require('../models/Subscription');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/invoices/mine -> my invoices (via my subscriptions)
router.get('/mine', auth, async (req, res) => {
  const mySubs = await Subscription.find({ userId: req.user.userId }).select('_id');
  const invoices = await Invoice.find({
    subscriptionId: { $in: mySubs.map(s => s._id) }
  }).sort({ issuedAt: -1 });
  res.json(invoices);
});

module.exports = router;
