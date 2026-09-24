const express = require('express');
const Gym = require('../models/Gym');
const Program = require('../models/Program');

const router = express.Router();

// GET /api/gyms -> public venue directory with program counts
router.get('/', async (req, res) => {
  const gyms = await Gym.find().sort({ name: 1 }).lean();
  const counts = await Program.aggregate([
    { $match: { gymId: { $ne: null } } },
    { $group: { _id: '$gymId', n: { $sum: 1 } } }
  ]);
  const byId = Object.fromEntries(counts.map(c => [String(c._id), c.n]));
  res.json(gyms.map(g => ({ ...g, programCount: byId[String(g._id)] || 0 })));
});

// GET /api/gyms/:id -> one venue with its programs
router.get('/:id', async (req, res) => {
  const gym = await Gym.findById(req.params.id);
  if (!gym) return res.status(404).json({ error: 'venue not found' });
  const programs = await Program.find({ gymId: gym._id }).populate('sportId', 'name icon');
  res.json({ gym, programs });
});

module.exports = router;
