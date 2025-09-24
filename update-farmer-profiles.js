/**
 * Script to update farmer profiles with correct product types and mobile numbers
 * Using the correct database name "project"
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function updateFarmerProfiles() {
  try {
    // Use the correct database name "project" instead of "harvestloop"
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/project';
    
    console.log('Connecting to MongoDB with URI:', uri);
    const client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    
    // Get all farmers
    const farmers = await db.collection('farmers').find({}).toArray();
    console.log(`Found ${farmers.length} farmers to process`);
    
    // Track updates
    let updatedCount = 0;
    
    // Process each farmer
    for (const farmer of farmers) {
      console.log(`\nProcessing farmer: ${farmer.fullName || 'Unknown'} (${farmer._id})`);
      
      let needsUpdate = false;
      const updates = {};
      
      // 1. Check product types
      if ((!farmer.productTypes || farmer.productTypes.length === 0) && 
          (farmer.farmProducts && farmer.farmProducts.length > 0)) {
        updates.productTypes = farmer.farmProducts;
        console.log(`- Setting productTypes from farmProducts: ${farmer.farmProducts.join(', ')}`);
        needsUpdate = true;
      }
      
      // 2. Check farm products
      if ((!farmer.farmProducts || farmer.farmProducts.length === 0) && 
          (farmer.productTypes && farmer.productTypes.length > 0)) {
        updates.farmProducts = farmer.productTypes;
        console.log(`- Setting farmProducts from productTypes: ${farmer.productTypes.join(', ')}`);
        needsUpdate = true;
      }
      
      // 3. If both are empty but user ID exists, try to look up the user's farmProducts from registration
      if ((!farmer.productTypes || farmer.productTypes.length === 0) && 
          (!farmer.farmProducts || farmer.farmProducts.length === 0) &&
          farmer.userId) {
        
        // Find the user
        const user = await db.collection('users').findOne({ _id: farmer.userId });
        if (user && user.farmProducts && user.farmProducts.length > 0) {
          updates.productTypes = user.farmProducts;
          updates.farmProducts = user.farmProducts;
          console.log(`- Setting products from user registration: ${user.farmProducts.join(', ')}`);
          needsUpdate = true;
        }
      }
      
      // 4. Check mobile number
      if (!farmer.mobile && farmer.userId) {
        // Find the user
        const user = await db.collection('users').findOne({ _id: farmer.userId });
        if (user && user.phone) {
          updates.mobile = user.phone;
          console.log(`- Setting mobile from user phone: ${user.phone}`);
          needsUpdate = true;
        }
      }
      
      // Apply updates if needed
      if (needsUpdate) {
        await db.collection('farmers').updateOne(
          { _id: farmer._id },
          { $set: updates }
        );
        console.log('✅ Farmer updated successfully');
        updatedCount++;
      } else {
        console.log('⏩ No updates needed for this farmer');
      }
    }
    
    console.log(`\n✅ Migration complete. Updated ${updatedCount} out of ${farmers.length} farmers.`);
    
    await client.close();
    console.log('✅ MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateFarmerProfiles().catch(console.error);