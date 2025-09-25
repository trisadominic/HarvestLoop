require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function resetPassword(email, newPassword) {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    
    if (!user) {
      console.log(`User not found: ${email}`);
      return false;
    }
    
    console.log(`User found: ${user.email}`);
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    user.password = hashedPassword;
    await user.save();
    
    console.log(`Password reset successfully for: ${email}`);
    return true;
  } catch (error) {
    console.error('Error resetting password:', error);
    return false;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Call with command line args
if (process.argv.length === 4) {
  const email = process.argv[2];
  const newPassword = process.argv[3];
  
  resetPassword(email, newPassword)
    .then(result => {
      if (result) {
        console.log('Password reset successful!');
      } else {
        console.log('Password reset failed.');
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
} else {
  console.log('Usage: node resetPassword.js <email> <newPassword>');
  process.exit(1);
}