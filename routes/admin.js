const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Farmer = require('../models/Farmer');
const Consumer = require('../models/Consumer');
const Product = require('../models/Product');
const ProductPrice = require('../models/ProductPrice');
const Order = require('../models/Order');
const Deal = require('../models/Deal');
const Subscription = require('../models/Subscription');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Create initial admin user (only if no admin exists)
router.post('/create-admin', async (req, res) => {
    try {
        // Check if admin already exists
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            return res.status(400).json({ message: 'Admin user already exists' });
        }

        // Create admin user
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const admin = new User({
            username: 'admin',
            email: 'admin@farmconnect.com',
            password: hashedPassword,
            role: 'admin'
        });

        await admin.save();
        res.status(201).json({ message: 'Admin user created successfully' });
    } catch (error) {
        console.error('Error creating admin:', error);
        res.status(500).json({ message: 'Error creating admin user' });
    }
});

// Admin login endpoint
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if user is admin
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// Dashboard stats
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Admin stats request received');
        
        // Verify admin role
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        console.log('👤 User role:', req.user.role);
        console.log('🆔 User ID:', req.user.userId);
        
        // Count farmers
        console.log('📊 Counting farmers...');
        const totalFarmers = await User.countDocuments({ role: 'Farmer' });
        console.log('👨‍🌾 Total farmers:', totalFarmers);
        
        // Count consumers
        console.log('📊 Counting consumers...');
        const totalConsumers = await User.countDocuments({ role: 'Consumer' });
        console.log('🏢 Total consumers:', totalConsumers);
        
        // Count products - use ProductPrice since that's where real data is
        console.log('📊 Counting products...');
        const totalProducts = await ProductPrice.countDocuments({ active: true });
        console.log('🥦 Total products:', totalProducts);
        
        // Count orders
        console.log('📊 Counting orders...');
        const totalOrders = await Order.countDocuments();
        console.log('📦 Total orders:', totalOrders);
        
        // Count subscribed members (active subscriptions)
        console.log('📊 Counting subscribed members...');
        const subscribedMembers = await Subscription.countDocuments({ 
            status: 'active'
        });
        console.log('👑 Subscribed members:', subscribedMembers);
        
        // Recent counts (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentFarmers = await User.countDocuments({ 
            role: 'Farmer', 
            createdAt: { $gte: thirtyDaysAgo } 
        });
        
        const recentConsumers = await User.countDocuments({ 
            role: 'Consumer', 
            createdAt: { $gte: thirtyDaysAgo } 
        });
        
        const stats = {
            totalFarmers,
            totalConsumers,
            totalProducts,
            totalOrders,
            subscribedMembers,
            recentFarmers,
            recentConsumers
        };
        
        console.log('✅ Sending stats:', stats);
        res.json(stats);
    } catch (error) {
        console.error('❌ Error fetching stats:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
});

// Get farmers list for admin
router.get('/farmers', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Farmers API endpoint called');
        
        // Verify admin role
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        console.log('👤 User:', req.user);

        const farmers = await User.find({ role: 'Farmer' }).select('-password');
        console.log(`👨‍🌾 Found ${farmers.length} farmers in database`);
        
        // Add additional stats and farm information for each farmer
        const farmersWithStats = await Promise.all(farmers.map(async (farmer) => {
            try {
                const productCount = await ProductPrice.countDocuments({ 
                    farmerId: farmer._id, 
                    active: true 
                });
                const orderCount = await Order.countDocuments({ farmerId: farmer._id });
                
                // Get farm details from Farmer collection
                const farmerProfile = await require('../models/Farmer').findOne({ userId: farmer._id });
                
                const farmerData = {
                    ...farmer.toObject(),
                    productCount,
                    orderCount,
                    joinDate: farmer.createdAt,
                    // Add farm information from Farmer collection
                    farmName: farmerProfile?.farmName || 'Not specified',
                    farmAddress: farmerProfile?.farmAddress || 'Not specified', 
                    farmSize: farmerProfile?.farmSize || 0,
                    productTypes: farmerProfile?.productTypes || farmerProfile?.farmProducts || [],
                    pincode: farmerProfile?.pincode || 'Not specified',
                    farmDescription: farmerProfile?.farmDescription || 'No description provided',
                    // Add proper updatedAt from either User or Farmer collection
                    updatedAt: farmer.updatedAt || farmerProfile?.updatedAt || farmer.createdAt
                };
                
                return farmerData;
            } catch (err) {
                console.error('Error getting farmer stats:', err);
                return {
                    ...farmer.toObject(),
                    productCount: 0,
                    orderCount: 0,
                    joinDate: farmer.createdAt,
                    farmName: 'Not specified',
                    farmAddress: 'Not specified',
                    farmSize: 0,
                    productTypes: [],
                    pincode: 'Not specified',
                    farmDescription: 'No description provided',
                    // Add fallback updatedAt
                    updatedAt: farmer.updatedAt || farmer.createdAt
                };
            }
        }));
        
        console.log(`✅ Returning ${farmersWithStats.length} farmers`);
        if (farmersWithStats.length > 0) {
            console.log('📋 Sample farmer:', farmersWithStats[0]);
        }
        
        res.json(farmersWithStats);
    } catch (error) {
        console.error('Error fetching farmers:', error);
        res.status(500).json({ message: 'Error fetching farmers data' });
    }
});

