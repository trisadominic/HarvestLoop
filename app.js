const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { spawn } = require('child_process');
const crypto = require('crypto');
const { execFile } = require('child_process');
const jwt = require('jsonwebtoken');
const emailService = require('./services/emailService');

// Load environment variables
require('dotenv').config();
const User = require('./models/User');
const Farmer = require('./models/Farmer');
const Consumer = require('./models/Consumer');
const Subscription = require('./models/Subscription');
const FarmerDashboard = require('./models/Farmer-dashboard');
const ProductPrice = require('./models/ProductPrice.js');
const Order = require('./models/Order');
const Notification = require('./models/Notification');

const app = express();

// No need to create a transporter with SendGrid
// emailService is already initialized and ready to use

// Verify SendGrid connection
emailService.verifyConnection()
  .then(success => {
    if (success) {
      console.log('✅ Notification system working');
    } else {
      console.error('❌ Email service verification failed');
    }
  })
  .catch(error => {
    console.error('❌ Email verification error:', error);
  });

// Function to send OTP email
async function sendOTPEmail(email, otp, username) {
    const html = `
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
    `;

    return await emailService.sendEmail(email, 'HarvestLoop - Your Login OTP', html);
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enhanced CORS settings for better mobile support
app.use(cors({
  origin: '*', // Allow requests from any origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // Cache preflight requests for 24 hours
}));

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
// Add cache control for JavaScript files to prevent caching issues
app.use('/js', express.static('public/js', {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      // Set no-cache for JavaScript files
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      // Add a version query parameter based on last modified time
      const stats = fs.statSync(path);
      const lastModified = new Date(stats.mtime).getTime();
      res.setHeader('Last-Modified', new Date(stats.mtime).toUTCString());
      res.setHeader('ETag', `"${lastModified.toString(16)}"`);
    }
  }
}));

// Serve other static files with default caching
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Add a simple ping endpoint for connection checking
app.get('/ping', (req, res) => {
  // Add cache control headers to prevent caching
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.status(200).send('pong');
});

// API ping endpoint for API checks
app.get('/api/ping', (req, res) => {
  // Add cache control headers to prevent caching
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.status(200).json({ status: 'online', timestamp: new Date().toISOString() });
});

// HEAD ping endpoint for lightweight connection tests
app.head('/ping', (req, res) => {
  res.status(200).end();
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
const chatRoutes = require('./routes/chat');
const supportRoutes = require('./routes/support');
const farmersRoutes = require('./routes/farmers');
const consumersRoutes = require('./routes/consumers');

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
app.use('/api/chat', chatRoutes);
app.use('/api/support', supportRoutes);
// app.use('/api/ping', pingRoutes); // Mount ping routes at /api/ping

// Health check route for email configuration
app.get('/api/health/email', async (req, res) => {
    try {
        await transporter.verify();
        res.json({
            status: 'healthy',
            email: {
                configured: true,
                host: emailConfig.host,
                port: emailConfig.port,
                service: emailConfig.service
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            code: error.code
        });
    }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  // Check database connection
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  // Basic email service check (doesn't actually send email)
  let emailStatus = 'unknown';
  try {
    const emailService = require('./services/emailService');
    const isConfigured = await emailService.verifyConnection();
    emailStatus = isConfigured ? 'configured' : 'error';
  } catch (error) {
    emailStatus = 'error';
    console.error('Health check - Email error:', error.message);
  }
  
  const isHealthy = dbStatus === 'connected';
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      email: emailStatus
    }
  });
});

// Catch-all route (move this to the end!)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Login route
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log(`🔐 Login attempt: ${email}`);
    
    // Step 1: Find user (case-insensitive)
    const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    
    // Step 2: Check if user exists
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    console.log(`👤 User found: ${user.email} (ID: ${user._id})`);
    
    // Step 3: Get the stored password hash
    const hashedPassword = user.password;
    if (!hashedPassword) {
      console.log(`❌ No password set for user: ${email}`);
      return res.status(401).json({ message: 'Account setup incomplete' });
    }
    
    // Step 4: Compare passwords using bcryptjs
    const bcrypt = require('bcryptjs');
    console.log(`🔄 Comparing passwords...`);
    
    // Log the first few chars of the hash for debugging (never log full passwords)
    console.log(`📝 Stored password hash starts with: ${hashedPassword.substring(0, 10)}...`);
    
    const isMatch = await bcrypt.compare(password, hashedPassword);
    
    // Step 5: Handle authentication result
    if (!isMatch) {
      console.log(`❌ Password mismatch for user: ${email}`);
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    console.log(`✅ Password verified for: ${email}`);
    
    // Step 6: Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    // Step 7: Send success response
    res.status(200).json({
      message: 'Login successful',
      token,
      userId: user._id,
      email: user.email,
      username: user.username,
      role: user.role
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
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
        const success = await sendOTPEmail(email || 'dominictrisa@gmail.com', testOTP, 'Test User');
        
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
    console.error('Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        timestamp: new Date().toISOString()
    });

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            details: Object.values(err.errors).map(e => ({
                field: e.path,
                message: e.message
            }))
        });
    }

    res.status(500).json({
        error: 'Internal Server Error',
        requestId: Date.now()
    });
});

