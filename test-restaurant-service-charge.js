#!/usr/bin/env node

import axios from 'axios';

const BASE_URL = 'http://localhost:3000'; // Auth service
const RESTAURANT_URL = 'http://localhost:3001'; // Restaurant service
const TEST_RESTAURANT_ID = '6861808c53aed6bbdb915964';

async function getAccessToken() {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@inseat.com',
      password: 'admin123'
    });
    
    if (response.data.access_token) {
      console.log('✅ Successfully got access token');
      return response.data.access_token;
    } else {
      console.error('❌ No access token in response:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to get access token:', error.response?.data || error.message);
    return null;
  }
}

async function testRestaurantEndpoint(token) {
  try {
    console.log(`🔍 Testing restaurant endpoint: ${RESTAURANT_URL}/api/restaurants/${TEST_RESTAURANT_ID}`);
    
    const response = await axios.get(`${RESTAURANT_URL}/api/restaurants/${TEST_RESTAURANT_ID}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Restaurant endpoint response status:', response.status);
    console.log('📋 Restaurant data:');
    console.log('  - Name:', response.data.name);
    console.log('  - ID:', response.data._id);
    
    if (response.data.service_charge) {
      console.log('💰 Service charge settings:');
      console.log('  - Enabled:', response.data.service_charge.enabled);
      console.log('  - Percentage:', response.data.service_charge.percentage);
      
      if (response.data.service_charge.enabled && response.data.service_charge.percentage) {
        const testSubtotal = 12.99;
        const expectedServiceCharge = Math.round(testSubtotal * (response.data.service_charge.percentage / 100) * 100) / 100;
        console.log(`🧮 Expected service charge for $${testSubtotal}: $${expectedServiceCharge}`);
      }
    } else {
      console.log('⚠️  No service_charge field found in restaurant data');
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch restaurant data:', error.response?.data || error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Headers:', error.response.headers);
    }
    return null;
  }
}

async function testOrderCreation(token) {
  try {
    console.log('\n🛒 Testing order creation with service charge...');
    
    const orderPayload = {
      restaurantId: TEST_RESTAURANT_ID,
      tableId: '68624ace3a3a2035f54fe8f3',
      items: [
        {
          menuItem: '668a3b2653aed6bbdb915a89',
          name: 'Test Item',
          price: 12.99,
          quantity: 1,
          modifiers: []
        }
      ],
      orderType: 'dine_in'
    };
    
    console.log('📤 Sending order creation request...');
    const response = await axios.post(`http://localhost:3002/api/orders`, orderPayload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Order created successfully!');
    console.log('💰 Order totals:');
    console.log('  - Subtotal:', response.data.subtotal);
    console.log('  - Service charge:', response.data.service_charge);
    console.log('  - Total:', response.data.total);
    
    if (response.data.service_charge === 0) {
      console.log('❌ SERVICE CHARGE IS 0 - This is the issue we need to fix!');
    } else {
      console.log('✅ Service charge calculated correctly!');
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to create order:', error.response?.data || error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting service charge debug test...\n');
  
  // Step 1: Get access token
  const token = await getAccessToken();
  if (!token) {
    console.error('❌ Cannot continue without access token');
    return;
  }
  
  console.log('\n' + '='.repeat(50));
  
  // Step 2: Test restaurant endpoint
  const restaurantData = await testRestaurantEndpoint(token);
  if (!restaurantData) {
    console.error('❌ Cannot continue without restaurant data');
    return;
  }
  
  console.log('\n' + '='.repeat(50));
  
  // Step 3: Test order creation
  await testOrderCreation(token);
  
  console.log('\n✅ Debug test completed!');
}

main().catch(console.error);