const express = require('express');
const Booking = require('../models/Booking');
const Program = require('../models/Program');
const Invoice = require('../models/Invoice');
const { auth } = require('../middleware/auth');

const router = express.Router();

// POST /api/bookings { programId, slot } -> pending booking + invoice (pay via razorpay, then verify)
router.post('/', auth, async (req, res) => {
  try {
    const { programId, slot } = req.body || {};
    const program = await Program.findById(programId);
    if (!program) return res.status(404).json({ error: 'program not found' });
    const booking = await Booking.create({
      userId: req.user.userId,
      programId,
      slot: slot || ((program.day || '') + ' ' + (program.startTime || '') + '–' + (program.endTime || '')),
      amountInr: program.priceInr,
      status: 'pending',
      bookingRef: 'SS' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 90 + 10)
    });
    const invoice = await Invoice.create({ bookingId: booking._id, amountInr: program.priceInr, status: 'pending' });
    res.status(201).json({ booking, invoice });
  } catch (e) {
    res.status(500).json({ error: 'booking failed', detail: e.message });
  }
});

// POST /api/bookings/:id/confirm -> confirm a pending booking (mock/test fallback, owner only)
router.post('/:id/confirm', auth, async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!booking) return res.status(404).json({ error: 'booking not found' });
    if (booking.status !== 'pending') return res.status(400).json({ error: 'already processed' });
    booking.status = 'confirmed';
    await booking.save();
    await Invoice.updateMany({ bookingId: booking._id, status: 'pending' }, { status: 'paid' });
    res.json(booking);
  } catch (e) {
    res.status(500).json({ error: 'confirm failed', detail: e.message });
  }
});

// GET /api/bookings/mine -> bookings of the logged-in user
router.get('/mine', auth, async (req, res) => {
  const bookings = await Booking.find({ userId: req.user.userId, status: { $ne: 'pending' } })
    .populate('programId', 'name pricePer')
    .sort({ createdAt: -1 });
  res.json(bookings);
});

module.exports = router;
