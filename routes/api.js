const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { authenticateToken } = require('../middleware/auth');

// Get user profile (protected route)
router.get('/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

// Payment verification stub for Razorpay
router.post('/verify-payment', async (req, res) => {
    const { razorpay_payment_id, razorpay_signature } = req.body;
    // TODO: Add real Razorpay verification here
    if (!razorpay_payment_id) {
        return res.status(400).json({ message: 'Missing payment ID' });
    }
    // For now, just return success
    res.status(200).json({ message: 'Payment verified (stub)' });
});

// Middleware to parse JSON bodies
router.use(express.json());

// Login route
router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password (Note: In a real app, passwords should be hashed)
        if (user.password !== password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                _id: user._id,
                email: user.email,
                username: user.username,
                role: user.role,
                fullName: user.username
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get current user info
router.get('/auth/me', authenticateToken, async (req, res) => {
    try {
        res.json({
            _id: req.user._id,
            email: req.user.email,
            username: req.user.username,
            role: req.user.role,
            fullName: req.user.username
        });
    } catch (error) {
        console.error('Error fetching user info:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Check if email exists
router.post('/check-email', async (req, res) => {
    try {
        if (!req.body || !req.body.email) {
            return res.status(400).json({
                exists: false,
                message: 'Email is required'
            });
        }

        const { email } = req.body;
        
        // Check if user exists with this email
        const existingUser = await User.findOne({ email });
        
        // Include role in response if user exists
        res.json({ 
            exists: !!existingUser,
            role: existingUser ? existingUser.role : null
        });
    } catch (error) {
        console.error('Email check error:', error);
        res.status(500).json({ 
            exists: false, 
            message: 'Error checking email'
        });
    }
});

// Create subscription
router.post('/subscriptions', async (req, res) => {
    try {
        const { userId, plan, duration, paymentInfo } = req.body;
        
        if (!userId || !plan || !duration || !paymentInfo) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const subscription = new Subscription({
            userId,
            plan,
            duration,
            paymentInfo: {
                amount: paymentInfo.amount,
                status: paymentInfo.status || 'completed'
            },
            startDate: new Date(),
            endDate: new Date(Date.now() + duration * 30 * 24 * 60 * 60 * 1000) // duration in months
        });

        await subscription.save();

        res.status(201).json({
            message: 'Subscription created successfully',
            subscription
        });
    } catch (error) {
        console.error('Subscription creation error:', error);
        res.status(500).json({ message: 'Error creating subscription' });
    }
});

// Chart data endpoint for farmer dashboard (public for testing)
router.get('/data', async (req, res) => {
    try {
        // console.log('📊 Chart data request received:', req.query);
        const { product = 'Apple', month = 1 } = req.query;
        // console.log(`📊 Processing request for product: ${product}, month: ${month}`);
        
        // Generate sample data in the format expected by the frontend
        // Each item should have Date and avgPrice properties
        const sampleData = [];
        
        // console.log('📊 Starting data generation...');
        
        // Generate data for the correct number of days in the selected month
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const daysInMonth = new Date(year, parseInt(month), 0).getDate();
        
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, parseInt(month) - 1, i);
            const basePrice = getBasePrice(product);
            const variation = (Math.random() - 0.5) * 20; // Random variation of ±10
            const avgPrice = Math.max(basePrice + variation, 5); // Ensure price doesn't go below 5
            
            sampleData.push({
                Date: date.toISOString(),
                avgPrice: Math.round(avgPrice * 100) / 100 // Round to 2 decimal places
            });
        }
        
        // console.log(`📊 Generated ${sampleData.length} data points for ${product}, month ${month}`);
        res.json(sampleData);
    } catch (error) {
        console.error('❌ Chart data error:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ 
            message: 'Error fetching chart data',
            error: error.message
        });
    }
});

// Helper function to get base price for different products
function getBasePrice(product) {
    const basePrices = {
        'Apple': 80,
        'Banana': 40,
        'Mango': 120,
        'Orange': 60,
        'Grapes': 100,
        'Tomato': 30,
        'Potato': 25,
        'Onion': 35,
        'Carrot': 45,
        'Cabbage': 20,
        'Wheat': 25,
        'Cow Milk': 50,
        'Buffalo Milk': 60,
        'Cheese': 400,
        'Butter': 450,
        'Eggs': 6,
        'Coffee Beans': 600,
        'Instant Coffee': 300
    };
    
    return basePrices[product] || 50; // Default price if product not found
}

// Update subscription for existing users
router.post('/update-subscription', authenticateToken, async (req, res) => {
    try {
        const { subscription } = req.body;
        const userId = req.user._id;
        
        if (!subscription || !subscription.txid || !subscription.planName) {
            return res.status(400).json({ message: 'Invalid subscription data' });
        }

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Define plan points mapping (consistent with frontend)
        const planPointsMapping = {
            'Basic': 10,
            'Premium': 30,
            'VIP': 100
        };

        const newPlanPoints = planPointsMapping[subscription.planName] || 10;

        // Create or update subscription
        let userSubscription = await Subscription.findOne({ userId });
        
        if (userSubscription) {
            // Update existing subscription - ADD points instead of replacing
            const oldPlan = userSubscription.plan;
            
            // Add new plan points to existing points balance
            userSubscription.points = (userSubscription.points || 0) + newPlanPoints;
            userSubscription.totalPoints = (userSubscription.totalPoints || 0) + newPlanPoints;
            
            // Update subscription details
            userSubscription.plan = subscription.planName.toLowerCase();
            userSubscription.paymentInfo = {
                ...userSubscription.paymentInfo,
                txid: subscription.txid,
                amount: subscription.amount,
                status: 'completed'
            };
            userSubscription.status = 'active';
            
            // Extend the subscription based on duration from current expiry or now
            const currentDate = userSubscription.endDate > new Date() ? userSubscription.endDate : new Date();
            userSubscription.endDate = new Date(currentDate.getTime() + (subscription.duration * 30 * 24 * 60 * 60 * 1000));
            
            console.log(`Subscription extended/upgraded: Old plan: ${oldPlan}, New plan: ${subscription.planName}, Added points: ${newPlanPoints}, Total points now: ${userSubscription.points}`);
            
            await userSubscription.save();
        } else {
            // Create new subscription
            userSubscription = new Subscription({
                userId,
                plan: subscription.planName.toLowerCase(),
                points: newPlanPoints,
                totalPoints: newPlanPoints,
                startDate: new Date(),
                endDate: new Date(Date.now() + (subscription.duration * 30 * 24 * 60 * 60 * 1000)),
                status: 'active',
                paymentInfo: {
                    amount: subscription.amount,
                    txid: subscription.txid,
                    status: 'completed'
                }
            });
            
            console.log(`New subscription created: Plan: ${subscription.planName}, Points: ${newPlanPoints}`);
            
            await userSubscription.save();
        }

        res.json({ 
            message: 'Subscription updated successfully',
            subscription: userSubscription
        });
        
    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({ message: 'Failed to update subscription' });
    }
});

module.exports = router;
