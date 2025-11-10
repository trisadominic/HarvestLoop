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
    } else {
      // Update existing farmer profile with user data if needed
      let needsUpdate = false;
      
      // Ensure mobile is updated from user.phone if it's missing
      if (!farmer.mobile && user.phone) {
        farmer.mobile = user.phone;
        needsUpdate = true;
      }
      
      // Ensure email is updated from user.email if it's missing
      if (!farmer.email || farmer.email !== user.email) {
        farmer.email = user.email;
        needsUpdate = true;
      }
      
      // Ensure fullName is updated from user.username if it's missing
      if (!farmer.fullName && user.username) {
        farmer.fullName = user.username;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await farmer.save();
        console.log('🔄 Updated farmer profile with user data');
      }
    }

    // Combine user and farmer data, ensuring we use the most up-to-date info
    const profileData = {
      ...farmer.toJSON(),
      username: user.username,
      email: user.email,
      mobile: farmer.mobile || user.phone || '',
      fullName: farmer.fullName || user.username,
      createdAt: user.createdAt,
      updatedAt: farmer.updatedAt
    };

    // Dynamically get product types from farmer's actual products
    try {
      const ProductPrice = require('../models/ProductPrice');
      const farmerProducts = await ProductPrice.find({ 
        farmerId: userId, 
        active: { $ne: false } 
      }).select('category');
      
      // Get unique categories from the farmer's products
      const actualProductTypes = [...new Set(farmerProducts.map(p => p.category).filter(Boolean))];
      
      if (actualProductTypes.length > 0) {
        profileData.productTypes = actualProductTypes;
        
        // Update the farmer document with actual product types if different
        if (JSON.stringify(farmer.productTypes.sort()) !== JSON.stringify(actualProductTypes.sort())) {
          farmer.productTypes = actualProductTypes;
          await farmer.save();
          console.log('🔄 Updated product types from actual products:', actualProductTypes);
        }
      }
    } catch (productError) {
      console.log('ℹ️ Could not fetch product types:', productError.message);
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
    farmer.productTypes = Array.isArray(productTypes) ? productTypes : [];
    farmer.updatedAt = new Date();

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
