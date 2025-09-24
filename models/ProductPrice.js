const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    farmerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Fruits', 'Vegetables', 'Grains', 'Dairy', 'Eggs', 'Coffee']
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    unit: {
        type: String,
        enum: ['kg', 'g', 'piece', 'dozen', 'liter', 'ml', 'box', 'pack'],
        required: true,
        default: 'kg'
    },
    description: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String
    },
    location: {
        type: String,
        required: false, // Made optional
        default: 'Not specified'
    },
    active: {
        type: Boolean,
        default: true
    },
    organic: {
        type: Boolean,
        default: false
    },
    harvestDate: {
        type: Date
    },
    expiryDate: {
        type: Date
    }
}, {
    timestamps: true
});

// Pre-save hook to handle backward compatibility with stockUnit
productSchema.pre('save', function(next) {
    // If stockUnit is provided but unit is not, use stockUnit as unit
    if (this.stockUnit && !this.unit) {
        this.unit = this.stockUnit;
    }
    next();
});

// Virtual field for backward compatibility
productSchema.virtual('stockUnit').get(function() {
    return this.unit;
});

// Ensure virtual fields are included in JSON output
productSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.models.ProductPrice || mongoose.model('ProductPrice', productSchema);