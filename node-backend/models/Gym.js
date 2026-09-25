const mongoose = require('mongoose');
const gymSchema = new mongoose.Schema({
  name: { type: String, required: true },
  area: String,          // "Bowenpally"
  address: String,
  lat: Number,           // for the maps embed
  lng: Number,
  mapEmbedUrl: String,     // custom google maps embed set by admin, overrides auto map
  phone: String,
  email: String,       // official contact email
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // gym owner login
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Gym', gymSchema);