// Get individual farmer details
router.get('/farmers/:farmerId', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Individual farmer API endpoint called for ID:', req.params.farmerId);
        
        // Verify admin role
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { farmerId } = req.params;
        
        // Find farmer by ID
        const farmer = await User.findById(farmerId).select('-password');
        if (!farmer || farmer.role !== 'Farmer') {
            return res.status(404).json({ message: 'Farmer not found' });
        }
        
        // Get additional stats and farm information
        const productCount = await ProductPrice.countDocuments({ 
            farmerId: farmer._id, 
            active: true 
        });
        const orderCount = await Order.countDocuments({ farmerId: farmer._id });
        
        // Get farm details from Farmer collection
        const farmerProfile = await require('../models/Farmer').findOne({ userId: farmer._id });
        
        const farmerData = {
            ...farmer.toObject(),
            productCount,
            orderCount,
            joinDate: farmer.createdAt,
            // Add farm information from Farmer collection
            farmName: farmerProfile?.farmName || 'Not specified',
            farmAddress: farmerProfile?.farmAddress || 'Not specified', 
            farmSize: farmerProfile?.farmSize || 0,
            productTypes: farmerProfile?.productTypes || farmerProfile?.farmProducts || [],
            pincode: farmerProfile?.pincode || 'Not specified',
            farmDescription: farmerProfile?.farmDescription || 'No description provided',
            // Add proper updatedAt from either User or Farmer collection
            updatedAt: farmer.updatedAt || farmerProfile?.updatedAt || farmer.createdAt
        };
        
        console.log('✅ Returning farmer details:', farmerData);
        res.json(farmerData);
    } catch (error) {
        console.error('Error fetching farmer details:', error);
        res.status(500).json({ message: 'Error fetching farmer details' });
    }
});

// Update farmer details (PUT endpoint)
router.put('/farmers/:farmerId', authenticateToken, async (req, res) => {
    try {
        console.log('🔄 Farmer update API endpoint called for ID:', req.params.farmerId);
        
        // Verify admin role
        if (req.user.role !== 'admin') {
            console.log('❌ Access denied - not admin');
            return res.status(403).json({ message: 'Access denied. Admin role required.' });
        }

        const { farmerId } = req.params;
        const { fullName, username, email, phone, mobile } = req.body;
        
        console.log('📝 Update data received:', { fullName, username, email, phone, mobile });

        // Validate required fields
        if (!fullName || !email) {
            return res.status(400).json({ message: 'Full name and email are required' });
        }

        // Check if farmer exists
        const farmer = await User.findById(farmerId);
        if (!farmer) {
            console.log('❌ Farmer not found with ID:', farmerId);
            return res.status(404).json({ message: 'Farmer not found' });
        }

        // Check if farmer role is correct
        if (farmer.role !== 'Farmer') {
            console.log('❌ User is not a farmer:', farmer.role);
            return res.status(400).json({ message: 'User is not a farmer' });
        }

        // Check if email is already taken by another user
        if (email !== farmer.email) {
            const existingUser = await User.findOne({ email, _id: { $ne: farmerId } });
            if (existingUser) {
                return res.status(400).json({ message: 'Email already exists for another user' });
            }
        }

        // Update farmer details
        const updatedFarmer = await User.findByIdAndUpdate(
            farmerId,
            {
                fullName: fullName || farmer.fullName,
                username: username || fullName || farmer.username,
                email: email || farmer.email,
                phone: phone || farmer.phone,
                mobile: mobile || phone || farmer.mobile,
                updatedAt: new Date()
            },
            { new: true, select: '-password' }
        );

        console.log('✅ Farmer updated successfully:', updatedFarmer.fullName);
        
        res.json({
            message: 'Farmer updated successfully',
            farmer: updatedFarmer
        });

    } catch (error) {
        console.error('❌ Error updating farmer:', error);
        res.status(500).json({ message: 'Error updating farmer details' });
    }
});

