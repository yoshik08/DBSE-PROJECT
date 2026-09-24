const mongoose = require('mongoose');

const sportSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  icon: String
});

module.exports = mongoose.model('Sport', sportSchema);
