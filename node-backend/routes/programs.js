const express = require('express');
const Program = require('../models/Program');

const router = express.Router();

// GET /api/programs?sportId=... -> programs, optionally filtered by sport
router.get('/', async (req, res) => {
  const filter = req.query.sportId ? { sportId: req.query.sportId } : {};
  res.json(await Program.find(filter).populate('sportId', 'name icon').populate('gymId', 'name area'));
});

module.exports = router;
