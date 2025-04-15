
import { Category, MenuItem } from '@/types';
import menuItemsData from '@/data/menu-items.json';
import categoriesData from '@/data/categories-data.json';

// Simulated API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Map the data from JSON to match our types
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
    await delay(300);
    return [...categoriesData];
  },
  
  // Get all menu items
  getMenuItems: async (): Promise<MenuItem[]> => {
    await delay(500);
    return menuItemsData.items.map(mapMenuItem);
  },
  
  // Get menu items by category
  getMenuItemsByCategory: async (categoryId: string): Promise<MenuItem[]> => {
    await delay(400);
    return menuItemsData.items
      .filter(item => item.categoryId === categoryId)
      .map(mapMenuItem);
  },
  
  // Get a single menu item by ID
  getMenuItem: async (id: string): Promise<MenuItem | undefined> => {
    await delay(300);
    const item = menuItemsData.items.find(item => item.id === id);
    return item ? mapMenuItem(item) : undefined;
  },
  
  // Get featured menu items
  getFeaturedItems: async (): Promise<MenuItem[]> => {
    await delay(400);
    return menuItemsData.items
      .filter(item => item.featured)
      .map(mapMenuItem);
  },
  
  // Get popular menu items
  getPopularItems: async (): Promise<MenuItem[]> => {
    await delay(400);
    return menuItemsData.items
      .filter(item => item.popular)
      .map(mapMenuItem);
  },
  
  // Search menu items
  searchMenuItems: async (query: string): Promise<MenuItem[]> => {
    await delay(300);
    const lowerCaseQuery = query.toLowerCase();
    return menuItemsData.items
      .filter(item =>
        item.name.toLowerCase().includes(lowerCaseQuery) ||
        item.description.toLowerCase().includes(lowerCaseQuery) ||
        item.tags?.some(tag => tag.toLowerCase().includes(lowerCaseQuery))
      )
      .map(mapMenuItem);
  }
};
