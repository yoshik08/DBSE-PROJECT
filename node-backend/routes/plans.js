const express = require('express');
const Plan = require('../models/Plan');

const router = express.Router();

// GET /api/plans -> all plans
router.get('/', async (req, res) => {
  res.json(await Plan.find().sort({ priceInr: 1 }));
});

module.exports = router;
