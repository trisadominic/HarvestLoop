const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    category: { type: String, enum: ['Fruits', 'Vegetables', 'Grains', 'Dairy', 'Eggs', 'Coffee'], required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String },
    unlockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // List of consumers who have unlocked this farmer's details
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
