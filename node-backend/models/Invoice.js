const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
  amountInr: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' },
  issuedAt: { type: Date, default: Date.now },
  dueDate: Date
});

module.exports = mongoose.model('Invoice', invoiceSchema);
