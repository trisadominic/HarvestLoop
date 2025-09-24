const express = require('express');
const router = express.Router();
const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// AI Support Bot Responses
class SupportAI {
  static generateResponse(category, userRole, message) {
    const responses = {
      technical_issue: {
        farmer: [
          "I understand you're experiencing a technical issue. Let me help you troubleshoot:\n\n1. Try refreshing your browser\n2. Clear browser cache\n3. Check your internet connection\n\nIf the issue persists, our technical team will assist you within 2-4 hours.",
          "Technical issues can be frustrating! I've logged your problem with our tech team. Meanwhile:\n\n• Try using a different browser\n• Ensure JavaScript is enabled\n• Check if the issue occurs on mobile too\n\nExpected response time: 2-4 hours"
        ],
        consumer: [
          "Sorry to hear about the technical difficulty! Let me guide you through some quick fixes:\n\n1. Refresh the page (Ctrl+F5)\n2. Try incognito/private browsing\n3. Disable browser extensions temporarily\n\nOur technical support will follow up within 2-4 hours.",
          "Technical problems can be resolved quickly! I've escalated this to our tech team. Please try:\n\n• Different device/browser\n• Clear cookies and cache\n• Check internet stability\n\nWe'll get back to you within 2-4 hours!"
        ]
      },
      payment_problem: {
        farmer: [
          "Payment issues are our priority! I've forwarded your concern to our finance team. Expected resolution time: 4-8 hours.\n\nFor immediate help:\n• Check your registered bank details\n• Verify payment threshold (₹500 minimum)\n• Review earnings section for pending payments",
          "I understand payment concerns are urgent. Our finance team will review your account within 4-8 hours.\n\nCommon solutions:\n• Payments process every Friday\n• Minimum payout: ₹500\n• Bank details must be verified\n\nWe'll resolve this quickly!"
        ],
        consumer: [
          "Payment issues will be resolved promptly! Our billing team will assist within 4-8 hours.\n\nQuick checks:\n• Verify payment method details\n• Check for pending transactions\n• Review order payment status\n\nWe prioritize payment resolutions!",
          "I've flagged your payment concern as high priority. Expected resolution: 4-8 hours.\n\nMeanwhile:\n• Check payment history section\n• Verify billing information\n• Review recent transaction emails\n\nOur team will contact you soon!"
        ]
      },
      account_help: {
        farmer: [
          "I'll help you with your account! Common farmer account solutions:\n\n• Profile Update: Go to Settings > Profile\n• Product Management: Dashboard > My Products\n• Sales Reports: Dashboard > Analytics\n\nFor complex issues, our team will assist within 1-2 hours.",
          "Account help is available 24/7! For farmers:\n\n• Reset password: Login page > Forgot Password\n• Update bank details: Profile > Payment Info\n• Verification status: Profile > Account Status\n\nPersonalized help coming within 1-2 hours!"
        ],
        consumer: [
          "Account assistance for consumers:\n\n• Order History: Dashboard > My Orders\n• Profile Settings: Menu > Account Settings\n• Preferences: Settings > Notifications\n\nDetailed help will be provided within 1-2 hours.",
          "I'll guide you through account management:\n\n• Password reset available on login page\n• Update delivery address in profile\n• Subscription management in settings\n\nOur team will provide detailed assistance within 1-2 hours!"
        ]
      },
      product_listing: {
        farmer: [
          "Product listing help for farmers:\n\n1. Go to Dashboard > Add Product\n2. Fill all required fields (name, category, price, quantity)\n3. Upload clear product photos\n4. Set availability and location\n5. Click 'Publish'\n\nNeed detailed guidance? Our team will help within 1-2 hours.",
          "Listing products successfully:\n\n• Use high-quality images (multiple angles)\n• Write detailed descriptions\n• Set competitive prices\n• Choose correct categories\n• Enable location services\n\nFor advanced listing strategies, our team will contact you within 1-2 hours."
        ],
        consumer: [
          "For consumers, product browsing help:\n\n• Use search filters effectively\n• Save favorite products\n• Set price alerts\n• Contact farmers directly\n• Leave reviews after purchase\n\nMore personalized shopping tips coming within 1-2 hours!",
          "Optimizing your shopping experience:\n\n• Create wish lists\n• Subscribe to farmers you trust\n• Use advanced search options\n• Check seasonal availability\n• Compare prices across farmers\n\nDetailed guidance available within 1-2 hours!"
        ]
      },
      order_issue: {
        farmer: [
          "Order management help:\n\n• View all orders: Dashboard > Orders\n• Update order status regularly\n• Communicate delivery timeline\n• Handle cancellations professionally\n• Process refunds if needed\n\nComplex order issues will be resolved within 2-4 hours.",
          "Managing orders effectively:\n\n• Confirm orders within 2 hours\n• Update customers on delays\n• Maintain quality standards\n• Follow delivery protocols\n• Keep payment records\n\nOur support team will assist within 2-4 hours for complex cases."
        ],
        consumer: [
          "Order assistance for consumers:\n\n• Track orders: Dashboard > Order Status\n• Contact farmer directly through platform\n• Report delivery issues immediately\n• Leave feedback after delivery\n• Request refunds if needed\n\nOrder disputes will be handled within 2-4 hours.",
          "Resolving your order concerns:\n\n• Check order confirmation emails\n• Use in-app messaging with farmers\n• Report quality issues with photos\n• Track delivery in real-time\n• Contact us for refund processing\n\nPriority resolution within 2-4 hours!"
        ]
      },
      pricing_question: {
        farmer: [
          "Pricing guidance for farmers:\n\n• Research market rates regularly\n• Consider production costs + margin\n• Use our AI price suggester\n• Adjust for quality and seasonality\n• Offer bulk discounts for larger orders\n\nDetailed pricing strategy consultation within 1-2 hours.",
          "Optimizing your pricing:\n\n• Monitor competitor prices\n• Factor in transportation costs\n• Consider demand patterns\n• Maintain profit margins\n• Be flexible for loyal customers\n\nPersonalized pricing advice coming within 1-2 hours!"
        ],
        consumer: [
          "Understanding pricing for consumers:\n\n• Prices vary by season and quality\n• Bulk orders often get discounts\n• Compare multiple farmers\n• Consider delivery costs\n• Build relationships for better rates\n\nMarket insights and tips within 1-2 hours.",
          "Getting the best prices:\n\n• Buy directly from farmers\n• Consider seasonal availability\n• Ask about bulk discounts\n• Build long-term relationships\n• Compare quality vs price\n\nDetailed market analysis coming within 1-2 hours!"
        ]
      },
      general_inquiry: {
        farmer: [
          "Welcome to HarvestLoop support! I'm here to help farmers succeed:\n\n• Platform features and tools\n• Best practices for selling\n• Marketing your products\n• Building customer relationships\n• Maximizing earnings\n\nSpecific guidance within 1-2 hours!",
          "General farmer support available:\n\n• Account optimization tips\n• Seasonal selling strategies\n• Quality maintenance advice\n• Customer service excellence\n• Platform updates and features\n\nComprehensive assistance within 1-2 hours!"
        ],
        consumer: [
          "HarvestLoop consumer support:\n\n• How to find quality products\n• Building farmer relationships\n• Seasonal shopping guides\n• Bulk purchasing benefits\n• Platform features overview\n\nDetailed information coming within 1-2 hours!",
          "Consumer success tips:\n\n• Discover fresh, local produce\n• Seasonal availability guides\n• Building supplier relationships\n• Quality assessment tips\n• Cost-effective shopping strategies\n\nPersonalized guidance within 1-2 hours!"
        ]
      }
    };

    const categoryResponses = responses[category] || responses.general_inquiry;
    const roleResponses = categoryResponses[userRole.toLowerCase()] || categoryResponses.farmer;
    
    return roleResponses[Math.floor(Math.random() * roleResponses.length)];
  }

