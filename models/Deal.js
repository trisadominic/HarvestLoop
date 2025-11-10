const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductPrice', required: true },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    consumerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quantity: { type: Number, required: true },
    proposedPrice: { type: Number, required: true },
    originalPrice: { type: Number, required: true }, // Store original list price
    message: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'accepted', 'declined', 'purchased', 'cancelled', 'expired'], default: 'pending' },
    expiresAt: { type: Date, required: true }, // 5 days from creation
    farmerResponseAt: { type: Date }, // When farmer responded
    consumerResponseAt: { type: Date }, // When consumer responded
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

dealSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Deal', dealSchema);
