const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // Basic, Premium, Fitness
  billingCycle: { type: String, enum: ['monthly', 'quarterly', 'yearly'], default: 'monthly' },
  priceInr: { type: Number, required: true },
  description: String
});

module.exports = mongoose.model('Plan', planSchema);
