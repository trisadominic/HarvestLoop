const mongoose = require('mongoose');

const consumerSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    fullName: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        default: ''
    },
    phone: {
        type: String,
        default: ''
    },
    deliveryAddress: {
        type: String,
        default: ''
    },
    pincode: {
        type: String,
        default: ''
    },
    interests: [{
        type: String
    }],
    dietaryPreferences: {
        vegetarian: {
            type: Boolean,
            default: false
        },
        vegan: {
            type: Boolean,
            default: false
        },
        organic: {
            type: Boolean,
            default: false
        },
        glutenFree: {
            type: Boolean,
            default: false
        }
    },
    notificationPreferences: {
        email: {
            type: Boolean,
            default: true
        },
        sms: {
            type: Boolean,
            default: false
        },
        deals: {
            type: Boolean,
            default: true
        }
    },
    subscriptionStatus: {
        type: String,
        enum: ['active', 'inactive', 'paused', 'cancelled'],
        default: 'inactive'
    },
    loyaltyPoints: {
        type: Number,
        default: 0
    },
    totalOrders: {
        type: Number,
        default: 0
    },
    lastOrderDate: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    profileImage: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Virtual to populate user data
consumerSchema.virtual('userData', {
    ref: 'User',
    localField: 'userId',
    foreignField: '_id',
    justOne: true
});

// Ensure virtual fields are serialized
consumerSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Consumer', consumerSchema);
