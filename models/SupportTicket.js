const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userDetails: {
    name: String,
    email: String,
    role: {
      type: String,
      enum: ['Farmer', 'Consumer']
    }
  },
  category: {
    type: String,
    enum: [
      'technical_issue',
      'payment_problem',
      'account_help',
      'product_listing',
      'order_issue',
      'pricing_question',
      'general_inquiry',
      'complaint',
      'suggestion'
    ],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'waiting_response', 'resolved', 'closed'],
    default: 'open'
  },
  subject: {
    type: String,
    required: true
  },
  messages: [{
    sender: {
      type: String,
      enum: ['user', 'support'],
      required: true
    },
    senderName: String,
    content: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    }
  }],
  assignedTo: {
    type: String, // Support agent name
    default: null
  },
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: Date
});

// Update the updatedAt field before saving
supportTicketSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate ticket ID
supportTicketSchema.pre('save', function(next) {
  if (!this.ticketId) {
    const prefix = this.userDetails.role === 'Farmer' ? 'F' : 'C';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.ticketId = `${prefix}-${timestamp}-${random}`;
  }
  next();
});

// Index for efficient querying
supportTicketSchema.index({ user: 1 });
supportTicketSchema.index({ ticketId: 1 });
supportTicketSchema.index({ status: 1, priority: -1 });
supportTicketSchema.index({ category: 1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
