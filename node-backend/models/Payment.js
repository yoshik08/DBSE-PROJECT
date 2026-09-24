const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  amountInr: { type: Number, required: true },
  method: { type: String, default: 'razorpay' },
  txnRef: String, // razorpay payment id
  status: { type: String, enum: ['initiated', 'success', 'failed'], default: 'initiated' },
  paidAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