  static categorizeMessage(message) {
    const text = message.toLowerCase();
    
    if (text.includes('payment') || text.includes('money') || text.includes('refund') || text.includes('billing')) {
      return 'payment_problem';
    }
    if (text.includes('order') || text.includes('delivery') || text.includes('shipping')) {
      return 'order_issue';
    }
    if (text.includes('price') || text.includes('cost') || text.includes('rate') || text.includes('expensive')) {
      return 'pricing_question';
    }
    if (text.includes('product') || text.includes('listing') || text.includes('upload') || text.includes('sell')) {
      return 'product_listing';
    }
    if (text.includes('account') || text.includes('profile') || text.includes('login') || text.includes('password')) {
      return 'account_help';
    }
    if (text.includes('bug') || text.includes('error') || text.includes('not working') || text.includes('technical')) {
      return 'technical_issue';
    }
    
    return 'general_inquiry';
  }

  static generateFollowUp(category) {
    const followUps = {
      payment_problem: "Is there anything specific about the payment issue you'd like me to clarify while we wait for our finance team?",
      technical_issue: "Can you describe exactly what happens when you encounter this technical issue?",
      account_help: "What specific account feature would you like help with?",
      product_listing: "Are you having trouble with a specific step in the listing process?",
      order_issue: "Can you provide your order ID so our team can investigate faster?",
      pricing_question: "What product category are you looking for pricing guidance on?",
      general_inquiry: "Is there a specific area of the platform you'd like to know more about?"
    };
    
    return followUps[category] || "Is there anything else I can help clarify for you?";
  }
}

