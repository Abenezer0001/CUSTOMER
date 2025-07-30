// Customer-facing Rating Service for inseat-menu
import { api } from './api';
import { API_BASE_URL } from '../config/constants';

// Customer Rating interfaces
export interface Review {
  _id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  restaurantId: string;
  tableId?: string;
  rating: number;
  reviewText: string;
  tags: string[];
  photos: string[];
  isVerifiedPurchase: boolean;
  isRecommended?: boolean;
  status: 'pending' | 'approved' | 'rejected';
  adminResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItemRating {
  menuItemId: string;
  menuItemName: string;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  recentReviews: Review[];
}

export interface RestaurantRating {
  restaurantId: string;
  restaurantName: string;
  overallRating: number;
  totalReviews: number;
  categoryRatings: {
    food: number;
    service: number;
    ambiance: number;
    value: number;
  };
  ratingTrend: 'increasing' | 'decreasing' | 'stable';
}

export interface CreateReviewRequest {
  orderId: string;
  menuItemId?: string;
  rating: number;
  reviewText: string;
  tags?: string[];
  photos?: string[];
  isRecommended?: boolean;
  categoryRatings?: {
    food?: number;
    service?: number;
    ambiance?: number;
    value?: number;
  };
}

export interface ReviewResponse {
  success: boolean;
  message: string;
  review: Review;
  pointsEarned?: number;
}

export interface RecentReviewsResponse {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class RatingService {
  private baseUrl = `${API_BASE_URL}/api/v1/ratings`;

  // Submit a new review
  async submitReview(reviewData: CreateReviewRequest): Promise<ReviewResponse> {
    try {
      const response = await api.post(`${this.baseUrl}/reviews`, reviewData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to submit review');
    }
  }

  // Get reviews for a specific menu item
  async getMenuItemReviews(menuItemId: string, page: number = 1, limit: number = 10): Promise<RecentReviewsResponse> {
    try {
      const response = await api.get(`${this.baseUrl}/menu-items/${menuItemId}/reviews`, {
        params: { page, limit }
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch menu item reviews');
    }
  }

  // Get menu item rating summary
  async getMenuItemRating(menuItemId: string): Promise<MenuItemRating> {
    try {
      const response = await api.get(`${this.baseUrl}/menu-items/${menuItemId}/summary`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch menu item rating');
    }
  }

  // Get restaurant reviews
  async getRestaurantReviews(restaurantId: string, page: number = 1, limit: number = 10): Promise<RecentReviewsResponse> {
    try {
      const response = await api.get(`${this.baseUrl}/restaurants/${restaurantId}/reviews`, {
        params: { page, limit }
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch restaurant reviews');
    }
  }

  // Get restaurant rating summary
  async getRestaurantRating(restaurantId: string): Promise<RestaurantRating> {
    try {
      const response = await api.get(`${this.baseUrl}/restaurants/${restaurantId}/summary`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch restaurant rating');
    }
  }

  // Get customer's own reviews
  async getMyReviews(page: number = 1, limit: number = 10): Promise<RecentReviewsResponse> {
    try {
      const response = await api.get(`${this.baseUrl}/my-reviews`, {
        params: { page, limit }
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch your reviews');
    }
  }

  // Update an existing review
  async updateReview(reviewId: string, updateData: Partial<CreateReviewRequest>): Promise<Review> {
    try {
      const response = await api.put(`${this.baseUrl}/reviews/${reviewId}`, updateData);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update review');
    }
  }

  // Delete a review
  async deleteReview(reviewId: string): Promise<{ success: boolean }> {
    try {
      const response = await api.delete(`${this.baseUrl}/reviews/${reviewId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete review');
    }
  }

  // Upload review photos
  async uploadReviewPhotos(files: File[]): Promise<string[]> {
    try {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append(`photos`, file);
      });

      const response = await api.post(`${this.baseUrl}/upload-photos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data.photoUrls;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to upload photos');
    }
  }

  // Report inappropriate review
  async reportReview(reviewId: string, reason: string): Promise<{ success: boolean }> {
    try {
      const response = await api.post(`${this.baseUrl}/reviews/${reviewId}/report`, { reason });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to report review');
    }
  }

  // Like/Unlike a review
  async toggleReviewLike(reviewId: string): Promise<{ liked: boolean; likeCount: number }> {
    try {
      const response = await api.post(`${this.baseUrl}/reviews/${reviewId}/toggle-like`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to toggle like');
    }
  }

  // Get trending/featured reviews for restaurant
  async getFeaturedReviews(restaurantId: string, limit: number = 5): Promise<Review[]> {
    try {
      const response = await api.get(`${this.baseUrl}/restaurants/${restaurantId}/featured`, {
        params: { limit }
      });
      return response.data.data.reviews;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch featured reviews');
    }
  }

  // Search reviews by text
  async searchReviews(restaurantId: string, query: string, page: number = 1): Promise<RecentReviewsResponse> {
    try {
      const response = await api.get(`${this.baseUrl}/restaurants/${restaurantId}/search`, {
        params: { query, page }
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to search reviews');
    }
  }

  // Get review statistics for display
  async getReviewStats(restaurantId: string): Promise<{
    totalReviews: number;
    averageRating: number;
    monthlyGrowth: number;
    topTags: { tag: string; count: number }[];
  }> {
    try {
      const response = await api.get(`${this.baseUrl}/restaurants/${restaurantId}/stats`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch review stats');
    }
  }

  // Check if customer can review an order
  async canReviewOrder(orderId: string): Promise<{ canReview: boolean; reason?: string }> {
    try {
      const response = await api.get(`${this.baseUrl}/orders/${orderId}/can-review`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to check review eligibility');
    }
  }

  // Get review prompts/suggestions
  async getReviewPrompts(restaurantId: string): Promise<{
    suggestions: string[];
    popularTags: string[];
  }> {
    try {
      const response = await api.get(`${this.baseUrl}/restaurants/${restaurantId}/prompts`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch review prompts');
    }
  }
}

export const ratingService = new RatingService();
export default ratingService;
