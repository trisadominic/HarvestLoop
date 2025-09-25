// or filepath: d:\demo\app.js (wherever your login route is defined)

// Find your login route handler
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Add debug logging
    console.log(`🔑 Login attempt for email: ${email}`);
    
    // Find the user (make email search case-insensitive)
    const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    console.log(`✅ User found: ${user.email} (ID: ${user._id})`);
    
    // Check if the user has a password field
    if (!user.password) {
      console.log(`❌ User has no password set`);
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Use bcryptjs for password comparison
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log(`❌ Password mismatch for user: ${email}`);
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // User authenticated successfully
    console.log(`✅ Login successful for: ${email}`);
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    res.status(200).json({
      message: 'Login successful',
      token,
      userId: user._id,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});