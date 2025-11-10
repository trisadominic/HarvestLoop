const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Deal = require('../models/Deal');
const ProductPrice = require('../models/ProductPrice');

// System health monitoring endpoint
router.get('/health', async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            environment: process.env.NODE_ENV || 'development',
            checks: {}
        };

        // Database connectivity check
        try {
            health.checks.database = {
                status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
                readyState: mongoose.connection.readyState,
                host: mongoose.connection.host,
                name: mongoose.connection.name
            };
        } catch (error) {
            health.checks.database = {
                status: 'error',
                error: error.message
            };
            health.status = 'unhealthy';
        }

        // API endpoints check
        try {
            const dealCount = await Deal.countDocuments();
            const productCount = await ProductPrice.countDocuments();
            
            health.checks.api = {
                status: 'operational',
                deals_count: dealCount,
                products_count: productCount
            };
        } catch (error) {
            health.checks.api = {
                status: 'error',
                error: error.message
            };
            health.status = 'degraded';
        }

        // Email service check (basic)
        health.checks.email = {
            status: process.env.EMAIL_USER ? 'configured' : 'not_configured',
            service: process.env.EMAIL_SERVICE || 'not_set'
        };

        const statusCode = health.status === 'healthy' ? 200 : 
                          health.status === 'degraded' ? 200 : 503;

        res.status(statusCode).json(health);
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// Deal monitoring endpoint
router.get('/deals/stats', async (req, res) => {
    try {
        const stats = await Deal.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const recentDeals = await Deal.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('productId', 'name')
            .select('status createdAt proposedPrice originalPrice');

        res.json({
            success: true,
            data: {
                statusBreakdown: stats,
                recentDeals: recentDeals,
                totalDeals: await Deal.countDocuments()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Connection test endpoint
router.get('/ping', (req, res) => {
    res.json({
        success: true,
        message: 'pong',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;