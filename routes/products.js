const express = require('express');
const router = express.Router();
const ProductPrice = require('../models/ProductPrice.js'); // Use ProductPrice instead of Product
const User = require('../models/User');
const { authenticateToken, isFarmer } = require('../middleware/auth');

// Get farmer's own products
router.get('/my-products', authenticateToken, isFarmer, async (req, res) => {
    try {
        const farmerId = req.user.id;
        // console.log('🚜 Fetching products for farmer:', farmerId);
        // console.log('🚜 User object:', { id: req.user.id, email: req.user.email, role: req.user.role });
        
        // Debug: Check all products in database first
        const allProducts = await ProductPrice.find({}).exec();
        // console.log('🔍 All products in database:', allProducts.length);
        // allProducts.forEach(product => {
        //     console.log(`🔍 Product: ${product.name}, FarmerId: ${product.farmerId}, Active: ${product.active}`);
        // });
        
        const products = await ProductPrice.find({ farmerId, active: true })
            .sort({ createdAt: -1 })
            .exec();
        
        // console.log(`📦 Found ${products.length} products for farmer ${farmerId}`);
        // console.log('📦 Products:', products.map(p => ({ name: p.name, price: p.price, quantity: p.quantity })));
        
        // Send response with proper headers
        res.setHeader('Content-Type', 'application/json');
        res.json(products);
    } catch (error) {
        console.error('❌ Error fetching farmer products:', error);
        res.status(500).json({ message: error.message });
    }
});

// Test endpoint (temporary)
router.get('/test', (req, res) => {
    res.json({ message: 'Products route is working!', timestamp: new Date() });
});

// Add a new product (Farmer only)
router.post('/', authenticateToken, isFarmer, async (req, res) => {
    try {
        const product = new ProductPrice({
            ...req.body,
            farmerId: req.user.id
        });
        await product.save();
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all active products (paginated) - now protected for authenticated users only
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10, category } = req.query;
        const query = { active: true };
        if (category) query.category = category;

        const products = await ProductPrice.find(query)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('farmerId', 'username')
            .exec();

        const count = await ProductPrice.countDocuments(query);
        
        res.json({
            products,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get only fruit products for fruit.html (MUST be before /:id route)
router.get('/fruit', authenticateToken, async (req, res) => {
    try {
        const products = await ProductPrice.find({ category: 'Fruits', active: true })
            .populate('farmerId', 'username')
            .exec();
        res.json(products);
    } catch (error) {
        console.error('❌ Error fetching fruits:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get only vegetable products for vegetables.html
router.get('/vegetables', authenticateToken, async (req, res) => {
    try {
        const products = await ProductPrice.find({ category: 'Vegetables', active: true })
            .populate('farmerId', 'username')
            .exec();
        res.json(products);
    } catch (error) {
        console.error('❌ Error fetching vegetables:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get only grain products for grains.html
router.get('/grains', authenticateToken, async (req, res) => {
    try {
        console.log('🌾 Fetching grains with category: Grains, active: true');
        const products = await ProductPrice.find({ category: 'Grains', active: true })
            .populate('farmerId', 'username')
            .exec();
        console.log(`🌾 Found ${products.length} grains`);
        console.log('🌾 Grains:', products.map(p => ({ name: p.name, category: p.category, active: p.active })));
        res.json(products);
    } catch (error) {
        console.error('❌ Error fetching grains:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get only dairy products for dairy.html
router.get('/dairy', authenticateToken, async (req, res) => {
    try {
        console.log('🥛 Fetching dairy with category: Dairy, active: true');
        const products = await ProductPrice.find({ category: 'Dairy', active: true })
            .populate('farmerId', 'username')
            .exec();
        console.log(`🥛 Found ${products.length} dairy products`);
        console.log('🥛 Dairy:', products.map(p => ({ name: p.name, category: p.category, active: p.active })));
        res.json(products);
    } catch (error) {
        console.error('❌ Error fetching dairy products:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get only egg products for eggs.html
router.get('/eggs', authenticateToken, async (req, res) => {
    try {
        console.log('🥚 Fetching eggs with category: Eggs, active: true');
        const products = await ProductPrice.find({ category: 'Eggs', active: true })
            .populate('farmerId', 'username')
            .exec();
        console.log(`🥚 Found ${products.length} egg products`);
        console.log('🥚 Eggs:', products.map(p => ({ name: p.name, category: p.category, active: p.active })));
        res.json(products);
    } catch (error) {
        console.error('❌ Error fetching eggs:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get only coffee products for coffee.html
router.get('/coffee', authenticateToken, async (req, res) => {
    try {
        console.log('☕ Fetching coffee with category: Coffee, active: true');
        const products = await ProductPrice.find({ category: 'Coffee', active: true })
            .populate('farmerId', 'username')
            .exec();
        console.log(`☕ Found ${products.length} coffee products`);
        console.log('☕ Coffee:', products.map(p => ({ name: p.name, category: p.category, active: p.active })));
        res.json(products);
    } catch (error) {
        console.error('❌ Error fetching coffee products:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get a specific product
router.get('/:id', async (req, res) => {
    try {
        const product = await ProductPrice.findById(req.params.id)
            .populate('farmerId', 'username');
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update a product (Farmer only)
router.put('/:id', authenticateToken, isFarmer, async (req, res) => {
    try {
        const product = await ProductPrice.findOne({ _id: req.params.id, farmerId: req.user.id });
        if (!product) {
            return res.status(404).json({ message: 'Product not found or unauthorized' });
        }

        Object.assign(product, req.body);
        await product.save();
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete/Deactivate a product (Farmer only)
router.delete('/:id', authenticateToken, isFarmer, async (req, res) => {
    try {
        const product = await ProductPrice.findOne({ _id: req.params.id, farmerId: req.user.id });
        if (!product) {
            return res.status(404).json({ message: 'Product not found or unauthorized' });
        }

    await ProductPrice.deleteOne({ _id: req.params.id, farmerId: req.user.id });
    res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
