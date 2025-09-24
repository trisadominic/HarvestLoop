const Notification = require('../models/Notification');
const User = require('../models/User');

const notificationService = {
    async createNotification(type, message, userId = null) {
        try {
            const notification = new Notification({
                userId: userId,
                type: type,
                message: message,
                status: 'unread'
            });
            await notification.save();
            return notification;
        } catch (error) {
            console.error('Notification creation failed:', error);
            throw error;
        }
    },

    async getNotifications(userId) {
        return await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(50);
    }
};

module.exports = notificationService;