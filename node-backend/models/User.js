const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true }, // bcrypt, or "OAUTH_ONLY"
  phone: String,
  location: String,
  role: { type: String, enum: ['athlete', 'admin', 'gym'], default: 'athlete' },
  googleSub: { type: String, unique: true, sparse: true }, // permanent google link
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