// Delete farmer (DELETE endpoint)
router.delete('/farmers/:farmerId', authenticateToken, async (req, res) => {
    try {
        console.log('🗑️ Farmer delete API endpoint called for ID:', req.params.farmerId);
        
        // Verify admin role
        if (req.user.role !== 'admin') {
            console.log('❌ Access denied - not admin');
            return res.status(403).json({ message: 'Access denied. Admin role required.' });
        }

        const { farmerId } = req.params;
        
        // Check if farmer exists
        const farmer = await User.findById(farmerId);
        if (!farmer || farmer.role !== 'Farmer') {
            console.log('❌ Farmer not found with ID:', farmerId);
            return res.status(404).json({ message: 'Farmer not found' });
        }

        console.log('👨‍🌾 Found farmer to delete:', farmer.username);

        // Delete related data first
        console.log('🧹 Cleaning up related data...');
        
        // Delete farmer's products
        await ProductPrice.deleteMany({ farmerId });
        console.log('✅ Deleted farmer products');
        
        // Delete farmer's orders
        await Order.deleteMany({ farmerId });
        console.log('✅ Deleted farmer orders');
        
        // Delete farmer's deals/negotiations
        await Deal.deleteMany({ farmerId });
        console.log('✅ Deleted farmer deals');
        
        // Delete farmer profile from Farmer collection
        await require('../models/Farmer').deleteOne({ userId: farmerId });
        console.log('✅ Deleted farmer profile');
        
        // Finally delete the user account
        await User.findByIdAndDelete(farmerId);
        console.log('✅ Deleted farmer user account');

        console.log('🎉 Farmer deleted successfully:', farmer.username);
        
        res.json({
            message: 'Farmer deleted successfully',
            deletedFarmer: {
                id: farmer._id,
                name: farmer.username,
                email: farmer.email
            }
        });

    } catch (error) {
        console.error('❌ Error deleting farmer:', error);
        res.status(500).json({ message: 'Error deleting farmer', error: error.message });
    }
});

// Get consumers list for admin
router.get('/consumers', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Consumers API endpoint called');
        console.log('👤 User:', req.user);
        
        // Verify admin role
        if (req.user.role !== 'admin') {
            console.log('❌ Access denied - user role:', req.user.role);
            return res.status(403).json({ message: 'Access denied' });
        }

        console.log('📋 Fetching consumers from database...');
        const consumers = await User.find({ role: 'Consumer' }).select('-password');
        console.log('👥 Found', consumers.length, 'consumers in database');
        
        // Add additional stats and consumer profile data for each consumer
        const consumersWithStats = await Promise.all(consumers.map(async (consumer) => {
            try {
                const orderCount = await Order.countDocuments({ consumerId: consumer._id });
                
                // Get consumer profile data
                const consumerProfile = await Consumer.findOne({ userId: consumer._id });
                
                return {
                    ...consumer.toObject(),
                    // Add consumer profile fields
                    deliveryAddress: consumerProfile?.deliveryAddress || '',
                    pincode: consumerProfile?.pincode || '',
                    fullName: consumerProfile?.fullName || consumer.username,
                    orderCount,
                    joinDate: consumer.createdAt
                };
            } catch (err) {
                console.error('Error getting consumer stats:', err);
                return {
                    ...consumer.toObject(),
                    orderCount: 0,
                    joinDate: consumer.createdAt
                };
            }
        }));
        
        console.log('✅ Returning', consumersWithStats.length, 'consumers with stats');
        console.log('📋 Sample consumer:', JSON.stringify(consumersWithStats[0], null, 2));
        res.json(consumersWithStats);
    } catch (error) {
        console.error('❌ Error fetching consumers:', error);
        res.status(500).json({ message: 'Error fetching consumers data' });
    }
});

