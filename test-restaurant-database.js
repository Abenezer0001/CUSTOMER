#!/usr/bin/env node

import mongoose from 'mongoose';

const MONGO_URI = "mongodb+srv://abenezer:nLY9CFUuRWYy8sNU@cluster0.oljifwd.mongodb.net/inseat?retryWrites=true&w=majority&appName=Cluster0";
const TEST_RESTAURANT_ID = '6861808c53aed6bbdb915964';

// Define Restaurant schema (simplified)
const restaurantSchema = new mongoose.Schema({
  name: String,
  service_charge: {
    enabled: Boolean,
    percentage: Number
  }
}, { strict: false });

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

async function testRestaurantDatabase() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB successfully');
    
    console.log(`\n🔍 Looking for restaurant with ID: ${TEST_RESTAURANT_ID}`);
    const restaurant = await Restaurant.findById(TEST_RESTAURANT_ID);
    
    if (!restaurant) {
      console.error('❌ Restaurant not found in database');
      return;
    }
    
    console.log('✅ Restaurant found:');
    console.log('  - Name:', restaurant.name);
    console.log('  - ID:', restaurant._id);
    
    console.log('\n💰 Service charge configuration:');
    if (restaurant.service_charge) {
      console.log('  - service_charge object exists:', true);
      console.log('  - enabled:', restaurant.service_charge.enabled, `(type: ${typeof restaurant.service_charge.enabled})`);
      console.log('  - percentage:', restaurant.service_charge.percentage, `(type: ${typeof restaurant.service_charge.percentage})`);
      
      // Test the calculation logic
      if (restaurant.service_charge.enabled === true && 
          typeof restaurant.service_charge.percentage === 'number' && 
          restaurant.service_charge.percentage > 0) {
        
        const testSubtotal = 12.99;
        const serviceCharge = parseFloat((testSubtotal * (restaurant.service_charge.percentage / 100)).toFixed(2));
        console.log(`\n🧮 Service charge calculation test:`);
        console.log(`  - Subtotal: $${testSubtotal}`);
        console.log(`  - Service charge rate: ${restaurant.service_charge.percentage}%`);
        console.log(`  - Service charge amount: $${serviceCharge}`);
        console.log(`  - Total: $${(testSubtotal + serviceCharge).toFixed(2)}`);
        
        if (serviceCharge > 0) {
          console.log('✅ Service charge calculation would work correctly!');
        } else {
          console.log('❌ Service charge calculation resulted in 0');
        }
      } else {
        console.log('❌ Service charge validation failed:');
        console.log('  Required: enabled=true (boolean) AND percentage>0 (number)');
        console.log('  Current values do not meet requirements');
      }
    } else {
      console.log('  - service_charge object: NOT FOUND');
      console.log('❌ Restaurant does not have service_charge configuration');
    }
    
    // Show all fields to see the full structure
    console.log('\n📋 Full restaurant document:');
    console.log(JSON.stringify(restaurant.toObject(), null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testRestaurantDatabase().catch(console.error);