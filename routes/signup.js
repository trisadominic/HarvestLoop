const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Farmer = require('../models/Farmer');
const Consumer = require('../models/Consumer');
const Subscription = require('../models/Subscription');

// Sign up user (both farmer and consumer)
router.post('/', async (req, res) => {
    try {
        console.log('📝 Signup request received:');
        console.log('   Body:', req.body);
        console.log('   Delivery Address (camelCase):', req.body.deliveryAddress);
        console.log('   Delivery Address (kebab-case):', req.body['delivery-address']);
        console.log('   Pincode:', req.body.pincode);
        console.log('   Interests:', req.body.interests);
        
        const { username, phone, email, password, role } = req.body;

        // Validate role
        if (!['Farmer', 'Consumer'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        // Check if user exists
        const existingUser = await User.findOne({
            $or: [{ phone }, { email }]
        });

        if (existingUser) {
            return res.status(400).json({ 
                message: 'User with this phone number or email already exists' 
            });
        }

        // For Consumers without subscription data, redirect to subscription
        if (role === 'Consumer' && !req.body.subscription) {
            console.log('🔄 Redirecting consumer to subscription page');
            return res.status(200).json({
                message: 'Proceed to subscription',
                tempData: {
                    username,
                    phone,
                    email,
                    password,
                    role
                },
                redirect: '/subscription.html'
            });
        }

        // Create user
        const user = new User({
            username,
            phone,
            email,
            password, // In production, hash the password
            role
        });

        await user.save();

        // If user is a farmer, create farmer profile
        if (role === 'Farmer') {
            const farmer = new Farmer({
                userId: user._id,
                fullName: username, // Add required fullName field
                email: email,       // Add required email field
                farmName: req.body['farm-name'] || '',
                farmAddress: req.body['farm-address'] || '',
                farmProducts: [], // Will be populated when farmer adds products
                pincode: req.body.pincode || '' // Add pincode if provided
            });

            await farmer.save();
        }

        // If user is a consumer, create consumer profile
        if (role === 'Consumer') {
            const consumer = new Consumer({
                userId: user._id,
                fullName: username, // Use username as initial fullName
                email: email,
                phone: phone,
                deliveryAddress: req.body.deliveryAddress || req.body['delivery-address'] || '',
                pincode: req.body.pincode || '',
                interests: req.body.interests || [],
                isActive: true
            });

            await consumer.save();
            console.log('✅ Created consumer profile during signup with address:', req.body.deliveryAddress || req.body['delivery-address']);
        }

        // If user is a consumer with subscription data, create their subscription
        if (role === 'Consumer' && req.body.subscription) {
            const subscriptionData = req.body.subscription;
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + (subscriptionData.duration || 1));

            // Convert plan name to lowercase and map to database enum values
            const originalPlan = (subscriptionData.planName || subscriptionData.plan || '').toLowerCase();
            const planName = originalPlan === 'vip' ? 'unlimited' : originalPlan;
            const points = planName === 'basic' ? 10 : (planName === 'premium' ? 30 : 100);

            const subscription = new Subscription({
                userId: user._id,
                plan: planName,
                points,
                totalPoints: points,
                startDate: new Date(),
                endDate,
                status: 'active',
                paymentInfo: {
                    amount: subscriptionData.amount,
                    status: 'completed',
                    txid: subscriptionData.txid
                }
            });

            await subscription.save();
        }

        res.status(201).json({
            message: 'Registration successful',
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('❌ Registration Error:', error);
        // Return error details for debugging
        res.status(500).json({ message: 'Registration failed', error: error.message, stack: error.stack });
    }
});

module.exports = router;
