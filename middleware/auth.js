const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        // console.log('🔐 Auth middleware - Header:', authHeader ? 'Present' : 'Missing');
        // console.log('🔐 Auth middleware - Token:', token ? 'Extracted' : 'Not found');

        if (!token) {
            console.log('❌ Auth middleware - No token provided');
            return res.status(401).json({ message: 'Authentication token required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // console.log('🔓 Auth middleware - Token decoded for user:', decoded.id);
        
        const user = await User.findById(decoded.id);
        
        if (!user) {
            console.log('⚠️  Auth middleware - Stale token detected for non-existent user:', decoded.id);
            return res.status(401).json({ 
                message: 'Session expired or user not found', 
                code: 'USER_NOT_FOUND',
                action: 'Please login again'
            });
        }

        // console.log('✅ Auth middleware - User authenticated:', user.email, 'Role:', user.role);
        req.user = user;
        next();
    } catch (error) {
        console.log('❌ Auth middleware - Token verification failed:', error.message);
        res.status(401).json({ message: 'Invalid token' });
    }
};

const isFarmer = (req, res, next) => {
    if (req.user.role !== 'Farmer') {
        return res.status(403).json({ message: 'Access denied. Farmers only.' });
    }
    next();
};

const isConsumer = (req, res, next) => {
    if (req.user.role !== 'Consumer') {
        return res.status(403).json({ message: 'Access denied. Consumers only.' });
    }
    next();
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    next();
};

module.exports = {
    authenticateToken,
    isFarmer,
    isConsumer,
    isAdmin
};
