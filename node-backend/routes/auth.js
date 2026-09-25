const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
// POST /api/auth/google  { idToken } -> { token, user }
// mapping: google account -> users collection
//   googleSub known -> straight login
//   email exists    -> link googleSub, login as that user
//   email new       -> create athlete row, login as new user
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken required' });
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const { sub, email, name, email_verified } = ticket.getPayload();
    if (!email_verified) return res.status(400).json({ error: 'google email not verified' });
    let user = await User.findOne({ googleSub: sub }) || await User.findOne({ email });
    if (user && !user.googleSub) {
      user.googleSub = sub; // link this google account to the existing row
      await user.save();
    }
    if (!user) {
      user = await User.create({
        fullName: name, email,
        passwordHash: 'OAUTH_ONLY',
        role: 'athlete', googleSub: sub
      });
    }
    // superuser: this email is always admin and can never be locked out
    if (process.env.SUPERADMIN_EMAIL && email === process.env.SUPERADMIN_EMAIL && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }
    // admin with totp mfa on -> stop here, client must pass step 2
    if (user.role === 'admin' && user.mfaEnabled) {
      const tempToken = jwt.sign(
        { userId: user._id.toString(), purpose: 'mfa' },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      return res.json({ mfaRequired: true, tempToken });
    }
    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role }
    });
  } catch (e) {
    res.status(401).json({ error: 'google login failed', detail: e.message });
  }
});
// POST /api/auth/mfa  { tempToken, code } -> { token, user }  (step 2 of admin login)
router.post('/mfa', async (req, res) => {
  try {
    const { tempToken, code } = req.body || {};
    const payload = jwt.verify(tempToken || '', process.env.JWT_SECRET);
    if (payload.purpose !== 'mfa') return res.status(401).json({ error: 'bad token' });
    const user = await User.findById(payload.userId).select('+mfaSecret');
    if (!user || !user.mfaEnabled || !user.mfaSecret)
      return res.status(401).json({ error: 'mfa not set up' });
    const { verifySync } = require('otplib');
    const chk = verifySync({ secret: user.mfaSecret, token: String(code || '').trim() });
    if (!chk.valid) return res.status(401).json({ error: 'wrong code' });
    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role }
    });
  } catch (e) {
    res.status(401).json({ error: 'mfa failed' });
  }
});
// GET /api/auth/me -> who am i (backend is the source of truth)
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.userId).select('-passwordHash');
  if (!user) return res.status(404).json({ error: 'user not found' });
  res.json(user);
});
router.patch('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) return res.status(404).json({ error: 'user not found' });
  const { fullName, phone, location } = req.body || {};
  if (typeof fullName === 'string' && fullName.trim()) user.fullName = fullName.trim();
  if (typeof phone === 'string') user.phone = phone.trim();
  if (typeof location === 'string') user.location = location.trim();
  await user.save();
  const out = user.toObject(); delete out.passwordHash; delete out.mfaSecret;
  res.json(out);
});
module.exports = router;
