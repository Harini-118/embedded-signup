// server/models/Customer.js
const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  businessName: String,
  email: String,
  wabaId: {
    type: String,
    required: true,
    unique: true
  },
  phoneNumberId: {
    type: String,
    required: true
  },
  businessPhoneNumber: String,
  businessToken: String,
  businessPortfolioId: String,
  onboardingStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  paymentMethodAdded: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Customer', customerSchema);