// Get negotiations for admin
router.get('/negotiations', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Negotiations API endpoint called');
        
        // Verify admin role
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        console.log('👤 User:', req.user);
        
        console.log('📝 Fetching negotiations from database...');
        
        const deals = await Deal.find()
            .populate('productId', 'name category price unit description')
            .populate('farmerId', 'username email')
            .populate('consumerId', 'username email phone')
            .sort({ createdAt: -1 });

        console.log(`📊 Found ${deals.length} deals in database`);
        
        if (deals.length > 0) {
            console.log('📋 Sample deal:', deals[0]);
        }
        
        // Transform deals for admin view
        const negotiations = deals.map(deal => ({
            id: deal._id,
            consumerId: deal.consumerId._id,
            consumerName: deal.consumerId.username,
            consumerEmail: deal.consumerId.email,
            consumerPhone: deal.consumerId.phone,
            farmerId: deal.farmerId._id,
            farmerName: deal.farmerId.username,
            farmerEmail: deal.farmerId.email,
            product: deal.productId.name,
            category: deal.productId.category,
            quantity: deal.quantity,
            unit: deal.productId.unit,
            pricePerUnit: deal.proposedPrice,
            originalPrice: deal.originalPrice,
            totalPrice: (deal.proposedPrice * deal.quantity).toFixed(2),
            status: deal.status,
            message: deal.message,
            createdAt: deal.createdAt,
            updatedAt: deal.updatedAt,
            expiresAt: deal.expiresAt,
            farmerResponseAt: deal.farmerResponseAt,
            consumerResponseAt: deal.consumerResponseAt
        }));

        console.log(`✅ Transformed ${negotiations.length} negotiations`);
        
        if (negotiations.length > 0) {
            console.log('📋 Sample negotiation:', negotiations[0]);
        }
        
        res.json(negotiations);
        
    } catch (error) {
        console.error('❌ Error fetching negotiations:', error);
        res.status(500).json({ message: 'Failed to fetch negotiations', error: error.message });
    }
});

// Get combined transactions (negotiations + direct orders) for admin revenue monitoring
router.get('/transactions', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Transactions API endpoint called');
        
        // Verify admin role
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        console.log('👤 User:', req.user);
        
        console.log('📝 Fetching negotiations and orders from database...');
        
        // Fetch all deals (negotiations)
        const deals = await Deal.find()
            .populate('productId', 'name category price unit description')
            .populate('farmerId', 'username email')
            .populate('consumerId', 'username email phone')
            .sort({ createdAt: -1 });

        // Fetch all orders (including direct orders without deals)
        const orders = await Order.find()
            .populate('productId', 'name category price unit description')
            .populate('farmerId', 'username email phone')
            .populate('consumerId', 'username email phone')
            .populate('dealId')
            .sort({ createdAt: -1 });

        console.log(`📊 Found ${deals.length} deals and ${orders.length} orders in database`);
        
        // Transform deals (negotiations) for admin view
        const negotiations = deals.map(deal => ({
            id: deal._id,
            type: 'negotiation',
            consumerId: deal.consumerId._id,
            consumerName: deal.consumerId.username,
            consumerEmail: deal.consumerId.email,
            consumerPhone: deal.consumerId.phone,
            farmerId: deal.farmerId._id,
            farmerName: deal.farmerId.username,
            farmerEmail: deal.farmerId.email,
            product: deal.productId.name,
            category: deal.productId.category,
            quantity: deal.quantity,
            unit: deal.productId.unit,
            pricePerUnit: deal.proposedPrice,
            originalPrice: deal.originalPrice,
            totalPrice: (deal.proposedPrice * deal.quantity).toFixed(2),
            status: deal.status,
            message: deal.message,
            createdAt: deal.createdAt,
            updatedAt: deal.updatedAt,
            expiresAt: deal.expiresAt,
            farmerResponseAt: deal.farmerResponseAt,
            consumerResponseAt: deal.consumerResponseAt,
            dealId: deal._id
        }));

        // Transform orders (direct orders) for admin view
        const directOrders = orders.map(order => ({
            id: order._id,
            type: order.dealId ? 'order-from-negotiation' : 'direct-order',
            consumerId: order.consumerId._id,
            consumerName: order.consumerId.username,
            consumerEmail: order.consumerId.email,
            consumerPhone: order.consumerId.phone,
            farmerId: order.farmerId._id,
            farmerName: order.farmerId.username,
            farmerEmail: order.farmerId.email,
            product: order.productId.name,
            category: order.productId.category,
            quantity: order.quantity,
            unit: order.productId.unit,
            pricePerUnit: order.price,
            originalPrice: order.productId.price, // Original product price
            totalPrice: (order.price * order.quantity).toFixed(2),
            status: order.status,
            paymentStatus: order.paymentStatus,
            message: order.dealId ? 'Order created from negotiation' : 'Direct order',
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            dealId: order.dealId || null
        }));

        // Combine both negotiations and orders
        const allTransactions = [...negotiations, ...directOrders];
        
        // Sort by creation date (most recent first)
        allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        console.log(`✅ Combined ${negotiations.length} negotiations and ${directOrders.length} orders into ${allTransactions.length} transactions`);
        
        if (allTransactions.length > 0) {
            console.log('📋 Sample transaction:', allTransactions[0]);
        }
        
        res.json(allTransactions);
        
    } catch (error) {
        console.error('❌ Error fetching transactions:', error);
        res.status(500).json({ message: 'Failed to fetch transactions', error: error.message });
    }
});

