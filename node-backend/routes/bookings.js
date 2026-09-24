const express = require('express');
const Booking = require('../models/Booking');
const Program = require('../models/Program');
const { auth } = require('../middleware/auth');

const router = express.Router();

// POST /api/bookings { programId, slot } -> confirmed booking (test mode)
router.post('/', auth, async (req, res) => {
  const { programId, slot } = req.body || {};
  const program = await Program.findById(programId);
  if (!program) return res.status(404).json({ error: 'program not found' });
  const booking = await Booking.create({
    userId: req.user.userId,
    programId,
    slot: slot || ((program.day || '') + ' ' + (program.startTime || '') + '–' + (program.endTime || '')),
    amountInr: program.priceInr,
    bookingRef: 'SS' + Date.now().toString().slice(-8)
  });
  res.status(201).json(booking);
});

// GET /api/bookings/mine -> bookings of the logged-in user
router.get('/mine', auth, async (req, res) => {
  const bookings = await Booking.find({ userId: req.user.userId })
    .populate('programId', 'name pricePer')
    .sort({ createdAt: -1 });
  res.json(bookings);
});

module.exports = router;
