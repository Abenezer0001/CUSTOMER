import { Category, MenuItem } from '@/types';
import { API_BASE_URL } from '@/config/constants';
import apiClient from '@/api/apiClient';

// Map the data from API response to match our types
const mapMenuItem = (item: any): MenuItem => {
  return {
    ...item,
    category: item.categoryId || '',  // Assign categoryId to category for compatibility
    imageSearchTerm: item.imageSearchTerm || '',  // Ensure imageSearchTerm exists
    preparationTime: item.preparationTime || '',  // Ensure preparationTime exists
    nutritionInfo: item.nutritionInfo || null,    // Ensure nutritionInfo exists
  };
};

// API Services
export const api = {
  // Get all categories
  getCategories: async (): Promise<Category[]> => {
    try {
      // Don't use API_BASE_URL since apiClient already has the base URL configured
      const response = await apiClient.get('/api/categories');
      
      // More flexible response handling
      if (response?.data) {
        // Handle success response with data property
        if (response.data.success && Array.isArray(response.data.data)) {
          return response.data.data;
        }
        // Handle direct array response
        else if (Array.isArray(response.data)) {
          return response.data;
        }
        // Handle object with categories property
        else if (response.data.categories && Array.isArray(response.data.categories)) {
          return response.data.categories;
        }
      }
      
      console.error('Unexpected categories response format:', response?.data);
      throw new Error('Failed to fetch categories');
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },
  
  // Get all menu items
  getMenuItems: async (): Promise<MenuItem[]> => {
    try {
      // Don't use API_BASE_URL since apiClient already has the base URL configured
      const response = await apiClient.get('/api/menu-items');
      
      // More flexible response handling
      if (response?.data) {
        // Handle success response with data property
        if (response.data.success && Array.isArray(response.data.data)) {
          return response.data.data.map(mapMenuItem);
        }
        // Handle direct array response
        else if (Array.isArray(response.data)) {
          return response.data.map(mapMenuItem);
        }
        // Handle object with menuItems property
        else if (response.data.menuItems && Array.isArray(response.data.menuItems)) {
          return response.data.menuItems.map(mapMenuItem);
        }
        // Handle object with items property
        else if (response.data.items && Array.isArray(response.data.items)) {
          return response.data.items.map(mapMenuItem);
        }
      }
      
      console.error('Unexpected menu items response format:', response?.data);
      throw new Error('Failed to fetch menu items');
    } catch (error) {
      console.error('Error fetching menu items:', error);
      throw error;
    }
  },
  
  // Get menu items by category
  getMenuItemsByCategory: async (categoryId: string): Promise<MenuItem[]> => {
    try {
      // Don't use API_BASE_URL since apiClient already has the base URL configured
      const response = await apiClient.get(`/api/categories/${categoryId}/menu-items`);
      if (response?.data?.success) {
        return response.data.data.map(mapMenuItem);
      }
      throw new Error('Failed to fetch menu items by category');
    } catch (error) {
      console.error('Error fetching menu items by category:', error);
      throw error;
    }
  },
  
  // Get a single menu item by ID
  getMenuItem: async (id: string): Promise<MenuItem | undefined> => {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/api/menu-items/${id}`);
      if (response?.data?.success) {
        return mapMenuItem(response.data.data);
      }
      throw new Error('Failed to fetch menu item');
    } catch (error) {
      console.error('Error fetching menu item:', error);
      throw error;
    }
  },
  
  // Get featured menu items
  getFeaturedItems: async (): Promise<MenuItem[]> => {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/api/menu-items/featured`);
      if (response?.data?.success) {
        return response.data.data.map(mapMenuItem);
      }
      throw new Error('Failed to fetch featured items');
    } catch (error) {
      console.error('Error fetching featured items:', error);
      throw error;
    }
  },
  
  // Get popular menu items
  getPopularItems: async (): Promise<MenuItem[]> => {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/api/menu-items/popular`);
      if (response?.data?.success) {
        return response.data.data.map(mapMenuItem);
      }
      throw new Error('Failed to fetch popular items');
    } catch (error) {
      console.error('Error fetching popular items:', error);
      throw error;
    }
  },
  
  // Search menu items
  searchMenuItems: async (query: string): Promise<MenuItem[]> => {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/api/menu-items/search?query=${encodeURIComponent(query)}`);
      if (response?.data?.success) {
        return response.data.data.map(mapMenuItem);
      }
      throw new Error('Failed to search menu items');
    } catch (error) {
      console.error('Error searching menu items:', error);
      throw error;
    }
  }
};
