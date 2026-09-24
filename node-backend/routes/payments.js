const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const { auth } = require('../middleware/auth');
const { emitToAdmins } = require('../realtime');

const router = express.Router();

// lazy client: returns null when keys aren't configured
function rzp() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET ||
      process.env.RAZORPAY_KEY_ID === 'CHANGE_ME') return null;
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
}

async function myInvoice(invoiceId, userId) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return null;
  const sub = await Subscription.findById(invoice.subscriptionId);
  if (!sub || sub.userId.toString() !== userId) return null;
  return { invoice, sub };
}

// POST /api/payments/order { invoiceId } -> razorpay order (TEST mode)
router.post('/order', auth, async (req, res) => {
  try {
    const client = rzp();
    if (!client) return res.status(503).json({ error: 'payments not configured' });
    const found = await myInvoice(req.body.invoiceId, req.user.userId);
    if (!found) return res.status(404).json({ error: 'invoice not found' });
    if (found.invoice.status === 'paid') return res.status(400).json({ error: 'already paid' });

    let order;
    try {
      order = await client.orders.create({
        amount: found.invoice.amountInr * 100, // paise
        currency: 'INR',
        receipt: found.invoice._id.toString()
      });
    } catch (e) {
      return res.status(502).json({ error: 'payment gateway unreachable (check razorpay keys)' });
    }
    res.json({ orderId: order.id, amount: found.invoice.amountInr, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (e) {
    res.status(500).json({ error: 'order failed' });
  }
});

// POST /api/payments/verify { invoiceId, orderId, paymentId, signature }
// verifies razorpay signature -> marks invoice paid, subscription active
router.post('/verify', auth, async (req, res) => {
  try {
    const { invoiceId, orderId, paymentId, signature } = req.body;
    const found = await myInvoice(invoiceId, req.user.userId);
    if (!found) return res.status(404).json({ error: 'invoice not found' });
    if (found.invoice.status === 'paid') return res.json({ ok: true }); // idempotent

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(orderId + '|' + paymentId)
      .digest('hex');
    if (expected !== signature) return res.status(400).json({ error: 'bad signature' });

    const dup = await Payment.findOne({ txnRef: paymentId });
    if (!dup) {
      await Payment.create({
        invoiceId, amountInr: found.invoice.amountInr,
        method: 'razorpay', txnRef: paymentId, status: 'success'
      });
    }
    found.invoice.status = 'paid';
    await found.invoice.save();
    found.sub.status = 'active';
    await found.sub.save();
    emitToAdmins('invoice:updated', found.invoice); // live admin sync

    res.json({ ok: true, subscriptionId: found.sub._id });

  } catch (e) {
    res.status(500).json({ error: 'verification failed' });
  }
});

module.exports = router;
