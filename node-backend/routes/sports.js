const express = require('express');
const Sport = require('../models/Sport');

const router = express.Router();

// GET /api/sports -> all sports
router.get('/', async (req, res) => {
  res.json(await Sport.find().sort({ name: 1 }));
});

module.exports = router;
