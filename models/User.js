const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Change to bcryptjs

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

// Update password hashing
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update password comparison
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
