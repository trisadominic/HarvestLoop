const express = require('express');
const router = express.Router();
const Consumer = require('../models/Consumer');
const User = require('../models/User');
const Order = require('../models/Order');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Multer configuration for profile image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'consumer-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Get consumer profile
router.get('/profile/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log('🛒 Fetching consumer profile for user:', userId);

        // First try to find existing consumer profile
        let consumer = await Consumer.findOne({ userId }).populate('userId', 'username email phone createdAt');
        
        if (!consumer) {
            console.log('👤 No consumer profile found, creating new one...');
            
            // Get user data first
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Create new consumer profile with basic data from user
            consumer = new Consumer({
                userId: userId,
                fullName: user.username || '', // Use username as fallback for fullName
                email: user.email || '',
                phone: user.phone || '',
                isActive: true
            });
            
            await consumer.save();
            await consumer.populate('userId', 'username email phone createdAt');
            console.log('✅ Created new consumer profile:', consumer._id);
        }

        // Get order statistics (include deals that were purchased)
        const mongoose = require('mongoose');
        const userObjectId = new mongoose.Types.ObjectId(consumer.userId._id);
        
        const orderStats = await Order.aggregate([
            { $match: { consumerId: userObjectId } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    lastOrderDate: { $max: '$createdAt' }
                }
            }
        ]);

        // Also count completed deals as orders
        const Deal = require('../models/Deal');
        const dealStats = await Deal.aggregate([
            { $match: { consumerId: userObjectId, status: 'purchased' } },
            {
                $group: {
                    _id: null,
                    totalDeals: { $sum: 1 },
                    lastDealDate: { $max: '$createdAt' }
                }
            }
        ]);

        // Get subscription data
        const Subscription = require('../models/Subscription');
        const subscription = await Subscription.findOne({ 
            userId: consumer.userId._id,
            status: 'active'
        }).sort({ createdAt: -1 });

        const totalOrders = (orderStats[0]?.totalOrders || 0) + (dealStats[0]?.totalDeals || 0);

        // Prepare response data with user, order, and subscription info
        const consumerData = {
            ...consumer.toObject(),
            username: consumer.userId.username,
            // Use consumer.fullName if available, otherwise fall back to username
            fullName: consumer.fullName || consumer.userId.username || '',
            // Use consumer.email if available, otherwise fall back to user.email  
            email: consumer.email || consumer.userId.email || '',
            // Use consumer.phone if available, otherwise fall back to user.phone
            phone: consumer.phone || consumer.userId.phone || '',
            createdAt: consumer.userId.createdAt,
            totalOrders: totalOrders,
            lastOrderDate: orderStats[0]?.lastOrderDate || dealStats[0]?.lastDealDate || null,
            // Subscription data
            subscriptionStatus: subscription ? subscription.status : 'inactive',
            subscriptionPoints: subscription ? subscription.points : 0,
            subscriptionPlan: subscription ? subscription.planType : null,
            subscriptionExpiresAt: subscription ? subscription.expiresAt : null
        };

        console.log('🔍 Debug info:', {
            userObjectId: userObjectId.toString(),
            orderStatsResult: orderStats,
            dealStatsResult: dealStats,
            totalOrders: totalOrders
        });

        console.log('✅ Returning consumer data:', {
            id: consumerData._id,
            username: consumerData.username,
            fullName: consumerData.fullName,
            email: consumerData.email,
            phone: consumerData.phone,
            deliveryAddress: consumerData.deliveryAddress,
            totalOrders: consumerData.totalOrders,
            subscriptionStatus: consumerData.subscriptionStatus,
            subscriptionPoints: consumerData.subscriptionPoints
        });

        res.json(consumerData);
    } catch (error) {
        console.error('❌ Error fetching consumer profile:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update consumer profile
router.put('/profile/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const updateData = req.body;
        
        console.log('💾 Updating consumer profile for user:', userId);
        console.log('📝 Update data:', updateData);

        // Find existing consumer or create new one
        let consumer = await Consumer.findOne({ userId });
        
        if (!consumer) {
            console.log('👤 Creating new consumer profile during update...');
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            consumer = new Consumer({
                userId: userId,
                fullName: updateData.fullName || user.username || '',
                email: updateData.email || user.email || '',
                phone: updateData.phone || user.phone || '',
                ...updateData
            });
        } else {
            // Update existing consumer
            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined) {
                    consumer[key] = updateData[key];
                }
            });
        }

        await consumer.save();
        await consumer.populate('userId', 'username email phone createdAt');

        console.log('✅ Consumer profile updated successfully');

        // Return updated data with user info
        const responseData = {
            ...consumer.toObject(),
            username: consumer.userId.username,
            fullName: consumer.fullName || consumer.userId.username || '',
            email: consumer.email || consumer.userId.email || '',
            phone: consumer.phone || consumer.userId.phone || '',
            createdAt: consumer.userId.createdAt
        };

        res.json(responseData);
    } catch (error) {
        console.error('❌ Error updating consumer profile:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Upload profile image
router.post('/profile/:userId/image', authenticateToken, upload.single('profileImage'), async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }

        console.log('📸 Uploading profile image for consumer:', userId);

        let consumer = await Consumer.findOne({ userId });
        if (!consumer) {
            return res.status(404).json({ message: 'Consumer profile not found' });
        }

        // Update profile image path
        consumer.profileImage = `/uploads/${req.file.filename}`;
        await consumer.save();

        console.log('✅ Profile image uploaded:', consumer.profileImage);

        res.json({
            message: 'Profile image uploaded successfully',
            profileImage: consumer.profileImage
        });
    } catch (error) {
        console.error('❌ Error uploading profile image:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get consumer dashboard stats
router.get('/dashboard/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log('📊 Fetching consumer dashboard stats for user:', userId);

        // Get consumer data
        const consumer = await Consumer.findOne({ userId }).populate('userId', 'username');
        if (!consumer) {
            return res.status(404).json({ message: 'Consumer profile not found' });
        }

        // Get order statistics
        const orderStats = await Order.aggregate([
            { $match: { userId: consumer.userId._id } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalSpent: { $sum: '$totalAmount' },
                    lastOrderDate: { $max: '$createdAt' }
                }
            }
        ]);

        // Get recent orders
        const recentOrders = await Order.find({ userId: consumer.userId._id })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('items.productId', 'name price');

        const stats = {
            totalOrders: orderStats[0]?.totalOrders || 0,
            totalSpent: orderStats[0]?.totalSpent || 0,
            lastOrderDate: orderStats[0]?.lastOrderDate || null,
            loyaltyPoints: consumer.loyaltyPoints || 0,
            subscriptionStatus: consumer.subscriptionStatus || 'inactive',
            recentOrders: recentOrders
        };

        console.log('✅ Dashboard stats:', stats);

        res.json(stats);
    } catch (error) {
        console.error('❌ Error fetching consumer dashboard stats:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update consumer preferences
router.put('/preferences/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { interests, dietaryPreferences, notificationPreferences } = req.body;
        
        console.log('⚙️ Updating consumer preferences for user:', userId);

        const consumer = await Consumer.findOne({ userId });
        if (!consumer) {
            return res.status(404).json({ message: 'Consumer profile not found' });
        }

        // Update preferences
        if (interests !== undefined) consumer.interests = interests;
        if (dietaryPreferences !== undefined) consumer.dietaryPreferences = dietaryPreferences;
        if (notificationPreferences !== undefined) consumer.notificationPreferences = notificationPreferences;

        await consumer.save();

        console.log('✅ Consumer preferences updated');

        res.json({
            message: 'Preferences updated successfully',
            interests: consumer.interests,
            dietaryPreferences: consumer.dietaryPreferences,
            notificationPreferences: consumer.notificationPreferences
        });
    } catch (error) {
        console.error('❌ Error updating consumer preferences:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add loyalty points
router.post('/loyalty/:userId/add', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { points, reason } = req.body;
        
        if (!points || points <= 0) {
            return res.status(400).json({ message: 'Valid points amount required' });
        }

        console.log(`🎯 Adding ${points} loyalty points for consumer:`, userId);

        const consumer = await Consumer.findOne({ userId });
        if (!consumer) {
            return res.status(404).json({ message: 'Consumer profile not found' });
        }

        consumer.loyaltyPoints = (consumer.loyaltyPoints || 0) + points;
        await consumer.save();

        console.log('✅ Loyalty points added. New total:', consumer.loyaltyPoints);

        res.json({
            message: 'Loyalty points added successfully',
            totalPoints: consumer.loyaltyPoints,
            addedPoints: points,
            reason: reason || 'Points added'
        });
    } catch (error) {
        console.error('❌ Error adding loyalty points:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
