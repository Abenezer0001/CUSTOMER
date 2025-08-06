/**
 * Utility functions for testing and debugging the rating system
 */

import { RatingStats } from '@/types';

/**
 * Generate mock rating stats for testing
 */
export const generateMockRatingStats = (averageRating: number = 4.2, totalReviews: number = 15): RatingStats => {
  // Generate realistic distribution based on average
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  if (averageRating >= 4) {
    distribution[5] = Math.floor(totalReviews * 0.6);
    distribution[4] = Math.floor(totalReviews * 0.3);
    distribution[3] = Math.floor(totalReviews * 0.1);
  } else if (averageRating >= 3) {
    distribution[4] = Math.floor(totalReviews * 0.4);
    distribution[3] = Math.floor(totalReviews * 0.4);
    distribution[2] = Math.floor(totalReviews * 0.2);
  } else {
    distribution[3] = Math.floor(totalReviews * 0.3);
    distribution[2] = Math.floor(totalReviews * 0.4);
    distribution[1] = Math.floor(totalReviews * 0.3);
  }

  return {
    averageRating,
    totalReviews,
    ratingDistribution: distribution
  };
};

/**
 * Check if rating data should be mocked (for development)
 */
export const shouldUseMockData = (): boolean => {
  return import.meta.env.MODE === 'development' && 
         import.meta.env.VITE_USE_MOCK_RATINGS === 'true';
};

/**
 * Log rating fetch attempts for debugging
 */
export const logRatingFetch = (itemId: string, itemName: string, success: boolean, data?: any) => {
  if (import.meta.env.MODE === 'development') {
    console.group(`🌟 Rating Fetch: ${itemName}`);
    console.log('Item ID:', itemId);
    console.log('Success:', success);
    if (success && data) {
      console.log('Rating Data:', data);
    } else if (!success) {
      console.warn('Failed to fetch ratings');
    }
    console.groupEnd();
  }
};

/**
 * Test function to verify rating components are working
 */
export const testRatingDisplay = () => {
  console.log('🧪 Testing rating display components...');
  
  // Test different rating scenarios
  const testCases = [
    { avg: 4.8, reviews: 25, name: 'Highly Rated Item' },
    { avg: 3.2, reviews: 8, name: 'Average Item' },
    { avg: 2.1, reviews: 3, name: 'Low Rated Item' },
    { avg: 0, reviews: 0, name: 'No Reviews Item' }
  ];
  
  testCases.forEach(testCase => {
    const mockStats = generateMockRatingStats(testCase.avg, testCase.reviews);
    console.log(`${testCase.name}:`, mockStats);
  });
};