// MongoDB Connection
let dbConnection;

const connectDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/harvestloop';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.log('🔌 MongoDB connection failed');
    console.error('❌ MongoDB connection error:', error);
    // Don't exit the process, allow retries
    return false;
  }
  return true;
};

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
  console.log('🔄 Will attempt to reconnect...');
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 MongoDB disconnected, attempting to reconnect...');
  setTimeout(connectDB, 5000);
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err);
    if (!mongoose.connection.readyState) {
        connectDB(); // Try to reconnect
    }
});

mongoose.connection.on('disconnected', () => {
    console.log('🔌 MongoDB disconnected');
    connectDB(); // Try to reconnect
});

// Replace the existing mongoose.connection.on('connected') handler
mongoose.connection.on('connected', async () => {
    try {
        // Create a system user if it doesn't exist
        let systemUser = await User.findOne({ email: 'system@harvestloop.internal' });
        if (!systemUser) {
            systemUser = await User.create({
                username: 'System',
                email: 'system@harvestloop.internal',
                password: crypto.randomBytes(32).toString('hex'),
                role: 'System',  // Changed from 'admin' to 'System'
                phone: '0000000000'  // Add required fields
            });
        }

        // Test notification creation with valid ObjectId
        const testNotification = new Notification({
            userId: systemUser._id,
            type: 'order',
            message: 'System started successfully',
            status: 'unread'
        });
        await testNotification.save();
        console.log('✅ Notification system working');
    } catch (error) {
        console.error('❌ Notification system error:', error);
        // Log detailed error information
        if (error.errors) {
            Object.keys(error.errors).forEach(key => {
                console.error(`Field "${key}" error:`, error.errors[key].message);
            });
        }
    }
});

// Handle uncaught exceptions - prevent server from crashing
process.on('uncaughtException', (err) => {
    console.error('❌ UNCAUGHT EXCEPTION:', err.message);
    console.error('Stack trace:', err.stack);
    // Don't exit the process
    console.log('🔄 Server continuing despite error...');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ UNHANDLED PROMISE REJECTION:', reason);
    // Don't exit the process
    console.log('🔄 Server continuing despite promise rejection...');
});

// Handle application termination
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed through app termination');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during app termination:', err);
        process.exit(1);
    }
});

// Server configuration
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Listen on all network interfaces for mobile access
const SERVER_TIMEOUT = parseInt(process.env.SERVER_TIMEOUT || '120000', 10); // 2 minutes timeout (in ms)
const KEEP_ALIVE_TIMEOUT = parseInt(process.env.KEEP_ALIVE_TIMEOUT || '65000', 10); // 65 seconds keep-alive (in ms)

// Start server function
const startServer = async () => {
    try {
        // Connect to MongoDB first
        await connectDB();

        // Only start the server if this file is being run directly (not imported)
        if (require.main === module) {
            // Start Express server - explicitly binding to make sure it's accessible
            const server = app.listen(PORT, HOST, () => {
                console.log(`Server listening on ${HOST}:${PORT}`);
                // Set longer timeout and keepalive to prevent connection drops
                // Convert to numbers to avoid type errors
                server.timeout = parseInt(SERVER_TIMEOUT, 10);
                server.keepAliveTimeout = parseInt(KEEP_ALIVE_TIMEOUT, 10);
                
                const interfaces = require('os').networkInterfaces();
                const addresses = [];
                
                // Get all network interfaces
                for (const name of Object.keys(interfaces)) {
                    for (const iface of interfaces[name]) {
                        // Skip over non-IPv4 and internal (loopback) addresses
                        if (iface.family === 'IPv4' && !iface.internal) {
                            addresses.push(iface.address);
                        }
                    }
                }
                
                console.log('\n✅ Server Status:');
                console.log(`   🌐 Local URL: http://localhost:${PORT}`);
                addresses.forEach((address) => {
                    console.log(`   📱 Network URL: http://${address}:${PORT}`);
                });
                console.log('   📂 Static files: serving from /public');
                console.log('   🔌 Database: Connected');
                console.log('\n👉 Press Ctrl+C to stop server');
            });
            
            // Add error handling for the server
            server.on('error', (error) => {
                console.error('Server error:', error);
                
                if (error.code === 'EADDRINUSE') {
                    console.log('Address in use, retrying in 5 seconds...');
                    setTimeout(() => {
                        server.close();
                        server.listen(PORT, HOST);
                    }, 5000);
                }
            });

            return server;
        }
    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
};

// Include all your routes here
// ... (keep your existing routes)

// Start the server
startServer();

// Export the app for use in other files (like mobile-server.js)
module.exports = app;

// Add this temporary debugging route (remove in production)
app.get('/api/debug/check-user/:email', async (req, res) => {
  try {
    const email = req.params.email;
    // Find user without returning password
    const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } })
      .select('email username role _id');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ 
      message: 'User found',
      user: user
    });
  } catch (error) {
    console.error('Debug route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
