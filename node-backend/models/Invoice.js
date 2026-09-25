const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  amountInr: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' },
  issuedAt: { type: Date, default: Date.now },
  dueDate: Date
});

module.exports = mongoose.model('Invoice', invoiceSchema);
