const express = require('express');
const Plan = require('../models/Plan');
const Program = require('../models/Program');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const { auth } = require('../middleware/auth');
const { emitToAdmins } = require('../realtime');

const router = express.Router();

function addCycle(date, cycle) {
  const d = new Date(date);
  if (cycle === 'quarterly') d.setMonth(d.getMonth() + 3);
  else if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

// POST /api/subscriptions { planId?, programId? }
// membership: plan price. program booking: program price, monthly cycle.
// creates subscription (pending) + first invoice (pending, due in 7 days)
router.post('/', auth, async (req, res) => {
  try {
    const { planId, programId } = req.body;
    let amountInr, cycle = 'monthly', plan = null, program = null;

    if (programId) {
      program = await Program.findById(programId);
      if (!program) return res.status(404).json({ error: 'program not found' });
      amountInr = program.priceInr;
    } else {
      plan = await Plan.findById(planId);
      if (!plan) return res.status(404).json({ error: 'plan not found' });
      amountInr = plan.priceInr;
      cycle = plan.billingCycle;
    }

    const start = new Date();
    const sub = await Subscription.create({
      userId: req.user.userId,
      planId: plan ? plan._id : undefined,
      programId: program ? program._id : undefined,
      status: 'pending',
      startDate: start,
      endDate: addCycle(start, cycle)
    });

    const due = new Date();
    due.setDate(due.getDate() + 7);
    const invoice = await Invoice.create({
      subscriptionId: sub._id,
      amountInr,
      status: 'pending',
      dueDate: due
    });
    emitToAdmins('invoice:created', invoice); // live admin sync
    res.json({ subscription: sub, invoice });
  } catch (e) {
    res.status(500).json({ error: 'subscription failed' });
  }
});

// GET /api/subscriptions/mine -> my subscriptions with plan + program names
router.get('/mine', auth, async (req, res) => {
  const subs = await Subscription.find({ userId: req.user.userId })
    .populate('planId', 'name priceInr')
    .populate('programId', 'name location day startTime endTime')
    .sort({ createdAt: -1 });
  res.json(subs);
});

module.exports = router;
