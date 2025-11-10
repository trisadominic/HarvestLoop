const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const ProductPrice = require('../models/ProductPrice');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { authenticateToken } = require('../middleware/auth');

// Create a new order (direct purchase)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const product = await ProductPrice.findById(productId);
        
        if (!product || !product.active) {
            return res.status(404).json({ message: 'Product not found or inactive' });
        }

        if (quantity > product.quantity) {
            return res.status(400).json({ message: 'Requested quantity not available' });
        }

        const order = new Order({
            productId,
            farmerId: product.farmerId,
            consumerId: req.user.id,
            quantity,
            price: product.price * quantity, // Total price
            status: 'pending'
        });

        await order.save();
        
        // Update product quantity
        product.quantity -= quantity;
        if (product.quantity === 0) product.active = false;
        await product.save();

        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user's orders (as farmer or consumer) including cancelled deals
router.get('/my-orders', authenticateToken, async (req, res) => {
    try {
        const { role, status } = req.query;
        const query = {
            [role === 'farmer' ? 'farmerId' : 'consumerId']: req.user.id
        };
        
        if (status) {
            query.status = status;
        }

        // Fetch regular orders
        const orders = await Order.find(query)
            .populate('productId') // This will populate from ProductPrice
            .populate('consumerId', 'username phone email') // Populate consumer details
            .populate('farmerId', 'username phone email') // Populate farmer details
            .sort({ createdAt: -1 });

        // console.log(`📦 Found ${orders.length} orders for user ${req.user.id} as ${role}`);

        // Fetch ALL deals (not just cancelled ones) for both farmers and consumers
        const Deal = require('../models/Deal');
        let deals = [];
        
        if (role === 'farmer') {
            // For farmers, get deals where they are the farmer
            deals = await Deal.find({ farmerId: req.user.id })
                .populate('productId')
                .populate('consumerId', 'username phone email')
                .sort({ createdAt: -1 });
        } else {
            // For consumers, get deals where they are the consumer
            deals = await Deal.find({ consumerId: req.user.id })
                .populate('productId')
                .populate('farmerId', 'username phone email')
                .sort({ createdAt: -1 });
        }
        
        // console.log(`🤝 Found ${deals.length} deals for ${role} ${req.user.id}`);

        // Convert deals to order-like format for display
        const dealsAsOrders = deals.map(deal => ({
            _id: deal._id,
            status: deal.status, // Keep original deal status (pending, accepted, declined, etc.)
            price: deal.proposedPrice * deal.quantity, // Total amount based on proposed price
            originalPrice: deal.originalPrice * deal.quantity, // Original total price
            quantity: deal.quantity,
            productId: deal.productId,
            consumerId: deal.consumerId,
            farmerId: deal.farmerId,
            createdAt: deal.createdAt,
            updatedAt: deal.updatedAt,
            dealId: deal._id,
            type: 'deal', // Flag to identify as deal vs order
            proposedPrice: deal.proposedPrice,
            message: deal.message,
            expiresAt: deal.expiresAt,
            farmerResponseAt: deal.farmerResponseAt,
            consumerResponseAt: deal.consumerResponseAt
        }));

        // Combine orders and deals
        const allItems = [...orders, ...dealsAsOrders].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
            
        // Debug: Show order details
        // orders.forEach((order, index) => {
        //     console.log(`📋 Order ${index + 1}:`, {
        //         id: order._id,
        //         status: order.status,
        //         price: order.price,
        //         quantity: order.quantity,
        //         product: order.productId?.name,
        //         consumer: order.consumerId?.username,
        //         createdAt: order.createdAt,
        //         dealId: order.dealId
        //     });
        // });

        // Debug: Show deal details (all statuses)
        // deals.forEach((deal, index) => {
        //     console.log(`🤝 Deal ${index + 1}:`, {
        //         id: deal._id,
        //         status: deal.status,
        //         price: deal.proposedPrice * deal.quantity,
        //         quantity: deal.quantity,
        //         product: deal.productId?.name,
        //         consumer: deal.consumerId?.username,
        //         farmer: deal.farmerId?.username,
        //         createdAt: deal.createdAt
        //     });
        // });
        
        // Filter by status if specified
        let filteredItems = allItems;
        if (status) {
            filteredItems = allItems.filter(item => item.status === status);
            console.log(`🔍 Filtered to ${filteredItems.length} items with status '${status}'`);
        }
        
        res.json(filteredItems);
    } catch (error) {
        console.error('❌ Error fetching orders:', error);
        res.status(500).json({ message: error.message });
    }
});

