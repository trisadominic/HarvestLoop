/**
 * Enhanced error handling middleware for better API reliability
 * Prevents "site can't be reached" errors by implementing proper error recovery
 */

const mongoose = require('mongoose');

// Graceful shutdown handler
let isShuttingDown = false;

process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    isShuttingDown = true;
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    isShuttingDown = true;
});

// Database connection error recovery
mongoose.connection.on('error', (err) => {
    console.error('💥 MongoDB connection error:', err);
    if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
        console.log('🔄 Attempting to reconnect to MongoDB...');
        setTimeout(() => {
            mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/harvestloop', {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                maxPoolSize: 10
            });
        }, 5000);
    }
});

mongoose.connection.on('disconnected', () => {
    console.log('💔 MongoDB disconnected');
    if (!isShuttingDown) {
        console.log('🔄 Attempting to reconnect...');
        setTimeout(() => {
            mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/harvestloop');
        }, 5000);
    }
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
});

// Enhanced error handling middleware
const errorHandler = (err, req, res, next) => {
    console.error('🚨 Error caught by middleware:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    // Don't handle errors if response is already sent
    if (res.headersSent) {
        return next(err);
    }

    // Handle specific error types
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: 'Invalid ID format provided'
        });
    }

    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors
        });
    }

    if (err.name === 'MongoError' || err.name === 'MongoNetworkError') {
        return res.status(503).json({
            success: false,
            message: 'Database temporarily unavailable. Please try again in a moment.'
        });
    }

    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        return res.status(503).json({
            success: false,
            message: 'Service temporarily unavailable. Please try again later.'
        });
    }

    if (err.code === 'ETIMEDOUT' || err.name === 'TimeoutError') {
        return res.status(504).json({
            success: false,
            message: 'Request timed out. Please try again.'
        });
    }

    // Default server error
    res.status(500).json({
        success: false,
        message: 'An unexpected error occurred. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};

// Request timeout middleware
const requestTimeout = (timeoutMs = 30000) => {
    return (req, res, next) => {
        // Set timeout for the request
        req.setTimeout(timeoutMs, () => {
            const error = new Error('Request timeout');
            error.name = 'TimeoutError';
            next(error);
        });

        // Set timeout for the response
        res.setTimeout(timeoutMs, () => {
            if (!res.headersSent) {
                res.status(504).json({
                    success: false,
                    message: 'Request timed out. Please try again.'
                });
            }
        });

        next();
    };
};

// Health check endpoint
const healthCheck = (req, res) => {
    const health = {
        uptime: process.uptime(),
        message: 'API is healthy',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    };

    const status = mongoose.connection.readyState === 1 ? 200 : 503;
    res.status(status).json(health);
};

// Rate limiting middleware (simple implementation)
const rateLimitMap = new Map();

const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    return (req, res, next) => {
        const key = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean old entries
        if (rateLimitMap.has(key)) {
            const requests = rateLimitMap.get(key).filter(time => time > windowStart);
            rateLimitMap.set(key, requests);
        }

        const requests = rateLimitMap.get(key) || [];
        
        if (requests.length >= maxRequests) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please try again later.',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }

        requests.push(now);
        rateLimitMap.set(key, requests);
        next();
    };
};

// CORS with better error handling
const corsHandler = (req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://10.31.13.192:3000',
        process.env.FRONTEND_URL
    ].filter(Boolean);

    if (allowedOrigins.includes(origin) || !origin) {
        res.header('Access-Control-Allow-Origin', origin || '*');
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
};

module.exports = {
    errorHandler,
    requestTimeout,
    healthCheck,
    rateLimit,
    corsHandler
};