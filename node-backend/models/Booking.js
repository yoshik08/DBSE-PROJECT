const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
  slot: String, // e.g. "mon · 6:00 am – 7:00 am"
  amountInr: { type: Number, required: true },
  status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
  bookingRef: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
