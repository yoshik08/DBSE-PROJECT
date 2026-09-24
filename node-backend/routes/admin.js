const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Program = require('../models/Program');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const { auth, admin } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/export/transactions?token=<jwt> -> csv download
// token comes as a query param so a plain <a href> / button click can trigger it
function csvEsc(v) {
  v = String(v ?? '');
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}
router.get('/export/transactions', async (req, res) => {
  try {
    const user = jwt.verify(req.query.token || '', process.env.JWT_SECRET);
    if (user.role !== 'admin') return res.status(403).json({ error: 'admin only' });
  } catch {
    return res.status(401).json({ error: 'bad token' });
  }

  const payments = await Payment.find()
    .populate({
      path: 'invoiceId',
      populate: {
        path: 'subscriptionId',
        populate: [{ path: 'userId', select: 'fullName email' }, { path: 'planId', select: 'name' }]
      }
    })
    .sort({ paidAt: -1 });

  const rows = [['date', 'payment_id', 'athlete', 'email', 'invoice_id', 'plan', 'amount_inr', 'method', 'txn_ref', 'status']];
  for (const p of payments) {
    const inv = p.invoiceId || {};
    const sub = inv.subscriptionId || {};
    rows.push([
      p.paidAt ? p.paidAt.toISOString() : '',
      p._id.toString(),
      sub.userId?.fullName || '',
      sub.userId?.email || '',
      inv._id ? inv._id.toString() : '',
      sub.planId?.name || '',
      p.amountInr, p.method, p.txnRef || '', p.status
    ]);
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="sportsphere-transactions.csv"');
  res.send(rows.map(r => r.map(csvEsc).join(',')).join('\n'));
});

router.use(auth, admin); // everything below is admin-only (header-token auth)

// GET /api/admin/stats -> dashboard numbers
router.get('/stats', async (req, res) => {
  const [users, subscriptions, invoices, payments] = await Promise.all([
    User.countDocuments(),
    Subscription.countDocuments(),
    Invoice.countDocuments(),
    Payment.aggregate([{ $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amountInr' } } }])
  ]);
  res.json({
    users, subscriptions, invoices,
    revenueInr: payments[0]?.total || 0
  });
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  res.json(await User.find().select('-passwordHash').sort({ createdAt: -1 }));
});

// GET /api/admin/subscriptions
router.get('/subscriptions', async (req, res) => {
  res.json(await Subscription.find()
    .populate('userId', 'fullName email')
    .populate('planId', 'name priceInr')
    .populate('programId', 'name')
    .sort({ createdAt: -1 }));
});

// GET /api/admin/invoices
router.get('/invoices', async (req, res) => {
  res.json(await Invoice.find().sort({ issuedAt: -1 }));
});

// POST /api/admin/programs -> add program
router.post('/programs', async (req, res) => {
  res.json(await Program.create(req.body));
});

// PUT /api/admin/programs/:id -> edit program
router.put('/programs/:id', async (req, res) => {
  res.json(await Program.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// DELETE /api/admin/programs/:id
router.delete('/programs/:id', async (req, res) => {
  await Program.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