// Create new support ticket
router.post('/tickets', authenticateToken, async (req, res) => {
  try {
    const { subject, message, category } = req.body;
    const user = req.user;

    // Auto-categorize if not provided
    const detectedCategory = category || SupportAI.categorizeMessage(message);
    
    const ticket = new SupportTicket({
      user: user._id,
      userDetails: {
        name: user.username,
        email: user.email,
        role: user.role
      },
      category: detectedCategory,
      subject: subject || `${detectedCategory.replace('_', ' ')} - ${user.role}`,
      messages: [{
        sender: 'user',
        senderName: user.username,
        content: message,
        timestamp: new Date()
      }]
    });

    await ticket.save();

    // Generate AI response
    const aiResponse = SupportAI.generateResponse(detectedCategory, user.role, message);
    const followUp = SupportAI.generateFollowUp(detectedCategory);

    ticket.messages.push({
      sender: 'ai',
      senderName: 'HarvestLoop AI Support',
      content: `${aiResponse}\n\n${followUp}`,
      timestamp: new Date()
    });

    await ticket.save();

    res.json({
      success: true,
      ticketId: ticket.ticketId,
      ticket: {
        id: ticket._id,
        ticketId: ticket.ticketId,
        category: ticket.category,
        status: ticket.status,
        subject: ticket.subject,
        messages: ticket.messages
      }
    });

  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
});

// Get user's support tickets
router.get('/tickets', authenticateToken, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(20);

    const formattedTickets = tickets.map(ticket => ({
      id: ticket._id,
      ticketId: ticket.ticketId,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      subject: ticket.subject,
      lastMessage: ticket.messages.length > 0 ? 
        ticket.messages[ticket.messages.length - 1] : null,
      unreadCount: ticket.messages.filter(msg => 
        msg.sender !== 'user' && !msg.isRead
      ).length,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt
    }));

    res.json(formattedTickets);

  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Get specific ticket with messages
router.get('/tickets/:ticketId', authenticateToken, async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({
      $or: [
        { _id: req.params.ticketId },
        { ticketId: req.params.ticketId }
      ],
      user: req.user._id
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Mark messages as read
    ticket.messages.forEach(msg => {
      if (msg.sender !== 'user') {
        msg.isRead = true;
      }
    });

    await ticket.save();

    res.json({
      id: ticket._id,
      ticketId: ticket.ticketId,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      subject: ticket.subject,
      messages: ticket.messages,
      assignedTo: ticket.assignedTo,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt
    });

  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// Add message to existing ticket
router.post('/tickets/:ticketId/messages', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const ticketId = req.params.ticketId;

    const ticket = await SupportTicket.findOne({
      $or: [
        { _id: ticketId },
        { ticketId: ticketId }
      ],
      user: req.user._id
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Add user message
    ticket.messages.push({
      sender: 'user',
      senderName: req.user.username,
      content: message,
      timestamp: new Date()
    });

    // Update ticket status if it was resolved
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      ticket.status = 'open';
    }

    await ticket.save();

    // Generate AI response for continued conversation
    const aiResponse = SupportAI.generateResponse(ticket.category, req.user.role, message);
    
    ticket.messages.push({
      sender: 'ai',
      senderName: 'HarvestLoop AI Support',
      content: `Thank you for the additional information. ${aiResponse}`,
      timestamp: new Date()
    });

    await ticket.save();

    res.json({
      success: true,
      ticketId: ticket.ticketId,
      message: ticket.messages[ticket.messages.length - 2] // Return user message
    });

  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// Close ticket
router.patch('/ticket/:ticketId/close', authenticateToken, async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({
      ticketId: req.params.ticketId,
      user: req.user._id
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    ticket.status = 'closed';
    ticket.resolvedAt = new Date();

    // Add closing message
    ticket.messages.push({
      sender: 'ai',
      senderName: 'HarvestLoop AI Support',
      content: 'Thank you for using HarvestLoop support! This ticket has been closed. Feel free to create a new ticket if you need further assistance.',
      timestamp: new Date()
    });

    await ticket.save();

    res.json({ success: true, message: 'Ticket closed successfully' });

  } catch (error) {
    console.error('Error closing ticket:', error);
    res.status(500).json({ error: 'Failed to close ticket' });
  }
});

// Quick support chat (without creating ticket)
router.post('/quick-chat', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const user = req.user;

    const category = SupportAI.categorizeMessage(message);
    const response = SupportAI.generateResponse(category, user.role, message);

    res.json({
      success: true,
      response,
      category,
      followUp: SupportAI.generateFollowUp(category)
    });

  } catch (error) {
    console.error('Error in quick chat:', error);
    res.status(500).json({ error: 'Failed to process chat' });
  }
});

module.exports = router;
