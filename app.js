const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { spawn } = require('child_process');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { execFile } = require('child_process');
const jwt = require('jsonwebtoken');
const os = require('os');

// Load environment variables
require('dotenv').config();

// Import enhanced error handling middleware
const { errorHandler, requestTimeout, healthCheck, rateLimit, corsHandler } = require('./middleware/errorHandler');

const User = require('./models/User');
const Farmer = require('./models/Farmer');
const Consumer = require('./models/Consumer');
const Subscription = require('./models/Subscription');
const FarmerDashboard = require('./models/Farmer-dashboard');
const ProductPrice = require('./models/ProductPrice.js');
const Order = require('./models/Order');
const Notification = require('./models/Notification');

const app = express();

// Email configuration for OTP
const emailConfig = {
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
    }
};

// Alternative configuration for other providers
if (process.env.EMAIL_SERVICE === 'custom') {
    emailConfig.host = process.env.EMAIL_HOST;
    emailConfig.port = process.env.EMAIL_PORT || 587;
    emailConfig.secure = process.env.EMAIL_SECURE === 'true';
    delete emailConfig.service;
}

const transporter = nodemailer.createTransport(emailConfig);

// Function to send OTP email
async function sendOTPEmail(email, otp, username) {
    try {
        // console.log('📧 Attempting to send email to:', email);
        // console.log('📧 Using email config:', {
        //     service: emailConfig.service,
        //     user: emailConfig.auth.user,
        //     passLength: emailConfig.auth.pass ? emailConfig.auth.pass.length : 0
        // });

        const mailOptions = {
            from: `"HarvestLoop" <${emailConfig.auth.user}>`,
            to: email,
            subject: 'HarvestLoop - Your Login OTP',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4ded80;">HarvestLoop - Login Verification</h2>
                    <p>Hello ${username},</p>
                    <p>Your One-Time Password (OTP) for logging into HarvestLoop is:</p>
                    <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p>This OTP is valid for 5 minutes only.</p>
                    <p>If you didn't request this login, please ignore this email.</p>
                    <p>Best regards,<br>HarvestLoop Team</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        // console.log('✅ OTP email sent successfully to:', email);
        return true;
    } catch (error) {
        console.error('❌ Failed to send OTP email:', error.message);
        console.error('❌ Error code:', error.code);
        return false;
    }
}

// Enhanced Middleware with better error handling and timeouts
app.use(requestTimeout(30000)); // 30 second timeout
app.use(rateLimit(1000, 15 * 60 * 1000)); // 1000 requests per 15 minutes
app.use(corsHandler); // Enhanced CORS handling
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const allowedMimeTypes = /image\/(jpeg|jpg|png|gif)/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedMimeTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files (JPEG, JPG, PNG, GIF) are allowed!'));
        }
    }
});

// Serve static files
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Debug middleware to log all requests (commented out for cleaner output)
// app.use((req, res, next) => {
//     console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`, req.body || '');
//     next();
// });

// API routes
const apiRoutes = require('./routes/api');
const signupRoutes = require('./routes/signup');
const productsRoutes = require('./routes/products');
const farmerDashboardRoutes = require('./routes/farmer-dashboard');
const ordersRoutes = require('./routes/orders');
const { router: notificationsRoutes } = require('./routes/notifications');
const subscriptionsRoutes = require('./routes/subscriptions');
const dealsRoutes = require('./routes/deals');
const farmersRoutes = require('./routes/farmers');
const consumersRoutes = require('./routes/consumers');
const monitoringRoutes = require('./routes/monitoring');
const adminRoutes = require('./routes/admin');

