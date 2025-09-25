const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: String,
  phone: String,
  email: { type: String, unique: true },
  password: String,
  role: {
    type: String,
    enum: ['Farmer', 'Consumer', 'Admin', 'System'], // Added Admin and System roles
    required: true
  },
  createdAt: { type: Date, default: Date.now }
});

// Pre-save hook to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it's modified or new
  if (!this.isModified('password')) return next();
  
  try {
    console.log('🔒 Hashing password for user:', this.email);
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('✅ Password hashed successfully');
    next();
  } catch (error) {
    console.error('❌ Password hashing error:', error);
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('❌ Password comparison error:', error);
    return false;
  }
};

module.exports = mongoose.model('User', userSchema);
