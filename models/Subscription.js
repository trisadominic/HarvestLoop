const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan: { type: String, enum: ['basic', 'premium', 'unlimited'], required: true },
  points: { type: Number, default: 0 }, // Current points balance
  totalPoints: { type: Number, default: 0 }, // Total points allocated for this subscription
  unlockedFarmers: [{ 
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, // Track associated order
    unlockedAt: { type: Date, default: Date.now }
  }],
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
  paymentInfo: {
    amount: { type: Number, required: true },
    txid: String,
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' }
  }
});

// Ensure endDate is always after startDate
subscriptionSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    next(new Error('End date must be after start date'));
  }
  next();
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