app.use('/api', apiRoutes);
app.use('/signup', signupRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/farmer', farmerDashboardRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/farmers', farmersRoutes);
app.use('/api/consumers', consumersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/monitoring', monitoringRoutes);

// Health check endpoint
app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

// Enhanced error handling middleware (must be after all routes)
app.use(errorHandler);

// Catch-all route (move this to the end!)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Login route
app.post('/login', async (req, res) => {
    try {
        // console.log('🔐 Login attempt:', { email: req.body.email, hasPassword: !!req.body.password });
        
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Handle both hashed and plain text passwords for backward compatibility
        let passwordMatch = false;
        
        if (user.password.startsWith('$2b$')) {
            // Password is hashed with bcrypt
            passwordMatch = await bcrypt.compare(password, user.password);
        } else {
            // Password is stored as plain text (legacy)
            passwordMatch = user.password === password;
        }
        
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // console.log('✅ Login successful for user:', user.email, 'Role:', user.role);

        // For farmers, send OTP via email and require verification
        if (user.role === 'Farmer') {
            try {
                // Generate OTP
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                
                // Store OTP temporarily (5 minutes expiry)
                global.otpStore = global.otpStore || new Map();
                global.otpStore.set(user._id.toString(), {
                    otp,
                    expiry: Date.now() + 5 * 60 * 1000,
                    attempts: 0
                });

                // Send OTP via email
                const emailSent = await sendOTPEmail(user.email, otp, user.username);
                
                if (!emailSent) {
                    // Fallback: log OTP to console if email fails
                    console.log(`📧 OTP for farmer ${user.email}: ${otp} (Email failed, using console)`);
                }
                
                // Return response indicating OTP sent
                return res.json({
                    message: emailSent ? 'OTP sent to your email' : 'OTP generated (check console - email service unavailable)',
                    role: user.role,
                    userId: user._id.toString(),
                    requiresOTP: true
                });
            } catch (error) {
                console.error('❌ OTP generation error:', error);
                return res.status(500).json({ message: 'Failed to send OTP' });
            }
        }

        // For consumers and admin users, direct login
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            role: user.role,
            userId: user._id.toString(),
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('❌ Login Error:', error);
        res.status(500).json({ message: 'Login failed', error: error.message });
    }
});

// OTP Verification route for farmers
app.post('/verify-otp', async (req, res) => {
    try {
        // console.log('🔑 OTP verification attempt:', { userId: req.body.userId, hasOTP: !!req.body.otp });
        
        const { userId, otp } = req.body;
        
        if (!userId || !otp) {
            return res.status(400).json({ message: 'User ID and OTP are required' });
        }

        // Get stored OTP
        global.otpStore = global.otpStore || new Map();
        const otpData = global.otpStore.get(userId);
        
        if (!otpData) {
            return res.status(400).json({ message: 'OTP expired or not requested' });
        }

        // Check attempts
        if (otpData.attempts >= 3) {
            global.otpStore.delete(userId);
            return res.status(400).json({ message: 'Too many attempts. Please login again.' });
        }

        // Check expiry
        if (Date.now() > otpData.expiry) {
            global.otpStore.delete(userId);
            return res.status(400).json({ message: 'OTP expired. Please login again.' });
        }

        // Verify OTP
        if (otpData.otp !== otp) {
            otpData.attempts++;
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // Get user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Clear OTP
        global.otpStore.delete(userId);

        // console.log('✅ OTP verification successful for farmer:', user.email);

        // Generate JWT token for farmers
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'OTP verification successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('❌ OTP Verification Error:', error);
        res.status(500).json({ message: 'OTP verification failed', error: error.message });
    }
});

// Reset Password Route
app.post('/reset-password', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'No account found with this email address' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Update user password
        user.password = hashedPassword;
        await user.save();

        console.log('✅ Password reset successful for user:', email);

        res.status(200).json({ message: 'Password reset successful' });

    } catch (err) {
        console.error('❌ Password reset error:', err);
        res.status(500).json({ message: 'Password reset failed. Please try again.' });
    }
});

// AI Price Suggestion route
app.post('/api/price-suggestion', async (req, res) => {
    try {
        const { productName } = req.body;
        
        if (!productName) {
            return res.status(400).json({ error: 'Product name is required' });
        }

        console.log('🤖 AI Price Suggestion requested for:', productName);

        // Execute Python script for price suggestion
        const { execFile } = require('child_process');
        const path = require('path');
        
        const pythonPath = 'python'; // or 'python3' on some systems
        const scriptPath = path.join(__dirname, 'price_suggester.py');
        
        execFile(pythonPath, [scriptPath, productName], { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Python script error:', error);
                console.error('❌ Stderr:', stderr);
                return res.status(500).json({ 
                    error: 'AI service is temporarily unavailable. Please set price manually or try again later.',
                    userMessage: 'Our AI assistant is taking a break! 🤖💤 Please enter your price manually based on local market rates.',
                    fallback_price: 50 // Fallback price
                });
            }

            try {
                // Clean the output to remove any non-JSON content
                const cleanOutput = stdout.trim();
                console.log('🐍 Python script output:', cleanOutput);
                
                const result = JSON.parse(cleanOutput);
                console.log('✅ AI Price Suggestion result:', result);
                res.json(result);
            } catch (parseError) {
                console.error('❌ Failed to parse Python output:', parseError);
                console.error('❌ Raw output:', stdout);
                res.status(500).json({ 
                    error: 'AI service returned unexpected data. Please try again or set price manually.',
                    userMessage: 'Our AI got a bit confused! 🤖🤔 Please try again in a moment or set your price based on local market rates.',
                    fallback_price: 50
                });
            }
        });
    } catch (error) {
        console.error('❌ Price suggestion error:', error);
        res.status(500).json({ 
            error: 'Price suggestion service unavailable',
            fallback_price: 50
        });
    }
});

// Upload image route
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  res.json({ imageUrl: `/uploads/${req.file.filename}` });
});

// Test email route (for debugging)
app.post('/test-email', async (req, res) => {
    try {
        const { email } = req.body;
        const testOTP = '123456';
    const success = await sendOTPEmail(email || 'test@example.com', testOTP, 'Test User');
        
        res.json({
            success,
            message: success ? 'Test email sent successfully!' : 'Failed to send test email',
            otp: testOTP
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Root route - serve home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Catch-all route for client-side routing
app.get('*', (req, res) => {
    // Check if the requested file exists in public directory
    const filePath = path.join(__dirname, 'public', req.path);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        // If file doesn't exist, serve home page
        res.sendFile(path.join(__dirname, 'public', 'home.html'));
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.stack);
    
    // Mongoose validation error
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            status: 'error',
            message: 'Validation Error',
            details: Object.values(err.errors).map(e => e.message)
        });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        return res.status(409).json({
            status: 'error',
            message: 'Duplicate Key Error',
            details: `${Object.keys(err.keyValue)} already exists`
        });
    }

    // Default error
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Internal Server Error'
    });
});

// Enhanced MongoDB Connection with retry logic
let dbConnection;
let isConnecting = false;

const connectDB = async (retryCount = 0) => {
    if (isConnecting) {
        console.log('🔄 Connection already in progress...');
        return;
    }

    try {
        isConnecting = true;
        
        if (!dbConnection || mongoose.connection.readyState === 0) {
            console.log(`🔄 Connecting to MongoDB (attempt ${retryCount + 1})...`);
            
            dbConnection = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/HarvestLoop', {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 10000,
                socketTimeoutMS: 45000,
                maxPoolSize: 10,
                maxIdleTimeMS: 30000,
                retryWrites: true,
                retryReads: true,
                bufferCommands: false
                // Removed deprecated bufferMaxEntries option
            });
            console.log('✅ Connected to MongoDB successfully');
        }
        isConnecting = false;
        return dbConnection;
    } catch (err) {
        isConnecting = false;
        console.error(`❌ MongoDB connection error (attempt ${retryCount + 1}):`, err.message);
        
        if (retryCount < 5) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
            console.log(`⏰ Retrying in ${delay}ms...`);
            setTimeout(() => connectDB(retryCount + 1), delay);
        } else {
            console.error('❌ Failed to connect to MongoDB after 5 attempts');
            process.exit(1);
        }
    }
};

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err.message);
    if (mongoose.connection.readyState === 0 && !isConnecting) {
        connectDB(); // Try to reconnect
    }
});