// Get negotiations by farmer ID for admin
router.get('/farmers/:farmerId/negotiations', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Farmer negotiations API endpoint called for farmerId:', req.params.farmerId);
        
        // Verify admin role
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const { farmerId } = req.params;
        
        console.log('📝 Fetching negotiations for farmer from database...');
        
        const deals = await Deal.find({ farmerId })
            .populate('productId', 'name category price unit description')
            .populate('farmerId', 'username email')
            .populate('consumerId', 'username email phone')
            .sort({ createdAt: -1 });

        console.log(`📊 Found ${deals.length} negotiations for farmer ${farmerId}`);
        
        // Transform deals for admin view
        const negotiations = deals.map(deal => ({
            id: deal._id,
            consumerId: deal.consumerId._id,
            consumerName: deal.consumerId.username,
            consumerEmail: deal.consumerId.email,
            consumerPhone: deal.consumerId.phone,
            farmerId: deal.farmerId._id,
            farmerName: deal.farmerId.username,
            farmerEmail: deal.farmerId.email,
            product: deal.productId.name,
            category: deal.productId.category,
            quantity: deal.quantity,
            unit: deal.productId.unit,
            pricePerUnit: deal.proposedPrice,
            originalPrice: deal.originalPrice,
            totalPrice: (deal.proposedPrice * deal.quantity).toFixed(2),
            status: deal.status,
            message: deal.message,
            createdAt: deal.createdAt,
            updatedAt: deal.updatedAt,
            expiresAt: deal.expiresAt,
            farmerResponseAt: deal.farmerResponseAt,
            consumerResponseAt: deal.consumerResponseAt
        }));

        console.log(`✅ Returning ${negotiations.length} negotiations for farmer`);
        res.json(negotiations);
        
    } catch (error) {
        console.error('❌ Error fetching farmer negotiations:', error);
        res.status(500).json({ message: 'Failed to fetch farmer negotiations', error: error.message });
    }
});

// Delete negotiation (DELETE endpoint)
router.delete('/negotiations/:negotiationId', authenticateToken, async (req, res) => {
    try {
        console.log('🗑️ Negotiation delete API endpoint called for ID:', req.params.negotiationId);
        
        // Verify admin role
        if (req.user.role !== 'admin') {
            console.log('❌ Access denied - not admin');
            return res.status(403).json({ message: 'Access denied. Admin role required.' });
        }

        const { negotiationId } = req.params;
        
        // Check if negotiation exists
        const negotiation = await Deal.findById(negotiationId)
            .populate('productId', 'name category')
            .populate('farmerId', 'username email')
            .populate('consumerId', 'username email');
            
        if (!negotiation) {
            console.log('❌ Negotiation not found with ID:', negotiationId);
            return res.status(404).json({ message: 'Negotiation not found' });
        }

        console.log('🤝 Found negotiation to delete:', {
            product: negotiation.productId.name,
            farmer: negotiation.farmerId.username,
            consumer: negotiation.consumerId.username
        });

        // Delete the negotiation
        await Deal.findByIdAndDelete(negotiationId);
        console.log('✅ Negotiation deleted successfully');

        res.json({
            message: 'Negotiation deleted successfully',
            deletedNegotiation: {
                id: negotiation._id,
                product: negotiation.productId.name,
                farmer: negotiation.farmerId.username,
                consumer: negotiation.consumerId.username,
                status: negotiation.status,
                totalPrice: (negotiation.proposedPrice * negotiation.quantity).toFixed(2)
            }
        });

    } catch (error) {
        console.error('❌ Error deleting negotiation:', error);
        res.status(500).json({ message: 'Error deleting negotiation', error: error.message });
    }
});

