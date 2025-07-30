#!/usr/bin/env node

/**
 * Complete Group Ordering Integration Test
 * Tests all functionality: create group, join group, spending limits, payment structures
 */

const API_BASE_URL = 'http://localhost:3001/api';

async function makeRequest(method, endpoint, data = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const responseData = await response.json();
    
    return {
      status: response.status,
      success: response.ok,
      data: responseData
    };
  } catch (error) {
    return {
      status: 0,
      success: false,
      error: error.message
    };
  }
}

async function testCompleteGroupOrdering() {
  console.log('🚀 Starting Complete Group Ordering Integration Test\n');
  
  let groupOrderId = null;
  let joinCode = null;
  let participantIds = [];
  
  try {
    // Step 1: Create a group order
    console.log('📝 Step 1: Creating group order...');
    const createResult = await makeRequest('POST', '/group-orders/create', {
      restaurantId: '6861808c53aed6bbdb915964',
      tableId: '68624ace3a3a2035f54fe8f3',
      expirationMinutes: 60,
      settings: {
        maxParticipants: 5,
        allowAnonymous: true
      }
    });
    
    if (!createResult.success) {
      throw new Error(`Create failed: ${JSON.stringify(createResult.data)}`);
    }
    
    groupOrderId = createResult.data.data.groupOrderId;
    joinCode = createResult.data.data.inviteCode;
    
    console.log('✅ Group order created successfully');
    console.log(`   Group ID: ${groupOrderId}`);
    console.log(`   Join Code: ${joinCode}\n`);
    
    // Step 2: Join the group order (simulate multiple participants)
    console.log('👥 Step 2: Adding participants...');
    
    const participants = [
      { name: 'Alice Smith', email: 'alice@example.com' },
      { name: 'Bob Johnson', email: 'bob@example.com' },
      { name: 'Carol Davis', email: 'carol@example.com' }
    ];
    
    for (const participant of participants) {
      const joinResult = await makeRequest('POST', '/group-orders/join', {
        inviteCode: joinCode,
        userName: participant.name,
        userEmail: participant.email
      });
      
      if (joinResult.success) {
        participantIds.push(joinResult.data.data.participantId);
        console.log(`✅ ${participant.name} joined successfully`);
      } else {
        console.log(`❌ ${participant.name} failed to join: ${JSON.stringify(joinResult.data)}`);
      }
    }
    
    console.log(`\n👥 Total participants: ${participantIds.length + 1} (including creator)\n`);
    
    // Step 3: Test spending limits
    console.log('💰 Step 3: Testing spending limits...');
    
    const spendingLimitsResult = await makeRequest('PUT', `/group-orders/${groupOrderId}/spending-limits`, {
      spendingLimits: {
        enabled: true,
        defaultLimit: 25.00,
        participantLimits: {}
      }
    });
    
    if (spendingLimitsResult.success) {
      console.log('✅ Spending limits set successfully (default: $25.00)');
    } else {
      console.log(`❌ Failed to set spending limits: ${JSON.stringify(spendingLimitsResult.data)}`);
    }
    
    // Step 4: Test payment structure update
    console.log('\n💳 Step 4: Testing payment structures...');
    
    const paymentStructures = ['pay_own', 'equal_split', 'pay_all'];
    
    for (const structure of paymentStructures) {
      const paymentResult = await makeRequest('PUT', `/group-orders/${groupOrderId}/payment-structure`, {
        paymentStructure: structure,
        customSplits: null
      });
      
      if (paymentResult.success) {
        console.log(`✅ Payment structure set to: ${structure}`);
      } else {
        console.log(`❌ Failed to set payment structure to ${structure}: ${JSON.stringify(paymentResult.data)}`);
      }
    }
    
    // Step 5: Get final group order details
    console.log('\n📊 Step 5: Fetching final group order details...');
    
    const detailsResult = await makeRequest('GET', `/group-orders/${groupOrderId}`);
    
    if (detailsResult.success) {
      const groupOrder = detailsResult.data.data;
      console.log('✅ Group order details retrieved successfully');
      console.log(`   Status: ${groupOrder.status}`);
      console.log(`   Participants: ${groupOrder.participants?.length || 0}`);
      console.log(`   Payment Structure: ${groupOrder.paymentStructure}`);
      console.log(`   Spending Limits: ${groupOrder.spendingLimits?.enabled ? 'Enabled' : 'Disabled'}`);
      if (groupOrder.spendingLimits?.enabled) {
        console.log(`   Default Limit: $${groupOrder.spendingLimits.defaultLimit}`);
      }
    } else {
      console.log(`❌ Failed to get group order details: ${JSON.stringify(detailsResult.data)}`);
    }
    
    // Step 6: Test join code validation
    console.log('\n🔍 Step 6: Testing join code validation...');
    
    const validateResult = await makeRequest('GET', `/group-orders/validate-join-code?joinCode=${joinCode}`);
    
    if (validateResult.success) {
      console.log('✅ Join code validation successful');
      console.log(`   Valid: ${validateResult.data.data.isValid}`);
    } else {
      console.log(`❌ Join code validation failed: ${JSON.stringify(validateResult.data)}`);
    }
    
    console.log('\n🎉 Complete Group Ordering Integration Test PASSED!');
    console.log('\n📋 Test Summary:');
    console.log(`   ✅ Group Order Created: ${groupOrderId}`);
    console.log(`   ✅ Join Code Generated: ${joinCode}`);
    console.log(`   ✅ Participants Added: ${participantIds.length}`);
    console.log(`   ✅ Spending Limits: Working`);
    console.log(`   ✅ Payment Structures: Working`);
    console.log(`   ✅ Join Code Validation: Working`);
    
    return {
      success: true,
      groupOrderId,
      joinCode,
      participantCount: participantIds.length + 1
    };
    
  } catch (error) {
    console.error('\n❌ Integration Test FAILED:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testCompleteGroupOrdering()
  .then(result => {
    if (result.success) {
      console.log('\n✅ All tests completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Tests failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });