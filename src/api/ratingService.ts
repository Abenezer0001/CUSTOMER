import apiClient from './apiClient';
import {
  Rating,
  RatingStats,
  RatingFilters,
  RatingSubmission,
  RatingUpdate,
  HelpfulVoteResponse,
  PaginatedRatings,
  RatingAnalytics
} from '@/types';

/**
 * Rating Service - Handles all rating and review API operations
 */
export class RatingService {
  private static instance: RatingService;
  
  public static getInstance(): RatingService {
    if (!RatingService.instance) {
      RatingService.instance = new RatingService();
    }
    return RatingService.instance;
  }

  /**
   * Submit a new rating for a menu item from an order
   */
  async submitRating(data: RatingSubmission): Promise<Rating> {
    try {
      console.log('🔍 Submitting rating with data:', data);
      
      // Debug authentication state before making request
      const token = localStorage.getItem('auth_token');
      const cookies = document.cookie;
      const user = localStorage.getItem('user');
      
      console.log('🔍 Auth state debug before rating submission:', {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
        hasCookies: cookies.includes('auth_token') || cookies.includes('access_token'),
        hasUserData: !!user,
        cookiePreview: cookies.substring(0, 100)
      });

      // Validate token before making request (skip if using HttpOnly cookies)
      if (token && token !== 'http-only-auth-detected') {
        try {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            const now = Math.floor(Date.now() / 1000);
            
            if (payload.exp && payload.exp < now) {
              console.error('🔑 Token is expired, cannot submit rating');
              throw new Error('Your session has expired. Please log in again to submit a rating.');
            }
            
            console.log('🔍 Token validation passed, expires at:', new Date(payload.exp * 1000).toISOString());
          }
        } catch (tokenError) {
          console.warn('⚠️ Could not validate token format:', tokenError);
        }
      } else if (token === 'http-only-auth-detected') {
        console.log('🔍 Using HttpOnly cookie authentication for rating submission');
      } else {
        console.log('🔍 No token available, relying on HttpOnly cookies for authentication');
      }
      
      const response = await apiClient.post('/api/v1/ratings/order-item', data);
      
      if (response.data?.success && response.data?.data) {
        console.log('Rating submitted successfully:', response.data.data);
        return response.data.data;
      }
      
      throw new Error(response.data?.message || 'Failed to submit rating');
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      
      // Enhanced error handling for auth errors
      if (error.response?.status === 401) {
        console.error('🚨 401 Authentication Error Details:', {
          responseData: error.response?.data,
          requestUrl: error.config?.url,
          requestHeaders: error.config?.headers,
          responseHeaders: error.response?.headers
        });
        throw new Error('Please log in to submit a rating');
      }
      
      if (error.response?.status === 403) {
        throw new Error('You can only rate items from your verified orders');
      }
      
      if (error.response?.status === 409) {
        throw new Error('You have already rated this item');
      }
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Failed to submit rating. Please try again.');
    }
  }

  /**
   * Get ratings for a specific menu item with filtering and pagination
   */
  async getMenuItemRatings(
    menuItemId: string, 
    filters: RatingFilters = {}
  ): Promise<PaginatedRatings> {
    try {
      console.log('Fetching ratings for menu item:', menuItemId, 'with filters:', filters);
      
      const params = new URLSearchParams();
      if (filters.rating) params.append('rating', filters.rating.toString());
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.verifiedOnly) params.append('verifiedOnly', 'true');
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      
      const queryString = params.toString();
      const url = `/api/v1/ratings/menu-item/${menuItemId}${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiClient.get(url);
      
      if (response.data?.success && response.data?.data) {
        console.log('Menu item ratings fetched successfully:', response.data.data);
        return response.data.data;
      }
      
      throw new Error(response.data?.message || 'Failed to fetch ratings');
    } catch (error: any) {
      console.error('Error fetching menu item ratings:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Failed to fetch ratings. Please try again.');
    }
  }

  /**
   * Get rating statistics for a specific menu item
   */
  async getMenuItemRatingStats(menuItemId: string): Promise<RatingStats> {
    try {
      console.log('Fetching rating stats for menu item:', menuItemId);
      
      const response = await apiClient.get(`/api/v1/ratings/menu-item/${menuItemId}/stats`);
      
      if (response.data?.success && response.data?.data) {
        console.log('Rating stats fetched successfully:', response.data.data);
        return response.data.data;
      }
      
      throw new Error(response.data?.message || 'Failed to fetch rating stats');
    } catch (error: any) {
      console.error('Error fetching rating stats:', error);
      
      // Enhanced error handling for auth and not found errors
      if (error.response?.status === 401) {
        console.warn('Authentication required for rating stats');
        throw new Error('Please log in to view ratings');
      }
      
      if (error.response?.status === 404) {
        console.log('No rating stats found for menu item:', menuItemId);
        // Return empty stats for 404 instead of throwing
        return {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
      }
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Failed to fetch rating statistics. Please try again.');
    }
  }

  /**
   * Get ratings for a specific restaurant with filtering and pagination
   */
  async getRestaurantRatings(
    restaurantId: string, 
    filters: RatingFilters = {}
  ): Promise<PaginatedRatings> {
    try {
      console.log('Fetching ratings for restaurant:', restaurantId, 'with filters:', filters);
      
      const params = new URLSearchParams();
      if (filters.rating) params.append('rating', filters.rating.toString());
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.verifiedOnly) params.append('verifiedOnly', 'true');
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      
      const queryString = params.toString();
      const url = `/api/v1/ratings/restaurant/${restaurantId}${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiClient.get(url);
      
      if (response.data?.success && response.data?.data) {
        console.log('Restaurant ratings fetched successfully:', response.data.data);
        return response.data.data;
      }
      
      throw new Error(response.data?.message || 'Failed to fetch restaurant ratings');
    } catch (error: any) {
      console.error('Error fetching restaurant ratings:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Failed to fetch restaurant ratings. Please try again.');
    }
  }

  /**
   * Get ratings by a specific user
   */
  async getUserRatings(
    userId: string, 
    filters: Omit<RatingFilters, 'verifiedOnly'> = {}
  ): Promise<PaginatedRatings> {
    try {
      console.log('Fetching ratings for user:', userId, 'with filters:', filters);
      
      const params = new URLSearchParams();
      if (filters.rating) params.append('rating', filters.rating.toString());
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      
      const queryString = params.toString();
      const url = `/api/v1/ratings/user/${userId}${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiClient.get(url);
      
      if (response.data?.success && response.data?.data) {
        console.log('User ratings fetched successfully:', response.data.data);
        return response.data.data;
      }
      
      throw new Error(response.data?.message || 'Failed to fetch user ratings');
    } catch (error: any) {
      console.error('Error fetching user ratings:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Failed to fetch user ratings. Please try again.');
    }
  }

  /**
   * Update an existing rating
   */
  async updateRating(ratingId: string, data: RatingUpdate): Promise<Rating> {
    try {
      console.log('Updating rating:', ratingId, 'with data:', data);
      
      const response = await apiClient.put(`/api/v1/ratings/${ratingId}`, data);
      
      if (response.data?.success && response.data?.data) {
        console.log('Rating updated successfully:', response.data.data);
        return response.data.data;
      }
      
      throw new Error(response.data?.message || 'Failed to update rating');
    } catch (error: any) {
      console.error('Error updating rating:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Failed to update rating. Please try again.');
    }
  }

  /**
   * Delete a rating
   */
  async deleteRating(ratingId: string): Promise<void> {
    try {
      console.log('Deleting rating:', ratingId);
      
      const response = await apiClient.delete(`/api/v1/ratings/${ratingId}`);
      
      if (response.data?.success) {
        console.log('Rating deleted successfully');
        return;
      }
      
      throw new Error(response.data?.message || 'Failed to delete rating');
    } catch (error: any) {
      console.error('Error deleting rating:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Failed to delete rating. Please try again.');
    }
  }

  /**
   * Mark a review as helpful or unhelpful
   */
  async markReviewHelpful(ratingId: string, helpful: boolean = true): Promise<HelpfulVoteResponse> {
    try {
      console.log('Marking review as helpful:', ratingId, 'helpful:', helpful);
      
      const response = await apiClient.post(`/api/v1/ratings/${ratingId}/helpful`, {
        helpful
      });
      
      if (response.data?.success && response.data?.data) {
        console.log('Review helpfulness updated successfully:', response.data.data);
        return response.data.data;
      }
      
      throw new Error(response.data?.message || 'Failed to update review helpfulness');
    } catch (error: any) {
      console.error('Error updating review helpfulness:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Failed to update review helpfulness. Please try again.');
    }
  }

  /**
   * Get rating analytics for a restaurant
   */
  async getRatingAnalytics(restaurantId: string): Promise<RatingAnalytics> {
    try {
      console.log('Fetching rating analytics for restaurant:', restaurantId);
      
      const response = await apiClient.get(`/api/v1/ratings/restaurant/${restaurantId}/analytics`);
      
      if (response.data?.success && response.data?.data) {
        console.log('Rating analytics fetched successfully:', response.data.data);
        return response.data.data;
      }
      
      throw new Error(response.data?.message || 'Failed to fetch rating analytics');
    } catch (error: any) {
      console.error('Error fetching rating analytics:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Failed to fetch rating analytics. Please try again.');
    }
  }

  /**
   * Submit a rating for a specific order item (verified purchase)
   */
  async submitOrderItemRating(data: RatingSubmission & { orderId?: string; orderItemId?: string }): Promise<Rating> {
    try {
      console.log('Submitting order item rating:', data);
      const response = await apiClient.post('/api/v1/ratings/order-item', data);
      
      if (response.data?.success && response.data?.data) {
        console.log('Order item rating submitted successfully:', response.data.data);
        return response.data.data;
      }
      
      throw new Error(response.data?.message || 'Failed to submit order item rating');
    } catch (error: any) {
      console.error('Error submitting order item rating:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Failed to submit order item rating. Please try again.');
    }
  }

  /**
   * Check if user can rate a menu item (using the correct backend endpoint)
   */
  async getUserRatingForItem(menuItemId: string): Promise<Rating | null> {
    try {
      console.log('Checking if user can rate menu item:', menuItemId);
      
      // Use the correct endpoint from the backend: /menu-item/:menuItemId/can-rate
      const response = await apiClient.get(`/api/v1/ratings/menu-item/${menuItemId}/can-rate`);
      
      console.log('Can-rate response:', response.data);
      
      if (response.data?.success) {
        const canRate = response.data.data?.canRate;
        const existingRating = response.data.data?.existingRating;
        
        console.log('User can rate:', canRate);
        console.log('Existing rating:', existingRating);
        
        // Return existing rating if it exists
        if (existingRating) {
          return existingRating;
        }
        
        // Return null if no existing rating (user can rate)
        return null;
      }
      
      // If response doesn't have expected structure, return null
      console.log('Unexpected response structure, returning null');
      return null;
      
    } catch (error: any) {
      // If 404, endpoint doesn't exist - return null
      if (error.response?.status === 404) {
        console.log('Can-rate endpoint not found, returning null');
        return null;
      }
      
      // If 401, user needs to be authenticated
      if (error.response?.status === 401) {
        console.log('Authentication required to check rating ability');
        return null;
      }
      
      console.error('Error checking rating ability:', error);
      
      // Don't throw errors for rating checks - just return null
      console.log('Returning null due to error in getUserRatingForItem');
      return null;
    }
  }

  /**
   * Get aggregated rating stats for multiple menu items
   */
  async getBulkRatingStats(menuItemIds: string[]): Promise<Record<string, RatingStats>> {
    try {
      console.log('Fetching bulk rating stats for menu items:', menuItemIds);
      
      const response = await apiClient.post('/api/v1/ratings/bulk-stats', {
        menuItemIds
      });
      
      if (response.data?.success && response.data?.data) {
        console.log('Bulk rating stats fetched successfully:', response.data.data);
        return response.data.data;
      }
      
      throw new Error(response.data?.message || 'Failed to fetch bulk rating stats');
    } catch (error: any) {
      console.error('Error fetching bulk rating stats:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Failed to fetch rating statistics. Please try again.');
    }
  }
}

// Export singleton instance
export default RatingService.getInstance();