// Get all products for admin
router.get('/products', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Products API endpoint called');
        
        // Verify admin role
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        console.log('👤 User:', req.user);
        
        // Fetch all products with farmer details - use ProductPrice model where the real data is
        const products = await ProductPrice.find()
            .populate('farmerId', 'username email')
            .sort({ createdAt: -1 });

        console.log(`📦 Found ${products.length} products in database`);
        
        // Transform products for admin view
        const transformedProducts = products.map(product => {
            const farmer = product.farmerId;
            
            return {
                id: product._id,
                name: product.name || 'Unknown Product',
                description: product.description || '',
                category: product.category || 'Unknown',
                price: product.price || 0,
                quantity: product.quantity || 0,
                unit: product.unit || 'kg',
                active: product.active !== false,
                organic: product.organic || false,
                location: product.location || 'Not specified',
                farmer: farmer ? {
                    id: farmer._id,
                    name: farmer.username,
                    email: farmer.email
                } : null,
                imageUrl: product.imageUrl || null,
                createdAt: product.createdAt,
                updatedAt: product.updatedAt
            };
        });

        console.log(`✅ Returning ${transformedProducts.length} products`);
        if (transformedProducts.length > 0) {
            console.log('📋 Sample product:', transformedProducts[0]);
        }
        
        res.json(transformedProducts);
        
    } catch (error) {
        console.error('❌ Error fetching products:', error);
        res.status(500).json({ message: 'Failed to fetch products', error: error.message });
    }
});

// Get products by farmer ID for admin
router.get('/farmers/:farmerId/products', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Farmer products API endpoint called for farmerId:', req.params.farmerId);
        
        // Verify admin role
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        const { farmerId } = req.params;
        
        // Fetch products for specific farmer
        const products = await ProductPrice.find({ farmerId })
            .populate('farmerId', 'username email')
            .sort({ createdAt: -1 });

        console.log(`📦 Found ${products.length} products for farmer ${farmerId}`);
        
        // Transform products for admin view
        const transformedProducts = products.map(product => {
            const farmer = product.farmerId;
            
            return {
                id: product._id,
                name: product.name || 'Unknown Product',
                description: product.description || '',
                category: product.category || 'Unknown',
                price: product.price || 0,
                quantity: product.quantity || 0,
                unit: product.unit || 'kg',
                active: product.active !== false,
                organic: product.organic || false,
                location: product.location || 'Not specified',
                farmer: farmer ? {
                    id: farmer._id,
                    name: farmer.username,
                    email: farmer.email
                } : null,
                imageUrl: product.imageUrl || null,
                createdAt: product.createdAt,
                updatedAt: product.updatedAt
            };
        });

        console.log(`✅ Returning ${transformedProducts.length} products for farmer`);
        res.json(transformedProducts);
        
    } catch (error) {
        console.error('❌ Error fetching farmer products:', error);
        res.status(500).json({ message: 'Failed to fetch farmer products', error: error.message });
    }
});

// Get all orders for admin
router.get('/orders', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Orders API endpoint called');
        
        // Verify admin role
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        console.log('👤 User:', req.user);
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // Build query filter
        let query = {};
        if (req.query.status) {
            query.status = req.query.status;
        }
        if (req.query.paymentStatus) {
            query.paymentStatus = req.query.paymentStatus;
        }
        
        const totalOrders = await Order.countDocuments(query);
        const orders = await Order.find(query)
            .populate('productId', 'name category price unit description')
            .populate('farmerId', 'username email phone')
            .populate('consumerId', 'username email phone')
            .populate('dealId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        
        console.log(`📦 Found ${orders.length} orders in database`);
        
        // Transform the data using correct Order model fields
        const transformedOrders = orders.map(order => ({
            id: order._id,
            orderId: order._id.toString().slice(-8).toUpperCase(),
            product: order.productId ? {
                name: order.productId.name,
                category: order.productId.category,
                unit: order.productId.unit
            } : null,
            farmer: order.farmerId ? {
                id: order.farmerId._id,
                name: order.farmerId.username,
                email: order.farmerId.email,
                phone: order.farmerId.phone || 'N/A'
            } : null,
            customer: order.consumerId ? {
                id: order.consumerId._id,
                name: order.consumerId.username,
                email: order.consumerId.email,
                phone: order.consumerId.phone || 'N/A'
            } : null,
            quantity: order.quantity,
            pricePerUnit: order.price, // Use 'price' field from Order model
            totalAmount: (order.quantity * order.price).toFixed(2),
            status: order.status,
            paymentStatus: order.paymentStatus,
            orderDate: order.createdAt,
            lastUpdated: order.updatedAt,
            dealId: order.dealId ? order.dealId._id : null
        }));
        
        console.log(`✅ Returning ${transformedOrders.length} orders`);
        if (transformedOrders.length > 0) {
            console.log('📋 Sample transformed order:', transformedOrders[0]);
        }
        
        res.json({
            orders: transformedOrders,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalOrders / limit),
                totalOrders,
                limit
            }
        });
    } catch (error) {
        console.error('❌ Error fetching orders:', error);
        res.status(500).json({ message: 'Error fetching orders', error: error.message });
    }
});