mongoose.connection.on('disconnected', () => {
    console.log('🔌 MongoDB disconnected');
    if (!isConnecting) {
        setTimeout(() => connectDB(), 2000); // Try to reconnect after 2 seconds
    }
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
});

// Handle application termination
process.on('SIGINT', async () => {
    try {
        console.log('🛑 Gracefully shutting down...');
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed through app termination');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during app termination:', err);
        process.exit(1);
    }
});

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err.message);
    console.error(err.stack);
    // Optionally, send error details to a monitoring service
    // monitoringService.captureException(err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('❌ Reason:', reason);
    // Optionally, send error details to a monitoring service
    // monitoringService.captureException(reason);
});

// Improved getLocalIp function
function getLocalIp() {
    const nets = os.networkInterfaces();
    const results = {};
    
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal addresses
            if (net.family === 'IPv4' && !net.internal) {
                if (!results[name]) {
                    results[name] = [];
                }
                results[name].push(net.address);
            }
        }
    }
    
    // Prefer WiFi interfaces
    const wifiInterfaces = ['Wi-Fi', 'wlan0', 'wlp3s0'];
    for (const wifiName of wifiInterfaces) {
        if (results[wifiName]) {
            console.log(`🔍 Found WiFi interface ${wifiName}:`, results[wifiName][0]);
            return results[wifiName][0];
        }
    }
    
    // Fallback to any available interface
    const allAddresses = Object.values(results).flat();
    if (allAddresses.length > 0) {
        console.log(`🔍 Using fallback IP:`, allAddresses[0]);
        return allAddresses[0];
    }
    
    return '127.0.0.1';
}

// Server configuration
const PORT = process.env.PORT || 3000;

// Start server function
const startServer = async () => {
    try {
        // Connect to MongoDB first
        await connectDB();

        // Get local IP and setup BASE_URL for college demo
        const localIp = getLocalIp();
        const PORT = process.env.PORT || 3000;
        const baseUrl = process.env.BASE_URL || `http://${localIp}:${PORT}`;
        
        // Make baseUrl available to all routes for email links
        app.locals.BASE_URL = baseUrl;

        // Start Express server
        const server = app.listen(PORT, '0.0.0.0', () => {
            const localIp = getLocalIp();
            const baseUrl = `http://${localIp}:${PORT}`;
            
            console.log('\n🔧 NETWORK DIAGNOSTICS:');
            console.log('====================================');
            console.log(`📱 Mobile Test URL: ${baseUrl}`);
            console.log(`💻 Computer Name: ${os.hostname()}`);
            console.log(`🌐 Alternative URL: http://${os.hostname()}:${PORT}`);
            
            // Show all network interfaces
            const nets = os.networkInterfaces();
            console.log('\n📡 Available Network Interfaces:');
            for (const name of Object.keys(nets)) {
                for (const net of nets[name]) {
                    if (net.family === 'IPv4' && !net.internal) {
                        console.log(`   ${name}: http://${net.address}:${PORT}`);
                    }
                }
            }
            
            console.log('\n🔥 If mobile can\'t connect, run this command as Administrator:');
            console.log(`   netsh advfirewall firewall add rule name="HarvestLoop" dir=in action=allow protocol=TCP localport=${PORT}`);
            console.log('====================================\n');
        });

        // Handle server errors
        server.on('error', (err) => {
            console.error('❌ Server error:', err);
        });

        return server;
    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
};

// Include all your routes here
// ... (keep your existing routes)

// Network info endpoint for negotiation system
app.get('/api/network-info', async (req, res) => {
    try {
        const localIp = getLocalIp();
        const port = process.env.PORT || 3000;
        
        res.json({
            wifiNetwork: 'Local Network', // You can implement actual WiFi detection
            port: port,
            timestamp: new Date().toISOString(),
            status: 'connected'
        });
    } catch (error) {
        console.error('Network info error:', error);
        res.status(500).json({ error: 'Cannot detect network' });
    }
});

// Start the server
startServer();
