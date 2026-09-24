const mongoose = require('mongoose');

const programSchema = new mongoose.Schema({
  sportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sport' }, // null for general gym training
  name: { type: String, required: true },
  location: String,
  day: String,        // "Monday"
  startTime: String,   // "18:00"
  endTime: String,     // "20:00"
  capacity: Number,
  coach: String,       // coach name
  priceInr: Number,    // individual fee
  pricePer: { type: String, default: '/month' },
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym' } // owning venue
});

module.exports = mongoose.model('Program', programSchema);
