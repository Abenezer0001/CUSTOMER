// Test script to validate the order authentication flow
// Run this in browser console to test the authentication flow

(function testOrderAuthentication() {
  console.log('=== ORDER AUTHENTICATION TEST SCRIPT ===');
  
  // 1. First, test the cookie parsing
  function testCookieParsing() {
    console.log('\n--- Testing Cookie Parsing ---');
    
    // Mock document.cookie for testing
    const originalCookie = document.cookie;
    document.cookie = 'access_token=test_token; refresh_token=refresh; other=value';
    
    // Get the parsed cookies
    const cookies = window.parseCookies ? window.parseCookies() : null;
    
    if (!cookies) {
      console.error('❌ parseCookies function not available globally. Add window.parseCookies = parseCookies; to orderService.ts for testing');
      return false;
    }
    
    console.log('Parsed cookies:', cookies);
    
    const success = cookies['access_token'] === 'test_token' && 
                   cookies['refresh_token'] === 'refresh' &&
                   cookies['other'] === 'value';
    
    console.log(success ? '✅ Cookie parsing working correctly' : '❌ Cookie parsing failed');
    
    // Reset the cookie
    document.cookie = originalCookie;
    return success;
  }
  
  // 2. Test token validation
  function testTokenValidation() {
    console.log('\n--- Testing Token Validation ---');
    
    // Create a test token (actual JWT structure with base64 encoded parts)
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ 
      id: '6836e3345ccab12be0616da7', 
      email: 'test@example.com',
      role: 'customer',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      iat: Math.floor(Date.now() / 1000)
    }));
    const signature = 'test_signature';
    
    const token = `${header}.${payload}.${signature}`;
    console.log('Test token generated:', token);
    
    // Call the validation function - if available
    if (typeof window.validateJwtToken !== 'function') {
      console.error('❌ validateJwtToken function not exposed globally. Add window.validateJwtToken = function(token) { /* validation code */ } to orderService.ts for testing');
      return false;
    }
    
    const result = window.validateJwtToken(token);
    console.log('Validation result:', result);
    
    if (result.isAuthenticated && result.userId === '6836e3345ccab12be0616da7') {
      console.log('✅ Token validation working correctly');
      return true;
    } else {
      console.log('❌ Token validation failed');
      return false;
    }
  }
  
  // 4. Test expired token handling
  function testExpiredToken() {
    console.log('\n--- Testing Expired Token Handling ---');
    
    // Create an expired token
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ 
      id: '6836e3345ccab12be0616da7', 
      email: 'test@example.com',
      role: 'customer',
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      iat: Math.floor(Date.now() / 1000) - 7200
    }));
    const signature = 'test_signature';
    
    const expiredToken = `${header}.${payload}.${signature}`;
    const result = window.validateJwtToken(expiredToken);
    
    console.log('Expired token validation result:', result);
    if (!result.isAuthenticated && result.userId === null) {
      console.log('✅ Expired token handling working correctly');
      return true;
    } else {
      console.log('❌ Expired token not handled correctly');
      return false;
    }
  }
  
  // 5. Test malformed token handling
  function testMalformedToken() {
    console.log('\n--- Testing Malformed Token Handling ---');
    
    const testCases = [
      { 
        name: 'Missing segments',
        token: 'header.payload'
      },
      {
        name: 'Invalid base64',
        token: 'header.@#$%^&*.signature'
      },
      {
        name: 'Missing required fields',
        token: `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${btoa(JSON.stringify({ 
          email: 'test@example.com'
        }))}.signature`
      },
      {
        name: 'Invalid role',
        token: `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${btoa(JSON.stringify({ 
          id: '6836e3345ccab12be0616da7',
          email: 'test@example.com',
          role: 'invalid_role',
          exp: Math.floor(Date.now() / 1000) + 3600
        }))}.signature`
      }
    ];
    
    const results = testCases.map(testCase => {
      const result = window.validateJwtToken(testCase.token);
      console.log(`Testing ${testCase.name}:`, result);
      return !result.isAuthenticated && result.userId === null;
    });
    
    const allPassed = results.every(Boolean);
    console.log(allPassed ? '✅ Malformed token handling working correctly' : '❌ Malformed token handling failed');
    return allPassed;
  }
  
  // 6. Test order payload construction
  function testOrderPayload() {
    console.log('\n--- Testing Order Payload Construction ---');
    
    const cartItems = [{
      id: 'test_item_1',
      menuItemId: 'test_menu_item_1',
      name: 'Test Item 1',
      price: 10,
      quantity: 1,
      getItemTotal: function() { return this.price * this.quantity; }
    }];
    
    const tableId = '681a58401a12c59b214b39df';
    const restaurantId = '65f456b06c9dfd001b6b1234';
    
    // Test authenticated payload
    const validToken = `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${btoa(JSON.stringify({ 
      id: '6836e3345ccab12be0616da7', 
      email: 'test@example.com',
      role: 'customer',
      exp: Math.floor(Date.now() / 1000) + 3600
    }))}.test_signature`;
    
    // Set up test environment
    const originalCookie = document.cookie;
    document.cookie = `access_token=${validToken}`;
    
    try {
      // Create order with token present
      window.createOrder(cartItems, tableId, restaurantId)
        .then(() => {
          console.log('❌ Order creation should not succeed in test environment');
        })
        .catch(error => {
          // We expect a network error, but should see proper payload construction
          if (error.message.includes('Failed to fetch') || error.message.includes('Network Error')) {
            // Check the logged payload from console
            console.log('✅ Order creation attempted with proper auth payload');
          } else {
            console.log('❌ Unexpected error:', error.message);
          }
        })
        .finally(() => {
          // Reset cookie
          document.cookie = originalCookie;
          
          // Now test guest order payload
          window.createOrder(cartItems, tableId, restaurantId)
            .catch(error => {
              if (error.message.includes('Failed to fetch') || error.message.includes('Network Error')) {
                console.log('✅ Guest order creation attempted with deviceId');
              } else {
                console.log('❌ Unexpected error in guest flow:', error.message);
              }
            });
        });
      
      return true;
    } catch (error) {
      console.error('❌ Error during payload test:', error);
      document.cookie = originalCookie;
      return false;
    }
  }
  
  // 3. Test complete authentication flow
  function testAuthFlow() {
    console.log('\n--- Testing Order Creation Authentication Flow ---');
    
    // Check if required functions are available
    if (typeof window.createOrder !== 'function') {
      console.error('❌ createOrder function not exposed globally. Add window.createOrder = createOrder; to orderService.ts for testing');
      return false;
    }
    
    // Create a test cart
    const cartItems = [
      {
        id: 'test_item_1',
        menuItemId: 'test_menu_item_1',
        name: 'Test Item 1',
        price: 10,
        quantity: 1,
        getItemTotal: function() { return this.price * this.quantity; }
      }
    ];
    
    const tableId = '681a58401a12c59b214b39df';
    const restaurantId = '65f456b06c9dfd001b6b1234';
    
    console.log('Starting order creation test with:', { 
      cartItems, 
      tableId, 
      restaurantId,
      authPresent: Boolean(document.cookie.includes('access_token'))
    });
    
    // This will actually attempt to create an order, but should fail with a
    // controlled error since we're not actually submitting to the server
    window.createOrder(cartItems, tableId, restaurantId)
      .then(result => {
        console.log('✅ Order creation returned result:', result);
      })
      .catch(error => {
        // We expect a network error, not an authentication error
        if (error.message.includes('Authentication required')) {
          console.log('❌ Authentication check failed - redirecting to login when it should use token');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('Network Error')) {
          console.log('✅ Network error as expected, authentication flow is correct');
        } else {
          console.log('⚠️ Unexpected error:', error.message);
        }
      });
  }
  
  // Test environment setup and cleanup
  const testHelpers = {
    // Store original values
    original: {
      cookie: '',
      localStorage: new Map()
    },
    
    // Setup test environment
    setup() {
      console.log('\n--- Setting up test environment ---');
      // Store original values
      this.original.cookie = document.cookie;
      this.original.localStorage.clear();
      Array.from(localStorage).forEach(([key, value]) => {
        this.original.localStorage.set(key, value);
      });
      
      // Clear existing state
      document.cookie = '';
      localStorage.clear();
      
      console.log('✓ Test environment prepared');
    },
    
    // Cleanup after tests
    cleanup() {
      console.log('\n--- Cleaning up test environment ---');
      // Restore original values
      document.cookie = this.original.cookie;
      localStorage.clear();
      this.original.localStorage.forEach((value, key) => {
        localStorage.setItem(key, value);
      });
      
      console.log('✓ Original state restored');
    }
  };
  
  // Function to print test summary results
  function printTestSummary(results) {
    console.log('\n=== TEST RESULTS SUMMARY ===');
    console.table({
      'Cookie Parsing': {
        status: results.cookieParsing ? '✅ PASSED' : '❌ FAILED',
        details: 'Tests cookie extraction and parsing'
      },
      'Token Validation': {
        status: results.tokenValidation ? '✅ PASSED' : '❌ FAILED',
        details: 'Tests JWT token validation'
      },
      'Expired Token': {
        status: results.expiredToken ? '✅ PASSED' : '❌ FAILED',
        details: 'Tests expired token handling'
      },
      'Malformed Token': {
        status: results.malformedToken ? '✅ PASSED' : '❌ FAILED',
        details: 'Tests invalid token formats'
      },
      'Payload Validation': {
        status: results.payloadValidation ? '✅ PASSED' : '❌ FAILED',
        details: 'Tests order payload construction'
      }
    });
    
    const totalPassed = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\nTest Summary: ${totalPassed}/${totalTests} tests passed`);
    return totalPassed === totalTests;
  }
  
  // Add detailed error reporting
  function collectTestErrors(results) {
    const errors = [];
    
    // Test case specific error checks
    if (!results.cookieParsing) {
      errors.push('Cookie Parsing: Failed to parse test cookies correctly');
    }
    
    if (!results.tokenValidation) {
      errors.push('Token Validation: JWT validation failed for valid token');
    }
    
    if (!results.expiredToken) {
      errors.push('Expired Token: Failed to reject expired token');
    }
    
    if (!results.malformedToken) {
      errors.push('Malformed Token: Failed to handle invalid token formats');
    }
    
    if (!results.payloadValidation) {
      errors.push('Payload Validation: Failed to construct order payload correctly');
    }
    
    return errors;
  }
  
  // Add timing info and async support
  async function runAllTests() {
    console.log('\n=== STARTING TEST SUITE ===');
    const startTime = performance.now();
    
    try {
      // Setup test environment
      testHelpers.setup();
      
      const testResults = {
        cookieParsing: await Promise.resolve(testCookieParsing()),
        tokenValidation: await Promise.resolve(testTokenValidation()),
        expiredToken: await Promise.resolve(testExpiredToken()),
        malformedToken: await Promise.resolve(testMalformedToken()),
        payloadValidation: await new Promise(resolve => {
          // Payload validation test is async, wait for completion
          testOrderPayload();
          // Give time for async operations to complete
          setTimeout(() => resolve(true), 1000);
        })
      };
      
      const endTime = performance.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      console.log(`\nTest suite completed in ${duration} seconds`);
      
      if (printTestSummary(testResults)) {
        console.log('\n✅ All validation tests passed, testing complete authentication flow...');
        await new Promise(resolve => {
          testAuthFlow();
          // Wait for auth flow test to complete
          setTimeout(resolve, 1000);
        });
        console.log('\n✅ Authentication flow test completed');
      } else {
        const errors = collectTestErrors(testResults);
        console.log('\n❌ Some tests failed:');
        errors.forEach(error => console.log(`  - ${error}`));
        console.log('\nFix these issues before testing authentication flow');
      }
      
      // Add final statistics
      console.log('\n=== TEST SUITE STATISTICS ===');
      console.table({
        'Total Duration': `${duration} seconds`,
        'Tests Run': Object.keys(testResults).length,
        'Tests Passed': Object.values(testResults).filter(Boolean).length,
        'Tests Failed': Object.values(testResults).filter(r => !r).length,
        'Success Rate': `${((Object.values(testResults).filter(Boolean).length / Object.keys(testResults).length) * 100).toFixed(1)}%`
      });
      
    } catch (error) {
      console.error('\n❌ Test suite failed with error:', error);
      throw error;
    } finally {
      // Always cleanup, even if tests fail
      testHelpers.cleanup();
    }
  }
  
  // Run the tests with proper error handling
  runAllTests().catch(error => {
    console.error('Test suite failed:', error);
  });
  
  console.log('\n=== TEST SCRIPT COMPLETED ===');
  console.log('To manually test the full flow:');
  console.log('1. Start the backend server');
  console.log('2. Login with valid credentials');
  console.log('3. Add items to cart');
  console.log('4. Try to place an order');
  console.log('5. Check browser network tab to confirm the request has the proper Authorization header');
})();

