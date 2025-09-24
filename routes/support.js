const express = require('express');
const router = express.Router();
const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// Create new support ticket
router.post('/tickets', authenticateToken, async (req, res) => {
  try {
    const { category, subject, message } = req.body;
    const user = req.user;

    const ticket = new SupportTicket({
      user: user._id,
      userRole: user.role,
      category,
      subject,
      messages: [{
        sender: user._id,
        senderRole: user.role,
        content: message,
        timestamp: new Date()
      }],
      priority: category === 'payment_problem' || category === 'technical_issue' ? 'high' : 'medium',
      status: 'open'
    });

    await ticket.save();
    
    res.json({
      success: true,
      ticket: ticket,
      message: 'Support ticket created successfully. Our team will respond within 24 hours.'
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
      .sort({ createdAt: -1 })
      .populate('user', 'username email role');

    res.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Get specific ticket
router.get('/tickets/:ticketId', authenticateToken, async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({
      _id: req.params.ticketId,
      user: req.user._id
    }).populate('user', 'username email role');

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// Add message to ticket
router.post('/tickets/:ticketId/messages', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const user = req.user;

    const ticket = await SupportTicket.findOne({
      _id: req.params.ticketId,
      user: user._id
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const newMessage = {
      sender: user._id,
      senderRole: user.role,
      content: message,
      timestamp: new Date()
    };

    ticket.messages.push(newMessage);
    ticket.status = 'open'; // Reopen if it was closed
    await ticket.save();

    res.json({
      success: true,
      message: newMessage
    });

  } catch (error) {
    console.error('Error adding message to ticket:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// Close ticket
router.patch('/tickets/:ticketId/close', authenticateToken, async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({
      _id: req.params.ticketId,
      user: req.user._id
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    ticket.status = 'closed';
    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket closed successfully'
    });

  } catch (error) {
    console.error('Error closing ticket:', error);
    res.status(500).json({ error: 'Failed to close ticket' });
  }
});

module.exports = router;