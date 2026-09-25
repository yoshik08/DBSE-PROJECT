const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const Booking = require('../models/Booking');
const { auth } = require('../middleware/auth');
const { emitToAdmins } = require('../realtime');

const router = express.Router();
const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function myInvoice(invoiceId, userId) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return null;
  if (invoice.subscriptionId) {
    const sub = await Subscription.findById(invoice.subscriptionId);
    if (!sub || sub.userId.toString() !== userId) return null;
    return { invoice, sub };
  }
  if (invoice.bookingId) {
    const booking = await Booking.findById(invoice.bookingId);
    if (!booking || booking.userId.toString() !== userId) return null;
    return { invoice, booking };
  }
  return null;
}

// POST /api/payments/order { invoiceId } -> razorpay order (TEST mode)
router.post('/order', auth, async (req, res) => {
  const found = await myInvoice(req.body.invoiceId, req.user.userId);
  if (!found) return res.status(404).json({ error: 'invoice not found' });
  if (found.invoice.status === 'paid') return res.status(400).json({ error: 'already paid' });

  let order;
  try {
    order = await rzp.orders.create({
      amount: found.invoice.amountInr * 100, // paise
      currency: 'INR',
      receipt: found.invoice._id.toString()
    });
  } catch (e) {
    return res.status(502).json({ error: 'payment gateway unreachable (check razorpay keys)' });
  }
  res.json({ orderId: order.id, amount: found.invoice.amountInr, keyId: process.env.RAZORPAY_KEY_ID });
});

// POST /api/payments/verify { invoiceId, orderId, paymentId, signature }
// verifies razorpay signature -> marks invoice paid, subscription active
router.post('/verify', auth, async (req, res) => {
  const { invoiceId, orderId, paymentId, signature } = req.body;
  const found = await myInvoice(invoiceId, req.user.userId);
  if (!found) return res.status(404).json({ error: 'invoice not found' });

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(orderId + '|' + paymentId)
    .digest('hex');
  if (expected !== signature) return res.status(400).json({ error: 'bad signature' });

  await Payment.create({
    invoiceId, amountInr: found.invoice.amountInr,
    method: 'razorpay', txnRef: paymentId, status: 'success'
  });
  found.invoice.status = 'paid';
  await found.invoice.save();
  if (found.sub) { found.sub.status = 'active'; await found.sub.save(); }
  if (found.booking) { found.booking.status = 'confirmed'; await found.booking.save(); }
  emitToAdmins('invoice:updated', found.invoice); // live admin sync

  res.json({ ok: true });
});

module.exports = router;
