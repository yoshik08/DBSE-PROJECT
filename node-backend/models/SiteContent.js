const mongoose = require('mongoose');
const siteContentSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'main' },
  contactPhone: String,
  contactEmail: String,
  contactAddress: String,
  updatedAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('SiteContent', siteContentSchema);