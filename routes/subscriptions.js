const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const ProductPrice = require('../models/ProductPrice');
const User = require('../models/User');
const Order = require('../models/Order');
const { authenticateToken } = require('../middleware/auth');

// Get subscription plans (static data)
router.get('/plans', (req, res) => {
    const plans = {
        basic: {
            name: 'Basic',
            points: 10,
            price: 999,
            duration: 30 // days
        },
        premium: {
            name: 'Premium',
            points: 25,
            price: 1999,
            duration: 30
        },
        unlimited: {
            name: 'Unlimited',
            points: 100,
            price: 4999,
            duration: 30
        }
    };
    res.json(plans);
});

// Purchase subscription
router.post('/purchase', authenticateToken, async (req, res) => {
    try {
        // Convert plan name to lowercase to match enum
        const planName = req.body.plan.toLowerCase();
        const plans = {
            basic: { points: 10, price: 199, duration: 30 }, // 1 month
            premium: { points: 25, price: 399, duration: 90 }, // 3 months
            unlimited: { points: 100, price: 999, duration: 365 } // 12 months
        };

        if (!plans[planName]) {
            return res.status(400).json({ message: 'Invalid plan' });
        }

        // Check for active subscription
        const activeSubscription = await Subscription.findOne({
            userId: req.user.id,
            status: 'active',
            endDate: { $gt: new Date() }
        });

        if (activeSubscription) {
            return res.status(400).json({ message: 'You already have an active subscription' });
        }

        const selectedPlan = plans[planName];
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + selectedPlan.duration);

        const subscription = new Subscription({
            userId: req.user.id,
            plan: planName, // Using lowercase plan name to match enum
            points: selectedPlan.points,
            totalPoints: selectedPlan.points,
            startDate: startDate,
            endDate: endDate,
            paymentInfo: {
                amount: selectedPlan.price,
                status: 'completed', // In real app, this would be handled by payment gateway
                txid: 'MOCK_' + Date.now() // Mock transaction ID
            }
        });

        await subscription.save();
        res.status(201).json(subscription);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user's current subscription
router.get('/my-subscription', authenticateToken, async (req, res) => {
    try {
        const subscription = await Subscription.findOne({
            userId: req.user.id,
            status: 'active',
            endDate: { $gt: new Date() }
        });
        res.json(subscription || { message: 'No active subscription found' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user's subscription details for manage subscription page
router.get('/manage-details', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const subscription = await Subscription.findOne({
            userId: req.user.id,
            status: 'active',
            endDate: { $gt: new Date() }
        });

        if (!subscription) {
            return res.json({
                user: {
                    name: user.username,
                    email: user.email
                },
                subscription: null,
                message: 'No active subscription found'
            });
        }

        // Map plan names to match your frontend
        const planMapping = {
            'basic': 'basic',
            'premium': 'premium', 
            'unlimited': 'vip'
        };

        const planDetails = {
            basic: {
                name: 'Basic',
                price: 199,
                duration: '1 Month',
                description: 'Ideal for getting started and exploring the platform.',
                farmers: 10,
                features: [
                    '10 Product Listings',
                    'Basic Support',
                    'Email Alerts'
                ]
            },
            premium: {
                name: 'Premium',
                price: 399,
                duration: '3 Months',
                description: 'Perfect for growing businesses looking for more features.',
                farmers: 30,
                features: [
                    '30 Product Listings',
                    'Priority Support',
                    'Email & SMS Alerts',
                    'Early Access to Farmers'
                ]
            },
            vip: {
                name: 'VIP',
                price: 999,
                duration: '12 Months',
                description: 'The ultimate package for established businesses.',
                farmers: 100,
                features: [
                    'Unlimited Listings',
                    '24/7 Support',
                    'Direct Chat with Farmers',
                    'Premium Badge'
                ]
            }
        };

        const frontendPlan = planMapping[subscription.plan] || subscription.plan;
        const farmersUsed = subscription.unlockedFarmers.length;
        const totalFarmers = subscription.totalPoints;
        const remainingPoints = subscription.points; // Current points balance (remaining/unused)
        const usedPoints = totalFarmers - remainingPoints; // Calculate used points

        res.json({
            user: {
                name: user.username,
                email: user.email
            },
            subscription: {
                plan: frontendPlan,
                farmersUsed: farmersUsed,
                usedPoints: usedPoints, // Points used
                remainingPoints: remainingPoints, // Points remaining 
                totalFarmers: totalFarmers,
                nextBillDate: subscription.endDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                isActive: subscription.status === 'active',
                startDate: subscription.startDate,
                endDate: subscription.endDate,
                paymentAmount: subscription.paymentInfo.amount
            },
            planDetails: planDetails
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user's billing history
router.get('/billing-history', authenticateToken, async (req, res) => {
    try {
        const subscriptions = await Subscription.find({
            userId: req.user.id,
            'paymentInfo.status': 'completed'
        }).sort({ startDate: -1 });

        const billingHistory = subscriptions.map(sub => ({
            id: sub._id,
            date: sub.startDate.toISOString().split('T')[0],
            plan: sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1),
            amount: sub.paymentInfo.amount,
            txid: sub.paymentInfo.txid,
            status: sub.paymentInfo.status,
            duration: getDurationText(sub.plan),
            startDate: sub.startDate,
            endDate: sub.endDate
        }));

        res.json(billingHistory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

function getDurationText(plan) {
    const durations = {
        'basic': '1 month',
        'premium': '3 months', 
        'unlimited': '12 months'
    };
    return durations[plan] || 'Unknown';
}

// Unlock farmer details for a product
router.post('/unlock-farmer/:productId', authenticateToken, async (req, res) => {
    try {
        const { quantity = 1 } = req.body; // Get quantity from request body
        
        const subscription = await Subscription.findOne({
            userId: req.user.id,
            status: 'active',
            endDate: { $gt: new Date() }
        });

        if (!subscription) {
            return res.status(403).json({ message: 'Active subscription required' });
        }

        if (subscription.points <= 0) {
            return res.status(403).json({ message: 'No points remaining' });
        }

        const product = await ProductPrice.findById(req.params.productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if requested quantity is available
        if (parseInt(quantity) > product.quantity) {
            return res.status(400).json({ 
                message: `Only ${product.quantity} ${product.stockUnit || 'units'} available. Please reduce your quantity.` 
            });
        }

        // Check if farmer is already unlocked for this product
        const alreadyUnlocked = subscription.unlockedFarmers.some(
            f => f.farmerId.toString() === product.farmerId.toString()
        );

        // Create an accepted order (automatically accepted)
        const order = new Order({
            consumerId: req.user.id,
            farmerId: product.farmerId,
            productId: product._id,
            quantity: parseInt(quantity),
            price: product.price * parseInt(quantity), // Total price for the order
            status: 'purchased', // Automatically accepted
            paymentStatus: 'pending'
        });

        await order.save();

        // Update product inventory - REDUCE QUANTITY
        product.quantity -= parseInt(quantity);
        
        // If quantity becomes 0 or negative, mark as inactive
        if (product.quantity <= 0) {
            product.quantity = 0;
            product.active = false;
            console.log(`🚫 Product ${product.product_name || product.name} is now out of stock and marked inactive`);
        } else {
            console.log(`📦 Product ${product.product_name || product.name} quantity reduced to ${product.quantity}`);
        }
        
        await product.save();

        // Create notification for farmer about the new accepted order
        const Notification = require('../models/Notification');
        const consumer = await User.findById(req.user.id).select('username');
        
        const notification = new Notification({
            userId: product.farmerId,
            type: 'orderAccepted',
            message: `${consumer.username} has placed an order for ${product.product_name || product.name} (Qty: ${quantity})`,
            relatedOrder: order._id,
            read: false
        });
        
        await notification.save();

        // Deduct subscription point
        subscription.points--;

        // Add farmer to unlocked farmers if not already unlocked
        if (!alreadyUnlocked) {
            subscription.unlockedFarmers.push({
                farmerId: product.farmerId,
                orderId: order._id
            });
        }
        
        await subscription.save();

        // Get farmer details including address
        const farmer = await User.findById(product.farmerId).select('username phone email');
        const farmerDetails = await require('../models/Farmer').findOne({ userId: product.farmerId });
        
        // Combine user and farmer details
        const farmerInfo = {
            username: farmer.username,
            phone: farmer.phone,
            email: farmer.email,
            farmAddress: farmerDetails?.farmAddress || 'Address not provided',
            pincode: farmerDetails?.pincode || 'Pincode not provided',
            farmName: farmerDetails?.farmName || 'Farm name not provided'
        };

        res.json({ 
            farmer: farmerInfo,
            pointsRemaining: subscription.points,
            orderId: order._id,
            message: 'Order accepted! Farmer details revealed.',
            status: 'accepted',
            productUpdated: {
                remainingQuantity: product.quantity,
                isActive: product.active,
                productName: product.product_name || product.name
            }
        });
    } catch (error) {
        console.error('Error in unlock-farmer:', error);
        res.status(500).json({ message: error.message });
    }
});

// Unlock farmer contact info (just reveal contact, don't create order)
router.post('/unlock-farmer-info/:farmerId', authenticateToken, async (req, res) => {
    try {
        const farmerId = req.params.farmerId;
        
        const subscription = await Subscription.findOne({
            userId: req.user.id,
            status: 'active',
            endDate: { $gt: new Date() }
        });

        if (!subscription) {
            return res.status(403).json({ 
                success: false, 
                message: 'Active subscription required' 
            });
        }

        if (subscription.points <= 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'No points remaining' 
            });
        }

        // Check if farmer is already unlocked
        const alreadyUnlocked = subscription.unlockedFarmers.some(
            f => f.farmerId.toString() === farmerId.toString()
        );

        if (alreadyUnlocked) {
            // Already unlocked, don't deduct points again
            return res.json({ 
                success: true, 
                message: 'Farmer contact already revealed.',
                pointsRemaining: subscription.points 
            });
        }

        // Verify farmer exists
        const farmer = await User.findById(farmerId);
        if (!farmer) {
            return res.status(404).json({ 
                success: false, 
                message: 'Farmer not found' 
            });
        }

        // Deduct subscription point
        subscription.points--;

        // Add farmer to unlocked farmers
        subscription.unlockedFarmers.push({
            farmerId: farmerId,
            unlockedAt: new Date()
        });
        
        await subscription.save();

        res.json({ 
            success: true,
            message: 'Farmer contact revealed successfully!',
            pointsRemaining: subscription.points
        });
    } catch (error) {
        console.error('Error in unlock-farmer-info:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

module.exports = router;
