/**
 * Validation middleware for signup requests
 * Ensures all required fields are present for both farmer and consumer registrations
 */

// Validation middleware for signup
const validateSignupData = (req, res, next) => {
  const { username, phone, email, password, role } = req.body;
  const errors = [];

  // Common validation for all users
  if (!username) errors.push('Username is required');
  if (!phone) errors.push('Phone is required');
  if (!email) errors.push('Email is required');
  if (!password) errors.push('Password is required');
  if (!role) errors.push('Role is required');
  
  // Validate email format using regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    errors.push('Invalid email format');
  }
  
  // Validate phone format (allowing numeric chars, spaces, dashes, and plus)
  const phoneRegex = /^[0-9\s\-\+]+$/;
  if (phone && !phoneRegex.test(phone)) {
    errors.push('Phone number should only contain numbers, spaces, dashes, and plus sign');
  }
  
  // Role-specific validation
  if (role === 'Farmer') {
    const farmName = req.body['farm-name'];
    if (!farmName) errors.push('Farm name is required for farmer registration');
    
    // Add farmAddress as optional but recommended
    if (!req.body['farm-address']) {
      console.log('⚠️ Farm address not provided, using empty string');
    }
  }
  
  if (role === 'Consumer' && req.body.subscription) {
    const { subscription } = req.body;
    if (!subscription.plan && !subscription.planName) {
      errors.push('Subscription plan is required');
    }
  }
  
  // If errors exist, return them
  if (errors.length > 0) {
    return res.status(400).json({
      message: 'Validation failed',
      errors
    });
  }
  
  // If all validations pass, proceed to next middleware
  next();
};

module.exports = { validateSignupData };