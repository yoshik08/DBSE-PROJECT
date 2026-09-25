const express = require('express');
const Sport = require('../models/Sport');
const Program = require('../models/Program');
const Plan = require('../models/Plan');
const Gym = require('../models/Gym');
const router = express.Router();
// POST /api/ai/chat { message } -> { reply, ai: true/false }
// gemini answers anything like a normal chatbot when GEMINI_API_KEY is set,
// with the live catalog as background for site questions.
// otherwise { reply: null } and the frontend uses its built-in answers
router.post('/chat', async (req, res) => {
  const { message } = req.body || {};
  if (!message) return res.status(400).json({ error: 'message required' });
  if (!process.env.GEMINI_API_KEY) return res.json({ reply: null, ai: false });
  try {
    const [sports, programs, plans, gyms] = await Promise.all([
      Sport.find().lean(),
      Program.find().populate('sportId', 'name').populate('gymId', 'name area').lean(),
      Plan.find().lean(),
      Gym.find().lean()
    ]);
    const catalog =
      'SPORTS: ' + sports.map(s => s.name).join(', ') + '\n' +
      'PROGRAMS: ' + programs.map(p =>
        `${p.name} (${p.sportId?.name || ''}) at ${p.gymId?.name || p.location || ''}, ` +
        `${p.day || ''} ${p.startTime || ''}-${p.endTime || ''}, coach ${p.coach || '-'}, level ${p.level || '-'}`
      ).join('; ') + '\n' +
      'PLANS: ' + plans.map(p => `${p.name} ₹${p.priceInr}/month — ${p.description || ''}`).join('; ') + '\n' +
      'VENUES: ' + gyms.map(g => `${g.name} (${g.area || ''})`).join('; ');
    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' +
      process.env.GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text:
            'You are a friendly chatbot on the SportSphere website. Chat naturally about anything the user asks, ' +
            'like a normal AI assistant — no topic is off limits. Keep replies conversational and not too long. ' +
            'You also know the SportSphere catalog below: when the user asks about sports, programs, plans, prices or venues on this site, ' +
            'answer from the catalog and never invent programs, prices or venues.\n\n' + catalog + '\n\nUser: ' + message
          }]}]
        })
      }
    );
    const data = await r.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    res.json({ reply: reply || null, ai: !!reply });
  } catch (e) {
    res.json({ reply: null, ai: false }); // frontend falls back to local answers
  }
});
module.exports = router;
