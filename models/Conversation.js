const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderType: {
    type: String,
    enum: ['farmer', 'consumer'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'product_inquiry', 'price_quote', 'order_request'],
    default: 'text'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isRead: {
    type: Boolean,
    default: false
  }
});

const conversationSchema = new mongoose.Schema({
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['farmer', 'consumer'],
      required: true
    },
    name: String,
    email: String,
    lastSeen: {
      type: Date,
      default: Date.now
    }
  }],
  conversationId: {
    type: String,
    unique: true,
    required: true
  },
  topic: {
    type: String,
    default: 'General Inquiry'
  },
  productContext: {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    productName: String,
    category: String,
    priceRange: String
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'archived'],
    default: 'active'
  },
  messages: [messageSchema],
  aiSummary: {
    keyPoints: [String],
    suggestedActions: [String],
    lastUpdated: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
conversationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient querying
conversationSchema.index({ 'participants.user': 1 });
conversationSchema.index({ conversationId: 1 });
conversationSchema.index({ 'productContext.productId': 1 });
conversationSchema.index({ status: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
