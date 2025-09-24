const express = require('express');
const router = express.Router();
const Deal = require('../models/Deal');
const ProductPrice = require('../models/ProductPrice'); // Use correct model
const Order = require('../models/Order');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const nodemailer = require('nodemailer');
const { getPublicBaseUrl } = require('../utils/url-utils');

// Consumer creates a new deal
router.post('/', authenticateToken, async (req, res) => {
    try {
        console.log('🎯 Deal creation request received:', req.body);
        console.log('🔐 User ID:', req.user.id);
        
        const { productId, quantity, proposedPrice, message } = req.body;
        const product = await ProductPrice.findById(productId).populate('farmerId');
        
        console.log('📦 Product found:', product ? product.name : 'NOT FOUND');
        
        if (!product || !product.active) {
            console.log('❌ Product not found or inactive');
            return res.status(404).json({ message: 'Product not found or inactive' });
        }

        // Prevent farmers from creating deals on their own products
        if (product.farmerId._id.toString() === req.user.id) {
            console.log('❌ Farmer trying to create deal on own product');
            return res.status(400).json({ 
                message: 'You cannot create a deal on your own product. Please browse products from other farmers.' 
            });
        }

        // Calculate expiration date (5 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 5);

        const deal = new Deal({
            productId,
            farmerId: product.farmerId._id,
            consumerId: req.user.id,
            quantity,
            proposedPrice,
            originalPrice: product.price,
            message: message || '',
            expiresAt
        });

        console.log('💾 Creating deal with details:');
        console.log('👤 Current user (consumer):', req.user.email, 'ID:', req.user.id);
        console.log('👨‍🌾 Product farmer:', product.farmerId.email, 'ID:', product.farmerId._id);
        console.log('📦 Product:', product.name);
        console.log('💰 Proposed price:', proposedPrice);

        console.log('💾 Saving deal...');
        await deal.save();
        console.log('✅ Deal saved with ID:', deal._id);

        // Get consumer details for email
        const consumer = await User.findById(req.user.id);
        console.log('👤 Consumer found:', consumer ? consumer.username : 'NOT FOUND');

        // Send email to farmer
        console.log('📧 Sending email to farmer...');
        await sendFarmerDealEmail(deal, product, consumer);
        console.log('✅ Email sent successfully');

        res.status(201).json(deal);
    } catch (error) {
        console.error('❌ Deal creation error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Email configuration
const emailConfig = {
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
};

async function sendFarmerDealEmail(deal, product, consumer) {
    try {
        console.log('📧 Creating email transporter...');
        const transporter = nodemailer.createTransport(emailConfig);
        
        const totalOriginal = (deal.originalPrice * deal.quantity).toFixed(2);
        const totalOffer = (deal.proposedPrice * deal.quantity).toFixed(2);
        const savings = (totalOriginal - totalOffer).toFixed(2);
        
        // Get a public-accessible URL for email links
        const baseUrl = getPublicBaseUrl();
        
        console.log('📊 Email data:', {
            farmerEmail: product.farmerId.email,
            productName: product.name,
            totalOffer: totalOffer,
            consumerName: consumer.username,
            baseUrl: baseUrl // Log the baseUrl being used
        });
        
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #2c5530; text-align: center; margin-bottom: 30px;">🤝 New Deal Offer Received!</h2>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="color: #333; margin-top: 0;">Deal Details:</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="padding: 8px 0; font-weight: bold;">Product:</td><td>${product.name}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Quantity:</td><td>${deal.quantity} ${product.stockUnit}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Your List Price:</td><td>Rs.${deal.originalPrice}/${product.stockUnit}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Customer Offer:</td><td style="color: #28a745; font-weight: bold;">Rs.${deal.proposedPrice}/${product.stockUnit}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Customer:</td><td>${consumer.username}</td></tr>
                        </table>
                    </div>

                    <div style="background-color: #e9ecef; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h4 style="margin-top: 0; color: #333;">Price Comparison:</h4>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span>Your Total (List Price):</span>
                            <span style="font-weight: bold;">Rs.${totalOriginal}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span>Customer's Offer Total:</span>
                            <span style="color: #28a745; font-weight: bold;">Rs.${totalOffer}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid #ccc;">
                            <span>Difference:</span>
                            <span style="color: #dc3545; font-weight: bold;">-Rs.${savings}</span>
                        </div>
                    </div>

                    ${deal.message ? `
                    <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin-bottom: 25px;">
                        <h4 style="margin-top: 0; color: #856404;">Customer Message:</h4>
                        <p style="margin-bottom: 0; color: #856404;">"${deal.message}"</p>
                    </div>
                    ` : ''}

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #666; margin-bottom: 20px;">Please respond to this deal offer:</p>
                        <a href="${baseUrl}/api/deals/${deal._id}/accept" 
                           style="display: inline-block; background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 0 10px; font-weight: bold;">
                            ✅ Accept Offer
                        </a>
                        <a href="${baseUrl}/api/deals/${deal._id}/decline" 
                           style="display: inline-block; background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 0 10px; font-weight: bold;">
                            ❌ Decline Offer
                        </a>
                    </div>

                    <div style="margin-top: 30px; padding: 15px; background-color: #d1ecf1; border-radius: 5px; text-align: center;">
                        <p style="margin: 0; color: #0c5460; font-size: 14px;">
                            ⏰ This offer expires in 5 days (${deal.expiresAt.toLocaleDateString()} at ${deal.expiresAt.toLocaleTimeString()})
                        </p>
                    </div>
                </div>
            </div>
        `;

        console.log('📤 Sending email...');
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: product.farmerId.email,
            subject: `🤝 New Deal Offer for ${product.name} - Rs.${totalOffer}`,
            html: emailHtml
        });
        console.log('✅ Email sent successfully to:', product.farmerId.email);
    } catch (error) {
        console.error('❌ Email sending error:', error);
        throw error; // Re-throw to be caught by the calling function
    }
}

// Farmer accepts deal via email link
router.get('/:id/accept', async (req, res) => {
    try {
        const deal = await Deal.findById(req.params.id)
            .populate('productId')
            .populate('consumerId')
            .populate('farmerId');
        
        if (!deal) {
            return res.status(404).send('<h1>Deal not found</h1>');
        }

        if (deal.status !== 'pending') {
            return res.status(400).send(`<h1>Deal already ${deal.status}</h1>`);
        }

        if (new Date() > deal.expiresAt) {
            deal.status = 'expired';
            await deal.save();
            return res.status(400).send('<h1>Deal has expired</h1>');
        }

        // Update deal status
        deal.status = 'accepted';
        deal.farmerResponseAt = new Date();
        await deal.save();

        // Send email to consumer
        await sendConsumerDealEmail(deal, 'accepted');

        res.send(`
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 30px; background-color: #f9f9f9; text-align: center;">
                <div style="background-color: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h1 style="color: #28a745; margin-bottom: 20px;">✅ Deal Accepted!</h1>
                    <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
                        You have successfully accepted the deal for <strong>${deal.productId.name}</strong>
                    </p>
                    <p style="color: #666;">The customer has been notified and will receive a purchase option.</p>
                    <div style="margin-top: 30px; padding: 15px; background-color: #d4edda; border-radius: 5px;">
                        <p style="margin: 0; color: #155724;">Deal Amount: Rs.${(deal.proposedPrice * deal.quantity).toFixed(2)}</p>
                    </div>
                </div>
            </div>
        `);
    } catch (error) {
        res.status(500).send('<h1>Error processing request</h1>');
    }
});

// Farmer declines deal via email link
router.get('/:id/decline', async (req, res) => {
    try {
        const deal = await Deal.findById(req.params.id)
            .populate('productId')
            .populate('consumerId');
        
        if (!deal) {
            return res.status(404).send('<h1>Deal not found</h1>');
        }

        if (deal.status !== 'pending') {
            return res.status(400).send(`<h1>Deal already ${deal.status}</h1>`);
        }

        // Update deal status
        deal.status = 'declined';
        deal.farmerResponseAt = new Date();
        await deal.save();

        // Send email to consumer
        console.log('📧 Sending decline email to consumer:', deal.consumerId.email);
        console.log('📧 Deal details:', {
            dealId: deal._id,
            productName: deal.productId.name,
            consumerEmail: deal.consumerId.email,
            consumerName: deal.consumerId.username
        });
        await sendConsumerDealEmail(deal, 'declined');

        res.send(`
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 30px; background-color: #f9f9f9; text-align: center;">
                <div style="background-color: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h1 style="color: #dc3545; margin-bottom: 20px;">❌ Deal Declined</h1>
                    <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
                        You have declined the deal for <strong>${deal.productId.name}</strong>
                    </p>
                    <p style="color: #666;">The customer has been notified about your decision.</p>
                </div>
            </div>
        `);
    } catch (error) {
        res.status(500).send('<h1>Error processing request</h1>');
    }
});

// Consumer cancels deal via email link
router.get('/:id/cancel', async (req, res) => {
    try {
        console.log('🔍 Cancel request received for deal ID:', req.params.id);
        
        const deal = await Deal.findById(req.params.id)
            .populate('productId')
            .populate('consumerId')
            .populate('farmerId');
        
        console.log('📋 Deal found:', deal ? {
            id: deal._id,
            status: deal.status,
            productName: deal.productId?.name,
            consumerEmail: deal.consumerId?.email,
            farmerEmail: deal.farmerId?.email
        } : 'null');
        
        if (!deal) {
            console.log('❌ Deal not found');
            return res.status(404).send('<h1>Deal not found</h1>');
        }

        if (deal.status !== 'pending' && deal.status !== 'accepted') {
            console.log('❌ Deal cannot be cancelled, current status:', deal.status);
            return res.status(400).send(`<h1>Deal cannot be cancelled (current status: ${deal.status})</h1>`);
        }

        console.log('✅ Updating deal status to cancelled...');
        // Update deal status
        deal.status = 'cancelled';
        deal.consumerResponseAt = new Date();
        await deal.save();
        console.log('✅ Deal status updated successfully');

        // Send email to farmer
        try {
            console.log('📧 Attempting to send cancel email to farmer...');
            await sendFarmerCancelEmail(deal);
            console.log('✅ Cancel email sent successfully');
        } catch (emailError) {
            console.error('❌ Error sending cancel email (continuing anyway):', emailError);
            // Don't fail the request if email fails
        }

        res.send(`
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 30px; background-color: #f9f9f9; text-align: center;">
                <div style="background-color: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h1 style="color: #dc3545; margin-bottom: 20px;">❌ Deal Cancelled</h1>
                    <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
                        You have successfully cancelled the deal for <strong>${deal.productId.name}</strong>
                    </p>
                    <p style="color: #666;">The farmer has been notified about the cancellation.</p>
                </div>
            </div>
        `);
    } catch (error) {
        console.error('❌ Cancel error details:', error);
        console.error('❌ Cancel error stack:', error.stack);
        res.status(500).send(`
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 30px; background-color: #f9f9f9; text-align: center;">
                <div style="background-color: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h1 style="color: #dc3545; margin-bottom: 20px;">❌ Error</h1>
                    <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
                        Sorry, there was an error processing your cancellation request.
                    </p>
                    <p style="color: #666;">Error: ${error.message}</p>
                </div>
            </div>
        `);
    }
});

// Consumer purchases deal via email link
router.get('/:id/purchase', async (req, res) => {
    try {
        const deal = await Deal.findById(req.params.id)
            .populate('productId')
            .populate('consumerId')
            .populate('farmerId');
        
        if (!deal) {
            return res.status(404).send('<h1>Deal not found</h1>');
        }

        if (deal.status !== 'accepted') {
            return res.status(400).send(`<h1>Deal not available for purchase (Status: ${deal.status})</h1>`);
        }

        if (new Date() > deal.expiresAt) {
            deal.status = 'expired';
            await deal.save();
            return res.status(400).send('<h1>Deal has expired</h1>');
        }

        // Get farmer details from Farmer model
        const Farmer = require('../models/Farmer');
        const farmerDetails = await Farmer.findOne({ userId: deal.farmerId._id });

        // Show purchase confirmation page with farmer details
        const totalAmount = (deal.proposedPrice * deal.quantity).toFixed(2);
        
        // Get a public-accessible URL for email links
        const baseUrl = getPublicBaseUrl();
        
        res.send(`
            <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 30px auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h1 style="color: #28a745; text-align: center; margin-bottom: 30px;">🛒 Complete Your Purchase</h1>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="color: #333; margin-top: 0;">Purchase Details:</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="padding: 8px 0; font-weight: bold;">Product:</td><td>${deal.productId.name}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Quantity:</td><td>${deal.quantity} ${deal.productId.stockUnit}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Price per Unit:</td><td>Rs.${deal.proposedPrice}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold; color: #28a745;">Total Amount:</td><td style="color: #28a745; font-weight: bold; font-size: 18px;">Rs.${totalAmount}</td></tr>
                        </table>
                    </div>

                    <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="color: #0066cc; margin-top: 0;">👨‍🌾 Farmer Details:</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="padding: 8px 0; font-weight: bold;">Name:</td><td>${deal.farmerId.username}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td>${deal.farmerId.email}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Phone:</td><td>${deal.farmerId.phone || 'Not provided'}</td></tr>
                            ${farmerDetails && farmerDetails.farmAddress ? 
                                `<tr><td style="padding: 8px 0; font-weight: bold;">Farm Address:</td><td>${farmerDetails.farmAddress}</td></tr>` 
                                : '<tr><td style="padding: 8px 0; font-weight: bold;">Address:</td><td>Not provided</td></tr>'
                            }
                            ${farmerDetails && farmerDetails.pincode ? 
                                `<tr><td style="padding: 8px 0; font-weight: bold;">Pincode:</td><td>${farmerDetails.pincode}</td></tr>` 
                                : ''
                            }
                            ${farmerDetails && farmerDetails.farmName ? 
                                `<tr><td style="padding: 8px 0; font-weight: bold;">Farm Name:</td><td>${farmerDetails.farmName}</td></tr>` 
                                : ''
                            }
                        </table>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #666; margin-bottom: 20px;">Confirm your purchase to proceed with the order:</p>
                        <a href="${baseUrl}/api/deals/${deal._id}/confirm-purchase" 
                           style="display: inline-block; background-color: #28a745; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 0 10px; font-weight: bold; font-size: 16px;">
                            ✅ Confirm Purchase
                        </a>
                        <a href="${baseUrl}/api/deals/${deal._id}/cancel" 
                           style="display: inline-block; background-color: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 0 10px; font-weight: bold;">
                            ❌ Cancel Deal
                        </a>
                    </div>

                    <div style="margin-top: 30px; padding: 15px; background-color: #fff3cd; border-radius: 5px; text-align: center;">
                        <p style="margin: 0; color: #856404; font-size: 14px;">
                            ⚠️ Your subscription points will be deducted upon purchase confirmation
                        </p>
                    </div>
                </div>
            </div>
        `);
    } catch (error) {
        res.status(500).send('<h1>Error processing request</h1>');
    }
});

// Consumer cancels deal via email link
router.get('/:id/cancel', async (req, res) => {
    try {
        const deal = await Deal.findById(req.params.id).populate('productId');
        
        if (!deal) {
            return res.status(404).send('<h1>Deal not found</h1>');
        }

        if (!['pending', 'accepted'].includes(deal.status)) {
            return res.status(400).send(`<h1>Deal cannot be cancelled (Status: ${deal.status})</h1>`);
        }

        // Update deal status
        deal.status = 'cancelled';
        deal.consumerResponseAt = new Date();
        await deal.save();

        res.send(`
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 30px; background-color: #f9f9f9; text-align: center;">
                <div style="background-color: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h1 style="color: #dc3545; margin-bottom: 20px;">❌ Deal Cancelled</h1>
                    <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
                        You have cancelled the deal for <strong>${deal.productId.name}</strong>
                    </p>
                    <p style="color: #666;">The deal has been successfully cancelled.</p>
                </div>
            </div>
        `);
    } catch (error) {
        res.status(500).send('<h1>Error processing request</h1>');
    }
});

// Confirm purchase - Final step that creates order and reduces inventory
router.get('/:id/confirm-purchase', async (req, res) => {
    try {
        const deal = await Deal.findById(req.params.id)
            .populate('productId')
            .populate('consumerId')
            .populate('farmerId');
        
        if (!deal) {
            return res.status(404).send('<h1>Deal not found</h1>');
        }

        if (deal.status !== 'accepted') {
            return res.status(400).send(`<h1>Deal not available for purchase</h1>`);
        }

        // Check if product has enough stock
        if (deal.productId.quantity < deal.quantity) {
            return res.status(400).send(`<h1>Insufficient stock available</h1>`);
        }

        // Check consumer subscription points
        const consumer = deal.consumerId;
        const totalCost = deal.proposedPrice * deal.quantity;
        const requiredPoints = Math.ceil(totalCost / 10); // 10 rupees per point

        // Get consumer's active subscription
        const Subscription = require('../models/Subscription');
        const subscription = await Subscription.findOne({ 
            userId: consumer._id, 
            status: 'active' 
        });

        if (!subscription) {
            return res.status(400).send(`
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 30px; background-color: #f9f9f9; text-align: center;">
                    <div style="background-color: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h1 style="color: #dc3545; margin-bottom: 20px;">❌ No Active Subscription</h1>
                        <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
                            You need an active subscription to make purchases.
                        </p>
                        <p style="color: #666;">Please purchase a subscription to continue.</p>
                    </div>
                </div>
            `);
        }

        const currentPoints = subscription.points || 0;

        if (currentPoints < requiredPoints) {
            return res.status(400).send(`
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 30px; background-color: #f9f9f9; text-align: center;">
                    <div style="background-color: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h1 style="color: #dc3545; margin-bottom: 20px;">❌ Insufficient Points</h1>
                        <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
                            You need ${requiredPoints} subscription points but only have ${currentPoints} points.
                        </p>
                        <p style="color: #666;">Please top up your subscription to complete this purchase.</p>
                    </div>
                </div>
            `);
        }

        // Process the purchase
        // Reduce product quantity
        deal.productId.quantity -= deal.quantity;
        if (deal.productId.quantity === 0) {
            deal.productId.active = false;
        }

        // Reduce consumer subscription points
        subscription.points = Math.max(0, subscription.points - requiredPoints);
        await subscription.save();

        // Create order
        const Order = require('../models/Order');
        console.log('📦 Creating order with data:', {
            productId: deal.productId._id,
            farmerId: deal.farmerId._id,
            consumerId: deal.consumerId._id,
            dealId: deal._id,
            quantity: deal.quantity,
            price: deal.proposedPrice,
            status: 'purchased'
        });
        
        const order = new Order({
            productId: deal.productId._id,
            farmerId: deal.farmerId._id,
            consumerId: deal.consumerId._id,
            dealId: deal._id,
            quantity: deal.quantity,
            price: deal.proposedPrice,
            status: 'purchased' // Use valid enum value
        });

        // Update deal status
        deal.status = 'purchased';
        deal.consumerResponseAt = new Date();

        console.log('💾 Saving order and deal...');
        // Save all changes
        await Promise.all([
            deal.productId.save(),
            consumer.save(),
            order.save(),
            deal.save()
        ]);
        
        console.log('✅ Order saved successfully with ID:', order._id);

        res.send(`
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 30px; background-color: #f9f9f9; text-align: center;">
                <div style="background-color: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h1 style="color: #28a745; margin-bottom: 20px;">🎉 Purchase Successful!</h1>
                    <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
                        Your order for <strong>${deal.productId.name}</strong> has been confirmed!
                    </p>
                    <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0; color: #155724;"><strong>Order ID:</strong> ${order._id}</p>
                        <p style="margin: 5px 0; color: #155724;"><strong>Total Paid:</strong> Rs.${totalCost.toFixed(2)}</p>
                        <p style="margin: 5px 0; color: #155724;"><strong>Points Used:</strong> ${requiredPoints}</p>
                        <p style="margin: 5px 0; color: #155724;"><strong>Remaining Points:</strong> ${subscription.points}</p>
                    </div>
                    <p style="color: #666;">The farmer will be notified and will contact you soon!</p>
                </div>
            </div>
        `);
    } catch (error) {
        console.error('Purchase error:', error);
        res.status(500).send('<h1>Error processing purchase</h1>');
    }
});

async function sendConsumerDealEmail(deal, action) {
    const transporter = nodemailer.createTransport(emailConfig);
    
    const totalAmount = (deal.proposedPrice * deal.quantity).toFixed(2);
    
    // Get a public-accessible URL for email links
    const baseUrl = getPublicBaseUrl();
    
    let emailHtml = '';
    let subject = '';

    if (action === 'accepted') {
        subject = `🎉 Deal Accepted! Ready to Purchase ${deal.productId.name}`;
        emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #28a745; text-align: center; margin-bottom: 30px;">🎉 Great News! Your Deal Was Accepted!</h2>
                    
                    <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 25px; text-align: center;">
                        <h3 style="color: #155724; margin-top: 0;">The farmer has accepted your offer!</h3>
                        <p style="color: #155724; margin: 0; font-size: 18px;">
                            <strong>${deal.productId.name}</strong> - ${deal.quantity} ${deal.productId.stockUnit} for Rs.${totalAmount}
                        </p>
                    </div>

                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h4 style="color: #333; margin-top: 0;">Deal Summary:</h4>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="padding: 8px 0; font-weight: bold;">Product:</td><td>${deal.productId.name}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Quantity:</td><td>${deal.quantity} ${deal.productId.stockUnit}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Agreed Price:</td><td>Rs.${deal.proposedPrice}/${deal.productId.stockUnit}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Total Amount:</td><td style="color: #28a745; font-weight: bold;">Rs.${totalAmount}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Farmer:</td><td>${deal.farmerId.username}</td></tr>
                        </table>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #666; margin-bottom: 20px;">Ready to complete your purchase?</p>
                        <a href="${baseUrl}/api/deals/${deal._id}/purchase" 
                           style="display: inline-block; background-color: #28a745; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 0 10px; font-weight: bold; font-size: 16px;">
                            🛒 Purchase Now
                        </a>
                        <a href="${baseUrl}/api/deals/${deal._id}/cancel" 
                           style="display: inline-block; background-color: #6c757d; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 0 10px; font-weight: bold;">
                            Cancel Deal
                        </a>
                    </div>

                    <div style="margin-top: 30px; padding: 15px; background-color: #fff3cd; border-radius: 5px; text-align: center;">
                        <p style="margin: 0; color: #856404; font-size: 14px;">
                            ⏰ Complete your purchase soon - deal expires on ${deal.expiresAt.toLocaleDateString()} at ${deal.expiresAt.toLocaleTimeString()}
                        </p>
                    </div>
                </div>
            </div>
        `;
    } else {
        subject = `😔 Deal Declined - ${deal.productId.name}`;
        emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #dc3545; text-align: center; margin-bottom: 30px;">😔 Deal Update</h2>
                    
                    <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 25px; text-align: center;">
                        <h3 style="color: #721c24; margin-top: 0;">Unfortunately, your deal was declined</h3>
                        <p style="color: #721c24; margin: 0; font-size: 16px;">
                            The farmer declined your offer for <strong>${deal.productId.name}</strong>
                        </p>
                    </div>

                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h4 style="color: #333; margin-top: 0;">Your Offer Details:</h4>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="padding: 8px 0; font-weight: bold;">Product:</td><td>${deal.productId.name}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Quantity:</td><td>${deal.quantity} ${deal.productId.stockUnit}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Your Offer:</td><td>Rs.${deal.proposedPrice}/${deal.productId.stockUnit}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Total Offered:</td><td>Rs.${totalAmount}</td></tr>
                        </table>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #666; margin-bottom: 20px;">Don't worry! You can try making another offer or browse other products.</p>
                        <a href="${baseUrl}/products.html" 
                           style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            Browse Other Products
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    console.log('📧 sendConsumerDealEmail called with:', {
        action,
        consumerEmail: deal.consumerId.email,
        productName: deal.productId.name
    });

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: deal.consumerId.email,
            subject: subject,
            html: emailHtml
        });
        
        console.log('✅ Email sent successfully to consumer:', deal.consumerId.email);
    } catch (error) {
        console.error('❌ Failed to send consumer email:', error);
        throw error;
    }
}

// Send email to farmer when consumer cancels deal
async function sendFarmerCancelEmail(deal) {
    try {
        console.log('📧 sendFarmerCancelEmail starting...');
        console.log('📧 Deal data check:', {
            dealId: deal._id,
            productName: deal.productId?.name,
            consumerName: deal.consumerId?.username,
            farmerEmail: deal.farmerId?.email
        });
        
        const transporter = nodemailer.createTransport(emailConfig);
        
        const totalAmount = (deal.proposedPrice * deal.quantity).toFixed(2);
        
        const subject = `❌ Deal Cancelled - ${deal.productId.name}`;
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #dc3545; text-align: center; margin-bottom: 30px;">❌ Deal Cancellation Notice</h2>
                    
                    <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 25px; text-align: center;">
                        <h3 style="color: #721c24; margin-top: 0;">A customer has cancelled their deal</h3>
                        <p style="color: #721c24; margin: 0; font-size: 16px;">
                            <strong>${deal.consumerId.username}</strong> cancelled their deal for <strong>${deal.productId.name}</strong>
                        </p>
                    </div>

                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h4 style="color: #333; margin-top: 0;">Cancelled Deal Details:</h4>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="padding: 8px 0; font-weight: bold;">Product:</td><td>${deal.productId.name}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Quantity:</td><td>${deal.quantity} ${deal.productId.stockUnit}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Offered Price:</td><td>Rs.${deal.proposedPrice}/${deal.productId.stockUnit}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Total Amount:</td><td>Rs.${totalAmount}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Customer:</td><td>${deal.consumerId.username}</td></tr>
                        </table>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #666; margin-bottom: 20px;">Your product is still available for other customers to purchase.</p>
                    </div>
                </div>
            </div>
        `;

        console.log('📧 sendFarmerCancelEmail preparing to send to:', deal.farmerId.email);

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: deal.farmerId.email,
            subject: subject,
            html: emailHtml
        });
        
        console.log('✅ Cancel email sent successfully to farmer:', deal.farmerId.email);
    } catch (error) {
        console.error('❌ Error in sendFarmerCancelEmail:', error);
        console.error('❌ Email error stack:', error.stack);
        throw error; // Re-throw so calling function knows it failed
    }
}

// Farmer responds to deal (accept/decline)
router.put('/:id/respond', authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        const deal = await Deal.findOne({ _id: req.params.id, farmerId: req.user.id })
            .populate('productId')
            .populate('consumerId');
        
        if (!deal) {
            return res.status(404).json({ message: 'Deal not found or unauthorized' });
        }

        if (!['accepted', 'declined'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const oldStatus = deal.status;
        deal.status = status;
        deal.farmerResponseAt = new Date();
        await deal.save();

        // Send email to consumer when deal is declined
        if (status === 'declined' && oldStatus !== 'declined') {
            try {
                await sendConsumerDealEmail(deal, 'declined');
                console.log(`📧 Decline email sent to consumer: ${deal.consumerId.email}`);
            } catch (emailError) {
                console.error('❌ Error sending decline email:', emailError);
                // Don't fail the request if email fails
            }
        }

        res.json(deal);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Consumer cancels deal via API
router.put('/:id/cancel', authenticateToken, async (req, res) => {
    try {
        const deal = await Deal.findOne({ _id: req.params.id, consumerId: req.user.id })
            .populate('productId')
            .populate('consumerId')
            .populate('farmerId');
        
        if (!deal) {
            return res.status(404).json({ message: 'Deal not found or unauthorized' });
        }

        if (deal.status !== 'pending' && deal.status !== 'accepted') {
            return res.status(400).json({ message: `Deal cannot be cancelled (current status: ${deal.status})` });
        }

        const oldStatus = deal.status;
        deal.status = 'cancelled';
        deal.consumerResponseAt = new Date();
        await deal.save();

        // Send email to farmer when deal is cancelled
        if (oldStatus !== 'cancelled') {
            try {
                await sendFarmerCancelEmail(deal);
                console.log(`📧 Cancel email sent to farmer: ${deal.farmerId.email}`);
            } catch (emailError) {
                console.error('❌ Error sending cancel email:', emailError);
                // Don't fail the request if email fails
            }
        }

        res.json({ message: 'Deal cancelled successfully', deal });
    } catch (error) {
        console.error('Cancel error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Consumer completes the deal (purchase)
router.post('/:id/complete', authenticateToken, async (req, res) => {
    try {
        const deal = await Deal.findOne({ 
            _id: req.params.id, 
            consumerId: req.user.id,
            status: 'accepted'
        });
        
        if (!deal) {
            return res.status(404).json({ message: 'Deal not found, unauthorized, or not accepted' });
        }

        // Create order from deal
        const order = new Order({
            productId: deal.productId,
            farmerId: deal.farmerId,
            consumerId: deal.consumerId,
            dealId: deal._id,
            quantity: deal.quantity,
            price: deal.proposedPrice,
            status: 'pending'
        });

        deal.status = 'purchased';
        await Promise.all([order.save(), deal.save()]);
        res.json({ order, deal });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Cancel deal (both farmer and consumer can cancel)
router.put('/:id/cancel', authenticateToken, async (req, res) => {
    try {
        const deal = await Deal.findOne({
            _id: req.params.id,
            $or: [
                { farmerId: req.user.id },
                { consumerId: req.user.id }
            ],
            status: { $in: ['pending', 'accepted'] }
        });
        
        if (!deal) {
            return res.status(404).json({ message: 'Deal not found, unauthorized, or cannot be cancelled' });
        }

        deal.status = 'cancelled';
        await deal.save();
        res.json(deal);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user's deals (as farmer or consumer)
router.get('/my-deals', authenticateToken, async (req, res) => {
    try {
        const { status, role } = req.query;
        const query = {
            [role === 'farmer' ? 'farmerId' : 'consumerId']: req.user.id
        };
        
        if (status) {
            query.status = status;
        }

        const deals = await Deal.find(query)
            .populate('productId')
            .sort({ createdAt: -1 });
            
        res.json(deals);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Consumer purchases the deal (same as complete but with PUT method for frontend consistency)
router.put('/:id/purchase', authenticateToken, async (req, res) => {
    try {
        const deal = await Deal.findOne({ 
            _id: req.params.id, 
            consumerId: req.user.id,
            status: 'accepted'
        }).populate('productId')
          .populate('farmerId')
          .populate('consumerId');
        
        if (!deal) {
            return res.status(404).json({ message: 'Deal not found, unauthorized, or not accepted' });
        }

        console.log(`🛒 Consumer ${req.user.id} purchasing deal ${deal._id}`);

        // Create order from deal
        const Order = require('../models/Order');
        const order = new Order({
            productId: deal.productId,
            farmerId: deal.farmerId,
            consumerId: deal.consumerId,
            dealId: deal._id,
            quantity: deal.quantity,
            price: deal.proposedPrice,
            status: 'pending'
        });

        // Update deal status to purchased
        deal.status = 'purchased';
        deal.consumerResponseAt = new Date();
        
        await Promise.all([order.save(), deal.save()]);
        
        console.log(`✅ Deal purchased successfully, order ${order._id} created`);
        
        res.json({ 
            message: 'Deal purchased successfully! Order created.',
            order, 
            deal 
        });
    } catch (error) {
        console.error('Purchase error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
