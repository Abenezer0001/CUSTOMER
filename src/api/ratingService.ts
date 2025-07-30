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
   * Submit a new rating for a menu item
   */
  async submitRating(data: RatingSubmission): Promise<Rating> {
    try {
      console.log('Submitting rating:', data);
      const response = await apiClient.post('/api/v1/ratings', data);
      
      if (response.data?.success && response.data?.data) {
        console.log('Rating submitted successfully:', response.data.data);
        return response.data.data;
      }
      
      throw new Error(response.data?.message || 'Failed to submit rating');
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      
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
   * Check if user has an existing rating for a menu item
   */
  async getUserRatingForItem(menuItemId: string): Promise<Rating | null> {
    try {
      console.log('Checking user rating for menu item:', menuItemId);
      
      const response = await apiClient.get(`/api/v1/ratings/menu-item/${menuItemId}/user-rating`);
      
      if (response.data?.success && response.data?.data) {
        console.log('User rating found:', response.data.data);
        return response.data.data;
      }
      
      // No rating found
      return null;
    } catch (error: any) {
      // If 404, it means no rating exists - this is not an error
      if (error.response?.status === 404) {
        console.log('No existing rating found for user');
        return null;
      }
      
      console.error('Error checking user rating:', error);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Failed to check existing rating. Please try again.');
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