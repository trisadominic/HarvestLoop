const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Farmer = require('../models/Farmer');
const Consumer = require('../models/Consumer');
const Subscription = require('../models/Subscription');
const { validateSignupData } = require('../middleware/validation');

// Sign up user (both farmer and consumer) with validation middleware
router.post('/', validateSignupData, async (req, res) => {
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
        let user;
        try {
            user = new User({
                username,
                phone,
                email,
                password, // In production, hash the password
                role
            });

            await user.save();
            console.log('✅ Created user account');
        } catch (error) {
            console.error('❌ User creation failed:', error.message);
            return res.status(400).json({ 
                message: 'Registration failed', 
                error: error.message,
                details: 'User creation failed. Please check your information and try again.' 
            });
        }
        
        // Now we have the user created, let's create the profile
        try {
            // If user is a farmer, create farmer profile
            if (role === 'Farmer') {
                // Process farmProducts array - normalize the data
                let farmProducts = [];
                if (req.body.farmProducts) {
                    console.log('Raw farmProducts:', req.body.farmProducts);
                    
                    if (Array.isArray(req.body.farmProducts)) {
                        farmProducts = req.body.farmProducts;
                    } else if (typeof req.body.farmProducts === 'string') {
                        // If it's a string (e.g. from form data), try to parse it or split it
                        try {
                            const parsed = JSON.parse(req.body.farmProducts);
                            farmProducts = Array.isArray(parsed) ? parsed : [parsed];
                        } catch (e) {
                            // If parsing fails, split by comma
                            farmProducts = req.body.farmProducts.split(',')
                                .map(item => item.trim())
                                .filter(item => item.length > 0);
                        }
                    }
                }
                
                console.log('Farm products detected:', farmProducts);
                
                const farmer = new Farmer({
                    userId: user._id,
                    farmName: req.body['farm-name'] || username || 'My Farm', // Use username as fallback
                    fullName: username, // Set fullName to username as required field
                    email: email, // Set email as required field
                    mobile: phone, // Set mobile number from phone field
                    farmAddress: req.body['farm-address'] || '',
                    farmProducts: farmProducts, // Use normalized farm products
                    productTypes: farmProducts, // Also set productTypes field
                    pincode: req.body.pincode || '' // Add pincode if provided
                });

                await farmer.save();
                console.log('✅ Created farmer profile during signup with products:', req.body.farmProducts);
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
                console.log('✅ Created subscription during signup');
            }
            
            // Registration completed successfully
            res.status(201).json({
                message: 'Registration successful',
                user: {
                    id: user._id,
                    username: user.username,
                    role: user.role
                }
            });
            
        } catch (error) {
            // If profile creation fails, delete the user to avoid orphaned accounts
            if (user && user._id) {
                await User.findByIdAndDelete(user._id);
            }
            console.error('❌ Profile creation failed:', error.message);
            return res.status(400).json({ 
                message: 'Registration failed', 
                error: error.message,
                details: 'Please ensure all required fields are provided.' 
            });
        }
    } catch (error) {
        console.error('❌ Registration Error:', error);
        // Return error details for debugging
        res.status(500).json({ message: 'Registration failed', error: error.message, stack: error.stack });
    }
});

module.exports = router;
