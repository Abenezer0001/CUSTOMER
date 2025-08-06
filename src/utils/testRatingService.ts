/**
 * Test utility to verify the rating service works with updated backend endpoints
 * This file can be used to test the rating service functionality
 */

import ratingService from '@/api/ratingService';
import { RatingSubmission } from '@/types';

export interface RatingServiceTestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Test fetching rating stats for a menu item
 */
export async function testGetRatingStats(menuItemId: string): Promise<RatingServiceTestResult> {
  try {
    console.log(`Testing rating stats fetch for menu item: ${menuItemId}`);
    const stats = await ratingService.getMenuItemRatingStats(menuItemId);
    
    return {
      success: true,
      message: 'Rating stats fetched successfully',
      data: stats
    };
  } catch (error: any) {
    console.error('Rating stats test failed:', error);
    return {
      success: false,
      message: 'Failed to fetch rating stats',
      error: error.message
    };
  }
}

/**
 * Test submitting a rating (requires authentication)
 */
export async function testSubmitRating(
  menuItemId: string, 
  rating: number, 
  comment?: string
): Promise<RatingServiceTestResult> {
  try {
    console.log(`Testing rating submission for menu item: ${menuItemId}`);
    
    const submissionData: RatingSubmission = {
      menuItemId,
      rating,
      comment
    };
    
    const result = await ratingService.submitRating(submissionData);
    
    return {
      success: true,
      message: 'Rating submitted successfully',
      data: result
    };
  } catch (error: any) {
    console.error('Rating submission test failed:', error);
    return {
      success: false,
      message: 'Failed to submit rating',
      error: error.message
    };
  }
}

/**
 * Test checking user's existing rating for a menu item
 */
export async function testGetUserRating(menuItemId: string): Promise<RatingServiceTestResult> {
  try {
    console.log(`Testing user rating check for menu item: ${menuItemId}`);
    const userRating = await ratingService.getUserRatingForItem(menuItemId);
    
    return {
      success: true,
      message: userRating ? 'User rating found' : 'No existing user rating',
      data: userRating
    };
  } catch (error: any) {
    console.error('User rating check test failed:', error);
    return {
      success: false,
      message: 'Failed to check user rating',
      error: error.message
    };
  }
}

/**
 * Test fetching ratings for a menu item with filters
 */
export async function testGetMenuItemRatings(
  menuItemId: string,
  page: number = 1,
  limit: number = 10
): Promise<RatingServiceTestResult> {
  try {
    console.log(`Testing menu item ratings fetch for: ${menuItemId}`);
    const ratings = await ratingService.getMenuItemRatings(menuItemId, {
      page,
      limit,
      sortBy: 'recent'
    });
    
    return {
      success: true,
      message: 'Menu item ratings fetched successfully',
      data: ratings
    };
  } catch (error: any) {
    console.error('Menu item ratings test failed:', error);
    return {
      success: false,
      message: 'Failed to fetch menu item ratings',
      error: error.message
    };
  }
}

/**
 * Test bulk rating stats fetch
 */
export async function testBulkRatingStats(menuItemIds: string[]): Promise<RatingServiceTestResult> {
  try {
    console.log(`Testing bulk rating stats for ${menuItemIds.length} items`);
    const bulkStats = await ratingService.getBulkRatingStats(menuItemIds);
    
    return {
      success: true,
      message: 'Bulk rating stats fetched successfully',
      data: bulkStats
    };
  } catch (error: any) {
    console.error('Bulk rating stats test failed:', error);
    return {
      success: false,
      message: 'Failed to fetch bulk rating stats',
      error: error.message
    };
  }
}

/**
 * Run all rating service tests
 */
export async function runAllRatingTests(menuItemId?: string): Promise<RatingServiceTestResult[]> {
  const testMenuItemId = menuItemId || 'test-menu-item-id';
  const results: RatingServiceTestResult[] = [];
  
  console.log('Starting comprehensive rating service tests...');
  
  // Test 1: Get rating stats
  console.log('\n--- Test 1: Get Rating Stats ---');
  const statsResult = await testGetRatingStats(testMenuItemId);
  results.push(statsResult);
  console.log('Result:', statsResult);
  
  // Test 2: Check user rating
  console.log('\n--- Test 2: Check User Rating ---');
  const userRatingResult = await testGetUserRating(testMenuItemId);
  results.push(userRatingResult);
  console.log('Result:', userRatingResult);
  
  // Test 3: Get menu item ratings
  console.log('\n--- Test 3: Get Menu Item Ratings ---');
  const ratingsResult = await testGetMenuItemRatings(testMenuItemId);
  results.push(ratingsResult);
  console.log('Result:', ratingsResult);
  
  // Test 4: Bulk rating stats
  console.log('\n--- Test 4: Bulk Rating Stats ---');
  const bulkResult = await testBulkRatingStats([testMenuItemId]);
  results.push(bulkResult);
  console.log('Result:', bulkResult);
  
  // Note: We don't test rating submission here as it requires authentication
  // and should be tested manually or in authenticated contexts
  
  console.log('\n--- Test Summary ---');
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  console.log(`Tests completed: ${successful}/${total} successful`);
  
  return results;
}

/**
 * Test authentication status by attempting an authenticated operation
 */
export async function testAuthenticationStatus(): Promise<RatingServiceTestResult> {
  try {
    console.log('Testing authentication status...');
    
    // Try to get user rating for a test item (this requires auth)
    const testResult = await ratingService.getUserRatingForItem('test-auth-check');
    
    return {
      success: true,
      message: 'Authentication is working (user is authenticated)',
      data: { authenticated: true, hasRating: !!testResult }
    };
  } catch (error: any) {
    if (error.message?.includes('log in')) {
      return {
        success: true,
        message: 'Not authenticated (this is expected for unauthenticated users)',
        data: { authenticated: false }
      };
    }
    
    return {
      success: false,
      message: 'Authentication test failed',
      error: error.message
    };
  }
}

// Export a function that can be called from browser console for testing
export function testRatingServiceInConsole(menuItemId?: string) {
  console.log('🧪 Starting Rating Service Tests...');
  
  // Test authentication first
  testAuthenticationStatus().then(authResult => {
    console.log('🔐 Authentication Status:', authResult);
  });
  
  // Run all tests
  runAllRatingTests(menuItemId).then(results => {
    console.log('✅ All tests completed!');
    console.table(results.map(r => ({
      success: r.success,
      message: r.message,
      error: r.error || 'None'
    })));
  });
}

// Add to window for easy access in browser console
if (typeof window !== 'undefined') {
  (window as any).testRatingService = testRatingServiceInConsole;
}