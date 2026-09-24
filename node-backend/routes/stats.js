const express = require('express');
const User = require('../models/User');
const Sport = require('../models/Sport');
const Program = require('../models/Program');
const Subscription = require('../models/Subscription');

const router = express.Router();

// GET /api/stats -> public homepage metrics, all live from Atlas
router.get('/', async (req, res) => {
  try {
    const [athletes, sports, programs, activeSubscriptions] = await Promise.all([
      User.countDocuments({ role: 'athlete' }),
      Sport.countDocuments(),
      Program.countDocuments(),
      Subscription.countDocuments({ status: 'active' })
    ]);
    res.json({ athletes, sports, programs, activeSubscriptions });
  } catch (e) {
    res.status(500).json({ error: 'stats failed' });
  }
});

module.exports = router;