// Get recent admin activity
router.get('/activity', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Activity API endpoint called');
        
        // Verify admin role
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        console.log('👤 User:', req.user);
        
        // Get recent activities from various collections
        const activities = [];
        
        // Recent orders (last 10)
        const recentOrders = await Order.find()
            .populate('consumerId', 'username')
            .populate('productId', 'name')
            .sort({ createdAt: -1 })
            .limit(5);
            
        recentOrders.forEach(order => {
            activities.push({
                type: 'order',
                message: `New order placed by ${order.consumerId?.username || 'Unknown'} for ${order.productId?.name || 'Unknown Product'}`,
                timestamp: order.createdAt,
                details: {
                    orderId: order._id,
                    amount: order.price * order.quantity
                }
            });
        });
        
        // Recent user registrations (last 5)
        const recentUsers = await User.find({ role: { $in: ['Farmer', 'Consumer'] } })
            .sort({ createdAt: -1 })
            .limit(5);
            
        recentUsers.forEach(user => {
            activities.push({
                type: 'user',
                message: `New ${user.role.toLowerCase()} registered: ${user.username}`,
                timestamp: user.createdAt,
                details: {
                    userId: user._id,
                    role: user.role
                }
            });
        });
        
        // Recent products (last 5)
        const recentProducts = await ProductPrice.find()
            .populate('farmerId', 'username')
            .sort({ createdAt: -1 })
            .limit(3);
            
        recentProducts.forEach(product => {
            activities.push({
                type: 'product',
                message: `New product added: ${product.name} by ${product.farmerId?.username || 'Unknown Farmer'}`,
                timestamp: product.createdAt,
                details: {
                    productId: product._id,
                    price: product.price
                }
            });
        });
        
        // Recent deals/negotiations (last 5)
        const recentDeals = await Deal.find()
            .populate('consumerId', 'username')
            .populate('farmerId', 'username')
            .populate('productId', 'name')
            .sort({ createdAt: -1 })
            .limit(3);
            
        recentDeals.forEach(deal => {
            activities.push({
                type: 'deal',
                message: `New negotiation: ${deal.consumerId?.username || 'Unknown'} negotiating for ${deal.productId?.name || 'Unknown Product'}`,
                timestamp: deal.createdAt,
                details: {
                    dealId: deal._id,
                    proposedPrice: deal.proposedPrice,
                    status: deal.status
                }
            });
        });
        
        // Sort all activities by timestamp (newest first) and limit to 10
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const limitedActivities = activities.slice(0, 10);
        
        console.log(`✅ Returning ${limitedActivities.length} activities`);
        if (limitedActivities.length > 0) {
            console.log('📋 Sample activity:', limitedActivities[0]);
        }
        
        res.json(limitedActivities);
        
    } catch (error) {
        console.error('❌ Error fetching activity:', error);
        res.status(500).json({ message: 'Error fetching recent activity', error: error.message });
    }
});

// Get subscriptions for a specific consumer
router.get('/consumer/:consumerId/subscriptions', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Consumer subscriptions API endpoint called');
        console.log('👤 User:', req.user);
        console.log('📋 Consumer ID:', req.params.consumerId);
        
        // Verify admin role
        if (req.user.role !== 'admin') {
            console.log('❌ Access denied - user role:', req.user.role);
            return res.status(403).json({ message: 'Access denied' });
        }

        const { consumerId } = req.params;
        
        console.log('📋 Fetching subscriptions from database for consumer:', consumerId);
        
        // Find subscriptions for this consumer/user
        const subscriptions = await Subscription.find({ userId: consumerId })
            .populate('userId', 'username email')
            .sort({ createdAt: -1 });
        
        console.log('📊 Found', subscriptions.length, 'subscriptions in database');
        
        // Transform subscriptions for frontend
        const transformedSubscriptions = subscriptions.map(sub => ({
            id: sub._id,
            planName: sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1) + ' Plan',
            plan: sub.plan,
            status: sub.status,
            points: sub.points,
            totalPoints: sub.totalPoints,
            startDate: sub.startDate.toISOString().split('T')[0],
            endDate: sub.endDate.toISOString().split('T')[0],
            amount: sub.paymentInfo.amount,
            paymentStatus: sub.paymentInfo.status,
            txid: sub.paymentInfo.txid,
            unlockedFarmersCount: sub.unlockedFarmers.length,
            createdAt: sub.startDate,
            // Add features based on plan type
            features: getSubscriptionFeatures(sub.plan)
        }));
        
        console.log('✅ Returning', transformedSubscriptions.length, 'subscriptions');
        if (transformedSubscriptions.length > 0) {
            console.log('📋 Sample subscription:', JSON.stringify(transformedSubscriptions[0], null, 2));
        }
        
        res.json(transformedSubscriptions);
        
    } catch (error) {
        console.error('❌ Error fetching consumer subscriptions:', error);
        res.status(500).json({ message: 'Error fetching subscription data' });
    }
});

