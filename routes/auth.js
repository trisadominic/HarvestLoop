const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const twilio = require('twilio');

// Initialize Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Store OTPs temporarily (in production, use Redis or similar)
const otpStore = new Map();

// Generate OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Request OTP
router.post('/request-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        
        // Find or create user
        let user = await User.findOne({ phone });
        if (!user) {
            return res.status(404).json({ message: 'User not found. Please sign up first.' });
        }

        // Generate OTP
        const otp = generateOTP();
        
        // Store OTP with expiry (5 minutes)
        otpStore.set(phone, {
            otp,
            expiry: Date.now() + 5 * 60 * 1000,
            attempts: 0
        });

        // Send OTP via SMS
        await client.messages.create({
            body: `Your HarvestLoop OTP is: ${otp}`,
            to: phone,
            from: process.env.TWILIO_PHONE_NUMBER
        });

        res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('OTP Request Error:', error);
        res.status(500).json({ message: 'Failed to send OTP' });
    }
});

// Verify OTP and login
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, otp } = req.body;
        
        // Check if OTP exists and is valid
        const otpData = otpStore.get(phone);
        if (!otpData) {
            return res.status(400).json({ message: 'OTP expired or not requested' });
        }

        // Check attempts
        if (otpData.attempts >= 3) {
            otpStore.delete(phone);
            return res.status(400).json({ message: 'Too many attempts. Request new OTP.' });
        }

        // Check expiry
        if (Date.now() > otpData.expiry) {
            otpStore.delete(phone);
            return res.status(400).json({ message: 'OTP expired' });
        }

        // Verify OTP
        if (otpData.otp !== otp) {
            otpData.attempts++;
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // Get user
        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Clear OTP
        otpStore.delete(phone);

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                phone: user.phone,
                email: user.email
            }
        });
    } catch (error) {
        console.error('OTP Verification Error:', error);
        res.status(500).json({ message: 'Failed to verify OTP' });
    }
});

module.exports = router;
