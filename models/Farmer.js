const mongoose = require('mongoose');

const farmerSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true 
  },
  
  // Farm Information
  farmName: { 
    type: String, 
    required: true,
    trim: true 
  },
  farmDescription: { 
    type: String, 
    default: '' 
  },
  farmAddress: { 
    type: String, 
    default: '' 
  },
  pincode: { 
    type: String, 
    default: '' 
  },
  farmSize: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  farmProducts: [String], // Legacy field - keeping for backward compatibility
  productTypes: [String], // New product types array
  
  // Personal Information
  fullName: { 
    type: String, 
    required: true,
    trim: true 
  },
  mobile: { 
    type: String, 
    default: '' 
  },
  email: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true 
  },
  experience: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  
  // Profile and Verification
  profileImage: { 
    type: String, 
    default: '' 
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  
  // Statistics
  totalProducts: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  totalSales: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  rating: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 5 
  },
  reviewCount: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  
  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Update the updatedAt field before saving
farmerSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for better performance
farmerSchema.index({ userId: 1 });
farmerSchema.index({ farmName: 'text', farmDescription: 'text' });
farmerSchema.index({ productTypes: 1 });
farmerSchema.index({ isVerified: 1 });

module.exports = mongoose.model('Farmer', farmerSchema);
