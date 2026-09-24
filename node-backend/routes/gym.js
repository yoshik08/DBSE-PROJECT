const express = require('express');
const Gym = require('../models/Gym');
const Program = require('../models/Program');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const { auth, gymOwner } = require('../middleware/auth');

const router = express.Router();
router.use(auth, gymOwner);

// gyms this owner controls (admins see all, for support)
async function ownedGyms(req) {
  if (req.user.role === 'admin') return Gym.find();
  return Gym.find({ ownerId: req.user.userId });
}

// GET /api/gym/dashboard -> owner portal numbers
router.get('/dashboard', async (req, res) => {
  const gyms = await ownedGyms(req);
  const gymIds = gyms.map(g => g._id);
  const programs = await Program.find({ gymId: { $in: gymIds } })
    .populate('sportId', 'name icon');
  const programIds = programs.map(p => p._id);
  const [subscriptions, invoices] = await Promise.all([
    Subscription.find({ programId: { $in: programIds } })
      .populate('userId', 'fullName email')
      .populate('planId', 'name priceInr')
      .populate('programId', 'name')
      .sort({ createdAt: -1 }),
    Invoice.find().populate('subscriptionId', 'programId').sort({ issuedAt: -1 })
  ]);
  const myInvoices = invoices.filter(i =>
    i.subscriptionId && programIds.some(p => String(p) === String(i.subscriptionId.programId)));
  const paidTotals = await Payment.aggregate([
    { $match: { status: 'success', invoiceId: { $in: myInvoices.map(i => i._id) } } },
    { $group: { _id: null, total: { $sum: '$amountInr' } } }
  ]);
  const active = subscriptions.filter(s => s.status === 'active').length;
  res.json({
    gyms, programs, subscriptions,
    invoices: myInvoices,
    stats: {
      gyms: gyms.length,
      programs: programs.length,
      activeSubscriptions: active,
      revenueInr: paidTotals[0]?.total || 0
    }
  });
});

// POST /api/gym/programs -> owner adds a program at their own venue
router.post('/programs', async (req, res) => {
  const gyms = await ownedGyms(req);
  const gymIds = gyms.map(g => String(g._id));
  if (!gymIds.includes(String(req.body.gymId)))
    return res.status(403).json({ error: 'not your venue' });
  res.json(await Program.create(req.body));
});

// PUT /api/gym/programs/:id -> owner edits their own program
router.put('/programs/:id', async (req, res) => {
  const gyms = await ownedGyms(req);
  const gymIds = gyms.map(g => String(g._id));
  const prog = await Program.findById(req.params.id);
  if (!prog || !gymIds.includes(String(prog.gymId)))
    return res.status(403).json({ error: 'not your program' });
  res.json(await Program.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// DELETE /api/gym/programs/:id
router.delete('/programs/:id', async (req, res) => {
  const gyms = await ownedGyms(req);
  const gymIds = gyms.map(g => String(g._id));
  const prog = await Program.findById(req.params.id);
  if (!prog || !gymIds.includes(String(prog.gymId)))
    return res.status(403).json({ error: 'not your program' });
  await Program.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// POST /api/gym/venues -> owner adds their own venue, they become its owner
router.post('/venues', async (req, res) => {
  const { name, area, address, phone, lat, lng } = req.body;
  if (!name) return res.status(400).json({ error: 'venue name required' });
  const gym = await Gym.create({
    name, area, address, phone,
    lat: lat ? Number(lat) : undefined,
    lng: lng ? Number(lng) : undefined,
    ownerId: req.user.userId
  });
  res.json(gym);
});

module.exports = router;
