import { Category, MenuItem } from '@/types';
import menuItemsData from '@/data/menu-items.json';
import categoriesData from '@/data/categories-data.json';

// Simulated API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Base URL for placeholder images
const PLACEHOLDER_IMAGE_BASE = 'https://images.unsplash.com/';

// API Services
export const api = {
  // Get all categories
  getCategories: async (): Promise<Category[]> => {
    await delay(300);
    return [...categoriesData];
  },
  
  // Get all menu items
  getMenuItems: async (): Promise<MenuItem[]> => {
    await delay(500);
    return [...menuItemsData.items];
  },
  
  // Get menu items by category
  getMenuItemsByCategory: async (categoryId: string): Promise<MenuItem[]> => {
    await delay(400);
    return menuItemsData.items.filter(item => item.categoryId === categoryId);
  },
  
  // Get a single menu item by ID
  getMenuItem: async (id: string): Promise<MenuItem | undefined> => {
    await delay(300);
    return menuItemsData.items.find(item => item.id === id);
  },
  
  // Get featured menu items
  getFeaturedItems: async (): Promise<MenuItem[]> => {
    await delay(400);
    return menuItemsData.items.filter(item => item.featured);
  },
  
  // Get popular menu items
  getPopularItems: async (): Promise<MenuItem[]> => {
    await delay(400);
    return menuItemsData.items.filter(item => item.popular);
  },
  
  // Search menu items
  searchMenuItems: async (query: string): Promise<MenuItem[]> => {
    await delay(300);
    const lowerCaseQuery = query.toLowerCase();
    return menuItemsData.items.filter(
      item =>
        item.name.toLowerCase().includes(lowerCaseQuery) ||
        item.description.toLowerCase().includes(lowerCaseQuery) ||
        item.tags?.some(tag => tag.toLowerCase().includes(lowerCaseQuery))
    );
  }
};
