import { Category, MenuItem } from '@/types';
import { API_BASE_URL } from '@/config/constants';
import apiClient from '@/api/apiClient';
import axios from 'axios';

// Create a separate client for public endpoints that don't require authentication
const publicApiClient = axios.create({
  baseURL: API_BASE_URL.replace('/api', ''), // Remove /api suffix to get base URL
  withCredentials: true, // Keep cookies for session management
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': 'application/json'
  },
  timeout: 15000,
});

// Add request interceptor for public client (no auth headers)
publicApiClient.interceptors.request.use(
  (config) => {
    // Handle double /api/ prefixes
    if (config.url && config.url.includes('/api/api/')) {
      console.warn('⚠️ Double /api/ prefix detected in URL:', config.url);
      config.url = config.url.replace('/api/api/', '/api/');
      console.log('🔧 Fixed URL:', config.url);
    }
    
    console.log(`🔷 Making public ${config.method?.toUpperCase()} request to ${config.url}`);
    console.log('🔓 No authentication headers added for public endpoint');
    
    return config;
  },
  (error) => {
    console.error('❌ Public request configuration error:', error.message);
    return Promise.reject(error);
  }
);

// Map the data from API response to match our types
const mapMenuItem = (item: any): MenuItem => {
  return {
    ...item,
    id: item._id || item.id,  // Use _id as id for compatibility
    category: item.categoryId || '',  // Assign categoryId to category for compatibility
    imageSearchTerm: item.imageSearchTerm || '',  // Ensure imageSearchTerm exists
    preparationTime: item.preparationTime || '',  // Ensure preparationTime exists
    nutritionInfo: item.nutritionInfo || null,    // Ensure nutritionInfo exists
    modifiers: item.modifierGroups || [],  // Map modifierGroups to modifiers
  };
};

// API Services
export const api = {
  // Get all categories
  getCategories: async (): Promise<Category[]> => {
    try {
      // Don't use API_BASE_URL since apiClient already has the base URL configured
      const response = await publicApiClient.get('/api/categories');
      
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
      const response = await publicApiClient.get('/api/menu-items');
      
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
      const response = await publicApiClient.get(`/api/categories/${categoryId}/menu-items`);
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
      const response = await publicApiClient.get(`/api/menu-items/${id}`);
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
      const response = await publicApiClient.get(`/api/menu-items/featured`);
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
      const response = await publicApiClient.get(`/api/menu-items/popular`);
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
      const response = await publicApiClient.get(`/api/menu-items/search?query=${encodeURIComponent(query)}`);
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
