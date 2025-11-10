const express = require('express');
const router = express.Router();
const { authenticateToken, isFarmer } = require('../middleware/auth');
const Product = require('../models/Product');
const ProductPrice = require('../models/ProductPrice'); // Add ProductPrice model
const Order = require('../models/Order');
const Deal = require('../models/Deal');
const Notification = require('../models/Notification');
const Farmer = require('../models/Farmer');

// Get farmer's dashboard data
router.get('/dashboard', authenticateToken, isFarmer, async (req, res) => {
    try {
        // Get recent orders
        const orders = await Order.find({ farmerId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('productId consumerId');

        // Get active deals
        const deals = await Deal.find({
            farmerId: req.user.id,
            status: { $in: ['pending', 'accepted'] }
        })
            .sort({ createdAt: -1 })
            .populate('productId consumerId');

        // Get product statistics - check both Product and ProductPrice models
        const products = await Product.find({ farmerId: req.user.id });
        const productPrices = await ProductPrice.find({ farmerId: req.user.id });
        const allProducts = [...products, ...productPrices];
        
        const productStats = {
            total: allProducts.length,
            active: allProducts.filter(p => p.active !== false).length,
            outOfStock: allProducts.filter(p => p.quantity === 0).length
        };

        // Get order statistics
        const allOrders = await Order.find({ farmerId: req.user.id });
        const orderStats = {
            total: allOrders.length,
            purchased: allOrders.filter(o => o.status === 'purchased').length,
            pending: allOrders.filter(o => o.status === 'pending').length,
            totalRevenue: allOrders.reduce((sum, order) => {
                return order.status === 'purchased' ? sum + (order.price * order.quantity) : sum;
            }, 0)
        };

        res.json({
            orders,
            deals,
            productStats,
            orderStats
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get farmer's revenue
router.get('/revenue', authenticateToken, isFarmer, async (req, res) => {
    try {
        const orders = await Order.find({ 
            farmerId: req.user.id,
            status: 'purchased'
        });
        
        const revenue = orders.reduce((sum, order) => sum + (order.price * order.quantity), 0);
        res.json({ revenue });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get farmer's active products count
router.get('/active-products', authenticateToken, isFarmer, async (req, res) => {
    try {
        // Check both Product and ProductPrice models
        const productCount = await Product.countDocuments({ 
            farmerId: req.user.id,
            active: true 
        });
        const productPriceCount = await ProductPrice.countDocuments({ 
            farmerId: req.user.id,
            active: { $ne: false } // ProductPrice may not have active field set to true
        });
        
        const totalCount = productCount + productPriceCount;
        res.json({ count: totalCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get farmer's new orders count
router.get('/new-orders', authenticateToken, isFarmer, async (req, res) => {
    try {
        const newOrdersCount = await Order.countDocuments({ 
            farmerId: req.user.id,
            status: 'pending'
        });
        res.json({ count: newOrdersCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get farmer's total purchased items count
router.get('/purchased-items', authenticateToken, isFarmer, async (req, res) => {
    try {
        const purchasedOrders = await Order.find({ 
            farmerId: req.user.id,
            status: 'purchased'
        });
        
        // Calculate total quantity of purchased items
        const totalPurchasedItems = purchasedOrders.reduce((sum, order) => sum + order.quantity, 0);
        
        // Calculate this month's purchases for growth comparison
        const now = new Date();
        const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        
        const thisMonthOrders = purchasedOrders.filter(order => 
            order.createdAt >= firstDayThisMonth
        );
        const lastMonthOrders = purchasedOrders.filter(order => 
            order.createdAt >= firstDayLastMonth && order.createdAt <= lastDayLastMonth
        );
        
        const thisMonthItems = thisMonthOrders.reduce((sum, order) => sum + order.quantity, 0);
        const lastMonthItems = lastMonthOrders.reduce((sum, order) => sum + order.quantity, 0);
        
        // Calculate growth percentage
        let growthText = "Items sold to date";
        if (lastMonthItems > 0) {
            const growthPercent = ((thisMonthItems - lastMonthItems) / lastMonthItems * 100).toFixed(1);
            if (growthPercent > 0) {
                growthText = `+${growthPercent}% from last month`;
            } else if (growthPercent < 0) {
                growthText = `${growthPercent}% from last month`;
            } else {
                growthText = "Same as last month";
            }
        } else if (thisMonthItems > 0) {
            growthText = `+${thisMonthItems} items this month`;
        }
        
        res.json({ 
            count: totalPurchasedItems,
            growthText: growthText,
            thisMonth: thisMonthItems,
            lastMonth: lastMonthItems
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get farmer's recent activity
router.get('/recent-activity', authenticateToken, isFarmer, async (req, res) => {
    try {
        // Get recent orders
        const recentOrders = await Order.find({ farmerId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(3)
            .populate('productId consumerId');
        
        // Get recent products added
        const recentProducts = await ProductPrice.find({ farmerId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(3);
            
        // Combine activities
        let activities = [];
        
        // Add order activities
        recentOrders.forEach(order => {
            activities.push({
                type: 'order',
                message: `New order for ${order.productId?.name || 'Unknown Product'}`,
                timestamp: order.createdAt,
                status: order.status,
                icon: 'shopping-cart'
            });
        });
        
        // Add product activities
        recentProducts.forEach(product => {
            activities.push({
                type: 'product',
                message: `Added new product: ${product.name}`,
                timestamp: product.createdAt,
                status: 'active',
                icon: 'plus-circle'
            });
        });
        
        // Sort all activities by timestamp and limit to 5 most recent
        activities = activities
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5);
        
        res.json({ activity: activities });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get farmer profile
router.get('/profile', authenticateToken, isFarmer, async (req, res) => {
    try {
        const farmer = await Farmer.findOne({ userId: req.user.id });
        if (!farmer) {
            // Create farmer profile if it doesn't exist
            const newFarmer = new Farmer({
                userId: req.user.id,
                farmName: '',
                farmAddress: '',
                farmProducts: [],
                pincode: ''
            });
            await newFarmer.save();
            return res.json(newFarmer);
        }
        res.json(farmer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update farmer profile
router.put('/profile', authenticateToken, isFarmer, async (req, res) => {
    try {
        const { farmName, farmAddress, pincode, farmProducts } = req.body;
        
        let farmer = await Farmer.findOne({ userId: req.user.id });
        if (!farmer) {
            // Create farmer profile if it doesn't exist
            farmer = new Farmer({
                userId: req.user.id,
                farmName: farmName || '',
                farmAddress: farmAddress || '',
                farmProducts: farmProducts || [],
                pincode: pincode || ''
            });
        } else {
            // Update existing farmer profile
            farmer.farmName = farmName || farmer.farmName;
            farmer.farmAddress = farmAddress || farmer.farmAddress;
            farmer.pincode = pincode || farmer.pincode;
            if (farmProducts) farmer.farmProducts = farmProducts;
        }
        
        await farmer.save();
        console.log('✅ Farmer profile updated successfully:', farmer._id);
        res.json({ message: 'Profile updated successfully', farmer });
    } catch (error) {
        console.error('❌ Error updating farmer profile:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
