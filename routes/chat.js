const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Product = require('../models/Product');
const { authenticateToken } = require('../middleware/auth');

// Create or join conversation
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { participantEmail, topic, productContext } = req.body;
    const currentUser = req.user;

    // Find the other participant
    const otherUser = await User.findOne({ email: participantEmail });
    if (!otherUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ensure users have different roles
    if (currentUser.role === otherUser.role) {
      return res.status(400).json({ error: 'Cannot start conversation with same role' });
    }

    // Generate unique conversation ID
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create conversation
    const conversation = new Conversation({
      conversationId,
      participants: [
        {
          user: currentUser._id,
          role: currentUser.role.toLowerCase(),
          name: currentUser.username,
          email: currentUser.email
        },
        {
          user: otherUser._id,
          role: otherUser.role.toLowerCase(),
          name: otherUser.username,
          email: otherUser.email
        }
      ],
      topic: topic || 'General Inquiry',
      productContext: productContext || {},
      messages: []
    });

    await conversation.save();

    res.json({
      success: true,
      conversationId,
      conversation: {
        id: conversation._id,
        conversationId,
        participants: conversation.participants,
        topic: conversation.topic,
        productContext: conversation.productContext
      }
    });

  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

// Get user conversations
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      'participants.user': req.user._id,
      status: { $ne: 'archived' }
    })
    .populate('participants.user', 'username email role')
    .sort({ updatedAt: -1 })
    .limit(20);

    const formattedConversations = conversations.map(conv => ({
      id: conv._id,
      conversationId: conv.conversationId,
      topic: conv.topic,
      status: conv.status,
      participants: conv.participants,
      lastMessage: conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null,
      unreadCount: conv.messages.filter(msg => 
        msg.sender.toString() !== req.user._id.toString() && !msg.isRead
      ).length,
      updatedAt: conv.updatedAt
    }));

    res.json(formattedConversations);

  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get specific conversation with messages
router.get('/conversation/:conversationId', authenticateToken, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      conversationId: req.params.conversationId,
      'participants.user': req.user._id
    }).populate('participants.user', 'username email role');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Mark messages as read
    conversation.messages.forEach(msg => {
      if (msg.sender.toString() !== req.user._id.toString()) {
        msg.isRead = true;
      }
    });

    await conversation.save();

    res.json({
      id: conversation._id,
      conversationId: conversation.conversationId,
      topic: conversation.topic,
      status: conversation.status,
      participants: conversation.participants,
      productContext: conversation.productContext,
      messages: conversation.messages,
      aiSummary: conversation.aiSummary
    });

  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Send message
router.post('/conversation/:conversationId/message', authenticateToken, async (req, res) => {
  try {
    const { content, messageType } = req.body;
    const conversationId = req.params.conversationId;

    const conversation = await Conversation.findOne({
      conversationId,
      'participants.user': req.user._id
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Add user message
    const userMessage = {
      sender: req.user._id,
      senderType: req.user.role.toLowerCase(),
      content,
      messageType: messageType || 'text',
      timestamp: new Date()
    };

    conversation.messages.push(userMessage);

    await conversation.save();

    res.json({
      success: true,
      message: userMessage,
      conversationId
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Find users to start conversation with
router.get('/find-users', authenticateToken, async (req, res) => {
  try {
    const { role, search } = req.query;
    const currentUser = req.user;

    // Find users with opposite role
    const oppositeRole = currentUser.role === 'Farmer' ? 'Consumer' : 'Farmer';
    const targetRole = role || oppositeRole;

    let query = { 
      role: targetRole, 
      _id: { $ne: currentUser._id } 
    };

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('username email role')
      .limit(10);

    res.json(users);

  } catch (error) {
    console.error('Error finding users:', error);
    res.status(500).json({ error: 'Failed to find users' });
  }
});

// Archive conversation
router.patch('/conversation/:conversationId/archive', authenticateToken, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      conversationId: req.params.conversationId,
      'participants.user': req.user._id
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    conversation.status = 'archived';
    await conversation.save();

    res.json({ success: true, message: 'Conversation archived' });

  } catch (error) {
    console.error('Error archiving conversation:', error);
    res.status(500).json({ error: 'Failed to archive conversation' });
  }
});

module.exports = router;
