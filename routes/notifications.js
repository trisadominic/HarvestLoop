const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authenticateToken } = require('../middleware/auth');

// Get user's notifications
router.get('/', authenticateToken, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .populate('relatedOrder')
            .limit(50);
        
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        const notification = await Notification.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        notification.read = true;
        await notification.save();
        
        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create notification (internal use)
async function createNotification(userId, message, type, relatedOrder = null) {
    try {
        const notification = new Notification({
            userId,
            message,
            type,
            relatedOrder,
            read: false
        });

        await notification.save();
        
        // In a real app, emit socket event here for real-time updates
        // io.to(userId).emit('notification', notification);
        
        return notification;
    } catch (error) {
        console.error('Notification creation failed:', error);
    }
}

module.exports = {
    router,
    createNotification
};