// Helper function to get features based on subscription plan
function getSubscriptionFeatures(plan) {
    const features = {
        basic: [
            '10 negotiations per month',
            'Basic farmer matching',
            'Email support',
            'Standard delivery options'
        ],
        premium: [
            'Unlimited negotiations',
            'Priority farmer matching', 
            'Premium support (24/7)',
            'Free delivery on orders > ₹500',
            'Early access to new products'
        ],
        unlimited: [
            'Unlimited everything',
            'Premium farmer matching',
            'Dedicated account manager',
            'Free delivery on all orders',
            'Exclusive farmer partnerships',
            'Custom pricing negotiations'
        ]
    };
    
    return features[plan] || features.basic;
}

// Update consumer details endpoint
router.put('/consumers/:consumerId', authenticateToken, async (req, res) => {
    try {
        console.log('✏️ Consumer update API endpoint called for ID:', req.params.consumerId);
        
        const consumerId = req.params.consumerId;
        const updateData = req.body;
        
        // Validate required fields
        if (!updateData.fullName || !updateData.email) {
            return res.status(400).json({ message: 'Full name and email are required' });
        }
        
        // Find and update the consumer in Consumer collection
        const updatedConsumer = await Consumer.findByIdAndUpdate(
            consumerId,
            {
                fullName: updateData.fullName,
                email: updateData.email,
                phone: updateData.phone,
                isActive: updateData.isActive,
                deliveryAddress: updateData.deliveryAddress,
                pincode: updateData.pincode,
                updatedAt: new Date()
            },
            { 
                new: true, // Return updated document
                runValidators: true // Run schema validations
            }
        );
        
        if (!updatedConsumer) {
            return res.status(404).json({ message: 'Consumer not found' });
        }
        
        // Also update the corresponding User record if email changed
        if (updateData.email !== updatedConsumer.email) {
            await User.findByIdAndUpdate(
                updatedConsumer.userId,
                { 
                    email: updateData.email,
                    updatedAt: new Date()
                }
            );
        }
        
        console.log('✅ Consumer updated successfully:', updatedConsumer);
        res.status(200).json({ 
            message: 'Consumer updated successfully',
            consumer: updatedConsumer
        });
        
    } catch (error) {
        console.error('❌ Error updating consumer:', error);
        
        // Handle duplicate email error
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Email address already exists' });
        }
        
        res.status(500).json({ 
            message: 'Error updating consumer',
            error: error.message 
        });
    }
});

// Delete transaction (Deal) endpoint
router.delete('/transactions/:transactionId', authenticateToken, async (req, res) => {
    try {
        console.log('🗑️ Transaction delete API endpoint called for ID:', req.params.transactionId);
        
        const transactionId = req.params.transactionId;
        
        // Try to find and delete the deal/transaction
        let deletedRecord = await Deal.findOneAndDelete({ 
            $or: [
                { _id: transactionId },
                { id: transactionId }
            ]
        });
        
        // If not found in Deal collection, try Order collection
        if (!deletedRecord) {
            deletedRecord = await Order.findOneAndDelete({ 
                $or: [
                    { _id: transactionId },
                    { id: transactionId }
                ]
            });
        }
        
        if (deletedRecord) {
            console.log('✅ Transaction deleted from database:', deletedRecord);
            res.status(200).json({ 
                message: 'Transaction deleted successfully',
                deletedRecord: deletedRecord
            });
        } else {
            console.log('❌ Transaction not found in database:', transactionId);
            res.status(404).json({ message: 'Transaction not found in database' });
        }
        
    } catch (error) {
        console.error('❌ Error deleting transaction:', error);
        res.status(500).json({ 
            message: 'Error deleting transaction from database',
            error: error.message 
        });
    }
});

module.exports = router;