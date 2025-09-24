const mongoose = require('mongoose');

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

module.exports = mongoose.model('User', userSchema);
