const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Farmer = require('../models/Farmer');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/profiles/';
    require('fs').mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// @route   GET /api/farmers/profile/:userId
// @desc    Get farmer profile by user ID
// @access  Private
router.get('/profile/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🚜 Fetching farmer profile for ID:', userId);
    
    // Verify the user is requesting their own profile or is an admin
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Find the user first
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the farmer profile
    let farmer = await Farmer.findOne({ userId: userId });
    
    if (!farmer) {
      // Create a new farmer profile if it doesn't exist
      farmer = new Farmer({
        userId: userId,
        farmName: user.username + "'s Farm",
        farmAddress: '',
        pincode: '',
        farmProducts: [],
        farmDescription: '',
        fullName: user.username,
        mobile: user.phone || '',
        email: user.email,
        experience: 0,
        farmSize: 0,
        productTypes: [],
        profileImage: '',
        isVerified: false,
        totalProducts: 0,
        totalSales: 0,
        rating: 0,
        reviewCount: 0
      });
      
      await farmer.save();
      console.log('🌱 Created new farmer profile');
    }

    // Make sure both productTypes and farmProducts are in sync
    if (farmer.farmProducts && farmer.farmProducts.length > 0 && 
        (!farmer.productTypes || farmer.productTypes.length === 0)) {
      farmer.productTypes = farmer.farmProducts;
      await farmer.save();
    }
    
    // If user has phone but farmer doesn't have mobile, sync it
    if (user.phone && !farmer.mobile) {
      farmer.mobile = user.phone;
      await farmer.save();
    }

    // Combine user and farmer data
    const profileData = {
      ...farmer.toJSON(),
      username: user.username,
      phone: user.phone || farmer.mobile, // Use user's phone if farmer's mobile is not set
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: farmer.updatedAt
    };

    // Ensure productTypes is populated even if it's empty
    if (!profileData.productTypes || profileData.productTypes.length === 0) {
      profileData.productTypes = profileData.farmProducts || [];
    }

    console.log('✅ Farmer profile data:', profileData);
    res.json(profileData);
  } catch (error) {
    console.error('❌ Error fetching farmer profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/farmers/profile/:userId
// @desc    Update farmer profile
// @access  Private
router.put('/profile/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🚜 Updating farmer profile for ID:', userId);
    
    // Verify the user is updating their own profile
    if (req.user.id !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const {
      farmName,
      farmDescription,
      farmAddress,
      fullName,
      mobile,
      email,
      experience,
      farmSize,
      productTypes
    } = req.body;

    // Validate required fields
    if (!farmName || !fullName || !email) {
      return res.status(400).json({ 
        message: 'Farm name, full name, and email are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Find and update farmer profile
    let farmer = await Farmer.findOne({ userId: userId });
    
    if (!farmer) {
      // Create new farmer profile if it doesn't exist
      farmer = new Farmer({ userId: userId });
    }

    // Update farmer fields
    farmer.farmName = farmName;
    farmer.farmDescription = farmDescription || '';
    farmer.farmAddress = farmAddress || '';
    farmer.fullName = fullName;
    farmer.mobile = mobile || '';
    farmer.email = email;
    farmer.experience = experience || 0;
    farmer.farmSize = farmSize || 0;
    
    // Update both productTypes and farmProducts fields to keep them in sync
    const products = Array.isArray(productTypes) ? productTypes : [];
    farmer.productTypes = products;
    farmer.farmProducts = products; // Keep both fields in sync
    
    farmer.updatedAt = new Date();

    console.log('Product types being saved:', products);

    await farmer.save();

    // Also update the user's email and phone if they changed
    const user = await User.findById(userId);
    if (user) {
      if (user.email !== email) {
        user.email = email;
      }
      if (user.phone !== mobile) {
        user.phone = mobile;
      }
      await user.save();
    }

    console.log('✅ Farmer profile updated successfully');
    res.json({
      message: 'Profile updated successfully',
      ...farmer.toJSON()
    });

  } catch (error) {
    console.error('❌ Error updating farmer profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/farmers/profile/:userId/image
// @desc    Upload farmer profile image
// @access  Private
router.post('/profile/:userId/image', authenticateToken, upload.single('profileImage'), async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🖼️ Uploading profile image for user:', userId);
    
    // Verify the user is updating their own profile
    if (req.user.id !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Find farmer profile
    let farmer = await Farmer.findOne({ userId: userId });
    
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer profile not found' });
    }

    // Update profile image path
    farmer.profileImage = `/uploads/profiles/${req.file.filename}`;
    farmer.updatedAt = new Date();
    
    await farmer.save();

    console.log('✅ Profile image updated successfully');
    res.json({
      message: 'Profile image updated successfully',
      profileImage: farmer.profileImage
    });

  } catch (error) {
    console.error('❌ Error uploading profile image:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get farmer details by farmer ID (existing route)
router.get('/:farmerId', authenticateToken, async (req, res) => {
    try {
        const farmerId = req.params.farmerId;
        console.log('🚜 Fetching farmer details for ID:', farmerId);
        
        // Get user details (name, etc.)
        const user = await User.findById(farmerId).select('username email phone');
        if (!user) {
            return res.status(404).json({ message: 'Farmer not found' });
        }
        
        // Get farmer-specific details (farm name, address, etc.)
        const farmerDetails = await Farmer.findOne({ userId: farmerId });
        
        // Combine user and farmer details
        const farmerInfo = {
            username: user.username,
            email: user.email,
            phone: user.phone,
            farmName: farmerDetails?.farmName || 'Farm name not provided',
            farmAddress: farmerDetails?.farmAddress || 'Address not provided',
            pincode: farmerDetails?.pincode || null,
            farmProducts: farmerDetails?.farmProducts || [],
            fullName: farmerDetails?.fullName || user.username,
            farmDescription: farmerDetails?.farmDescription || '',
            experience: farmerDetails?.experience || 0,
            farmSize: farmerDetails?.farmSize || 0,
            productTypes: farmerDetails?.productTypes || [],
            profileImage: farmerDetails?.profileImage || '',
            rating: farmerDetails?.rating || 0,
            reviewCount: farmerDetails?.reviewCount || 0
        };
        
        console.log('🚜 Farmer details found:', farmerInfo);
        res.json(farmerInfo);
    } catch (error) {
        console.error('❌ Error fetching farmer details:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
