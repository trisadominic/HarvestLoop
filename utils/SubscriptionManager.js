const Subscription = require('../models/Subscription');
const { createNotification } = require('../routes/notifications');

class SubscriptionManager {
    // Check if user has active subscription
    static async hasActiveSubscription(userId) {
        const subscription = await Subscription.findOne({
            userId,
            status: 'active',
            endDate: { $gt: new Date() }
        });
        return !!subscription;
    }

    // Get user's subscription details
    static async getSubscriptionDetails(userId) {
        return await Subscription.findOne({
            userId,
            status: 'active',
            endDate: { $gt: new Date() }
        });
    }

    // Check if user has enough points
    static async hasEnoughPoints(userId, pointsNeeded = 1) {
        const subscription = await this.getSubscriptionDetails(userId);
        return subscription && subscription.points >= pointsNeeded;
    }

    // Deduct points from subscription
    static async deductPoints(userId, points = 1, reason = '') {
        const subscription = await this.getSubscriptionDetails(userId);
        
        if (!subscription) {
            throw new Error('No active subscription found');
        }

        if (subscription.points < points) {
            throw new Error('Insufficient points');
        }

        subscription.points -= points;
        await subscription.save();

        // Notify user if points are low
        if (subscription.points <= 2) {
            await createNotification(
                userId,
                `You have ${subscription.points} points remaining in your subscription.`,
                'subscription_low_points'
            );
        }

        return subscription;
    }

    // Add farmer to unlocked list
    static async unlockFarmer(subscriptionId, farmerId) {
        const subscription = await Subscription.findById(subscriptionId);
        
        if (!subscription) {
            throw new Error('Subscription not found');
        }

        // Check if farmer is already unlocked
        const alreadyUnlocked = subscription.unlockedFarmers.some(
            f => f.farmerId.toString() === farmerId.toString()
        );

        if (!alreadyUnlocked) {
            subscription.unlockedFarmers.push({
                farmerId,
                unlockedAt: new Date()
            });
            await subscription.save();
        }

        return subscription;
    }

    // Check if farmer is unlocked for user
    static async isFarmerUnlocked(userId, farmerId) {
        const subscription = await this.getSubscriptionDetails(userId);
        
        if (!subscription) {
            return false;
        }

        return subscription.unlockedFarmers.some(
            f => f.farmerId.toString() === farmerId.toString()
        );
    }

    // Handle subscription expiry (should be run by a cron job)
    static async handleExpiredSubscriptions() {
        const expiredSubscriptions = await Subscription.find({
            status: 'active',
            endDate: { $lte: new Date() }
        });

        for (const subscription of expiredSubscriptions) {
            subscription.status = 'expired';
            await subscription.save();

            await createNotification(
                subscription.userId,
                'Your subscription has expired. Renew now to continue accessing farmer details.',
                'subscription_expired'
            );
        }
    }
}

module.exports = SubscriptionManager;