// Update order status
router.put('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findOne({
            _id: req.params.id,
            $or: [
                { farmerId: req.user.id },
                { consumerId: req.user.id }
            ]
        });
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found or unauthorized' });
        }

        if (!['purchased', 'cancelled'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const oldStatus = order.status;
        order.status = status;
        
        // If farmer is accepting the order (purchased status)
        if (status === 'purchased' && req.user.role === 'Farmer' && oldStatus === 'pending') {
            // Get farmer details to send to consumer
            const farmer = await User.findById(order.farmerId).select('username phone email');
            const farmerDetails = await require('../models/Farmer').findOne({ userId: order.farmerId });
            
            const farmerInfo = {
                username: farmer.username,
                phone: farmer.phone,
                email: farmer.email,
                farmAddress: farmerDetails?.farmAddress || 'Address not provided',
                pincode: farmerDetails?.pincode || 'Pincode not provided',
                farmName: farmerDetails?.farmName || 'Farm name not provided'
            };

            await order.save();

            // Send response with farmer details for accepted order
            return res.json({ 
                order, 
                farmerDetails: farmerInfo,
                message: 'Order accepted! Farmer details will be shared with the consumer.'
            });
        }
        
        // If farmer is cancelling the order
        if (status === 'cancelled' && req.user.role === 'Farmer' && oldStatus === 'pending') {
            // Refund subscription point to consumer
            const Subscription = require('../models/Subscription');
            const subscription = await Subscription.findOne({ 
                userId: order.consumerId,
                status: 'active'
            });
            
            if (subscription) {
                // Find the unlocked farmer entry for this order and remove it
                const unlockedFarmerIndex = subscription.unlockedFarmers.findIndex(
                    uf => uf.orderId?.toString() === order._id.toString()
                );
                
                if (unlockedFarmerIndex > -1) {
                    subscription.unlockedFarmers.splice(unlockedFarmerIndex, 1);
                    subscription.points++; // Refund the point
                    await subscription.save();
                }
            }
        }

        await order.save();
        
        const statusMessages = {
            'purchased': 'Order completed! Consumer has successfully purchased the product.',
            'cancelled': 'Order cancelled. The negotiation has been ended.'
        };
        
        res.json({ 
            order, 
            message: statusMessages[status] || `Order status updated to ${status} successfully!`
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get farmer details for accepted order (consumer endpoint)
router.get('/:id/farmer-details', authenticateToken, async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            consumerId: req.user.id,
            status: 'purchased' // Only show farmer details for accepted orders
        });
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found, not accepted yet, or unauthorized' });
        }

        // Get farmer details
        const farmer = await User.findById(order.farmerId).select('username phone email');
        const farmerDetails = await require('../models/Farmer').findOne({ userId: order.farmerId });
        
        const farmerInfo = {
            username: farmer.username,
            phone: farmer.phone,
            email: farmer.email,
            farmAddress: farmerDetails?.farmAddress || 'Address not provided',
            pincode: farmerDetails?.pincode || 'Pincode not provided',
            farmName: farmerDetails?.farmName || 'Farm name not provided'
        };

        res.json({ farmer: farmerInfo, order });
    } catch (error) {
        console.error('Error fetching farmer details:', error);
        res.status(500).json({ message: error.message });
    }
});

// Cancel order (consumer endpoint)
router.put('/:id/cancel', authenticateToken, async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            consumerId: req.user.id,
            status: 'pending' // Can only cancel pending orders
        });
        
        if (!order) {
            return res.status(404).json({ 
                message: 'Order not found, already processed, or unauthorized' 
            });
        }

        // Update order status to cancelled
        order.status = 'cancelled';
        await order.save();

        // Restore product quantity
        const product = await ProductPrice.findById(order.productId);
        if (product) {
            product.quantity += order.quantity;
            product.active = true; // Reactivate if it was deactivated due to stock
            await product.save();
            console.log(`📦 Restored ${order.quantity} units to product ${product.name || product.product_name}`);
        }

        // Create notification for farmer about cancelled order
        const Notification = require('../models/Notification');
        const consumer = await User.findById(req.user.id).select('username');
        
        const notification = new Notification({
            userId: order.farmerId,
            type: 'orderCancelled',
            message: `${consumer.username} has cancelled order #${order._id.toString().slice(-8).toUpperCase()}`,
            relatedOrder: order._id,
            read: false
        });
        
        await notification.save();

        res.json({ 
            message: 'Order cancelled successfully',
            order: order
        });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
