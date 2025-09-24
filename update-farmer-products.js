/**
 * Script to update existing farmer profile with product types and mobile number
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function updateFarmerProfile() {
  try {
    // Connect to MongoDB with the correct database name
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/project');
    console.log('✅ Connected to MongoDB');
    
    // Update the farmer profile directly with MongoDB driver
    const result = await mongoose.connection.db.collection('farmers').updateOne(
      { _id: new mongoose.Types.ObjectId("68cfd1c255be736ff23978c2") }, // Use the ID from your farmer
      { 
        $set: { 
          farmProducts: ['Vegetables', 'Fruits'],
          productTypes: ['Vegetables', 'Fruits'],
        }
      }
    );
    
    console.log(`Updated ${result.modifiedCount} farmer profile(s)`);
    
    // Read the updated document
    const updated = await mongoose.connection.db.collection('farmers').findOne(
      { _id: new mongoose.Types.ObjectId("68cfd1c255be736ff23978c2") }
    );
    
    console.log('Updated farmer profile:', updated);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  }
}

updateFarmerProfile().catch(console.error);