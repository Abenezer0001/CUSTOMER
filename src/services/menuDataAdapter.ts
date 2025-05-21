import axios from 'axios';
import { MenuItem as UIMenuItem } from '@/types/menu';
import { API_BASE_URL } from '@/config/api';

// API Base URL imported from centralized configuration

// Restaurant ID - Cinema City Arabian Centre
const RESTAURANT_ID = "68187734a6d5090de7422456";

/**
 * API Data Interfaces
 */
export interface APICategory {
  _id: string;
  name: string;
  description: string;
  image: string;
  isActive: boolean;
  order: number;
  restaurantId: string;
}

export interface APISubcategory {
  _id: string;
  name: string;
  description: string;
  image: string;
  isActive: boolean;
  order: number;
  categoryId: string;
}

export interface APIMenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categories: string[];
  subCategories?: string[];
  isAvailable: boolean;
  isActive: boolean;
  tags?: string[];
  popular?: boolean;
  featured?: boolean;
}

/**
 * Maps from UI MenuItem format to API MenuItem format
 */
export const mapUIToAPIMenuItem = (
  uiItem: UIMenuItem, 
  categoryId: string, 
  subcategoryId?: string
): APIMenuItem => {
  return {
    _id: uiItem.id, // Keep the same ID for now
    name: uiItem.name,
    description: uiItem.description,
    price: uiItem.price,
    image: uiItem.image,
    categories: [categoryId],
    subCategories: subcategoryId ? [subcategoryId] : undefined,
    isAvailable: true,
    isActive: true,
    tags: uiItem.tags,
    popular: uiItem.popular,
    featured: uiItem.featured
  };
};

/**
 * Maps from API MenuItem format to UI MenuItem format
 */
export const mapAPIToUIMenuItem = (
  apiItem: APIMenuItem, 
  categoryMap: Record<string, APICategory>,
  subcategoryMap: Record<string, APISubcategory>
): UIMenuItem => {
  // Get the first category and subcategory IDs
  const categoryId = apiItem.categories && apiItem.categories.length > 0 
    ? apiItem.categories[0] 
    : '';
    
  const subcategoryId = apiItem.subCategories && apiItem.subCategories.length > 0 
    ? apiItem.subCategories[0] 
    : '';

  // Get category and subcategory names
  const category = categoryId && categoryMap[categoryId] 
    ? categoryMap[categoryId].name.toLowerCase() 
    : '';
    
  const subcategory = subcategoryId && subcategoryMap[subcategoryId] 
    ? subcategoryMap[subcategoryId].name 
    : undefined;

  return {
    id: apiItem._id,
    name: apiItem.name,
    description: apiItem.description,
    price: apiItem.price,
    image: apiItem.image,
    imageSearchTerm: apiItem.name, // Generate a search term from the name
    category,
    categoryId: categoryId,
    subcategory,
    featured: apiItem.featured || false,
    popular: apiItem.popular || false,
    tags: apiItem.tags || [],
  };
};

/**
 * Fetches categories from the API
 */
export const fetchCategories = async (): Promise<APICategory[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/categories`);
    return response.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw new Error('Failed to fetch categories');
  }
};

/**
 * Creates a category in the API
 */
export const createCategory = async (category: Omit<APICategory, '_id'>): Promise<APICategory> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/categories`, category);
    return response.data;
  } catch (error) {
    console.error('Error creating category:', error);
    throw new Error('Failed to create category');
  }
};

/**
 * Fetches subcategories for a category from the API
 */
export const fetchSubcategories = async (categoryId: string): Promise<APISubcategory[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/categories/${categoryId}/subcategories`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching subcategories for category ${categoryId}:`, error);
    throw new Error(`Failed to fetch subcategories for category ${categoryId}`);
  }
};

/**
 * Creates a subcategory in the API
 */
export const createSubcategory = async (
  categoryId: string, 
  subcategory: Omit<APISubcategory, '_id' | 'categoryId'>
): Promise<APISubcategory> => {
  try {
    const subcategoryWithCategoryId = {
      ...subcategory,
      categoryId
    };
    const response = await axios.post(
      `${API_BASE_URL}/categories/${categoryId}/subcategories`, 
      subcategoryWithCategoryId
    );
    return response.data;
  } catch (error) {
    console.error(`Error creating subcategory in category ${categoryId}:`, error);
    throw new Error(`Failed to create subcategory in category ${categoryId}`);
  }
};

/**
 * Fetches menu items from the API
 */
export const fetchMenuItems = async (
  categoryId?: string, 
  subcategoryId?: string
): Promise<APIMenuItem[]> => {
  try {
    let url = `${API_BASE_URL}/menu-items`;
    const params = new URLSearchParams();
    
    if (categoryId) params.append('categoryId', categoryId);
    if (subcategoryId) params.append('subcategoryId', subcategoryId);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching menu items:', error);
    throw new Error('Failed to fetch menu items');
  }
};

/**
 * Creates a menu item in the API
 */
export const createMenuItem = async (menuItem: Omit<APIMenuItem, '_id'>): Promise<APIMenuItem> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/menu-items`, menuItem);
    return response.data;
  } catch (error) {
    console.error('Error creating menu item:', error);
    throw new Error('Failed to create menu item');
  }
};

/**
 * Transforms our existing menu data to match API format and creates items
 * @param existingMenuItems The UI-formatted menu items from our existing data
 */
export const migrateMenuItemsToAPI = async (
  existingMenuItems: UIMenuItem[]
): Promise<Record<string, string>> => {
  try {
    // Step 1: Create the categories
    const categoryMap: Record<string, APICategory> = {};
    const uniqueCategories = [...new Set(existingMenuItems.map(item => item.category))];
    
    for (let i = 0; i < uniqueCategories.length; i++) {
      const categoryName = uniqueCategories[i];
      const categoryData = {
        name: categoryName.charAt(0).toUpperCase() + categoryName.slice(1), // Capitalize first letter
        description: `${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} selection`,
        image: existingMenuItems.find(item => item.category === categoryName)?.image || '',
        isActive: true,
        order: i + 1,
        restaurantId: RESTAURANT_ID
      };
      
      const category = await createCategory(categoryData);
      categoryMap[categoryName] = category;
    }

    // Step 2: Create subcategories
    const subcategoryMap: Record<string, APISubcategory> = {};
    const categoryToSubcategories: Record<string, string[]> = {};
    
    // Group subcategories by category
    existingMenuItems.forEach(item => {
      if (item.subcategory) {
        if (!categoryToSubcategories[item.category]) {
          categoryToSubcategories[item.category] = [];
        }
        if (!categoryToSubcategories[item.category].includes(item.subcategory)) {
          categoryToSubcategories[item.category].push(item.subcategory);
        }
      }
    });
    
    // Create subcategories for each category
    for (const [category, subcategories] of Object.entries(categoryToSubcategories)) {
      const categoryId = categoryMap[category]._id;
      
      for (let i = 0; i < subcategories.length; i++) {
        const subcategoryName = subcategories[i];
        const subcategoryData = {
          name: subcategoryName,
          description: `${subcategoryName} items`,
          image: existingMenuItems.find(
            item => item.category === category && item.subcategory === subcategoryName
          )?.image || '',
          isActive: true,
          order: i + 1
        };
        
        const subcategory = await createSubcategory(categoryId, subcategoryData);
        // Create a unique key to identify this subcategory
        const key = `${category}:${subcategoryName}`;
        subcategoryMap[key] = subcategory;
      }
    }

    // Step 3: Create menu items
    const idMap: Record<string, string> = {};
    
    for (const item of existingMenuItems) {
      const categoryId = categoryMap[item.category]._id;
      const subcategoryKey = item.subcategory ? `${item.category}:${item.subcategory}` : undefined;
      const subcategoryId = subcategoryKey ? subcategoryMap[subcategoryKey]._id : undefined;
      
      const apiItem = mapUIToAPIMenuItem(item, categoryId, subcategoryId);
      const createdItem = await createMenuItem(apiItem);
      
      // Store the mapping between the old UI id and the new API _id
      idMap[item.id] = createdItem._id;
    }
    
    return idMap;
  } catch (error) {
    console.error('Error migrating menu items to API:', error);
    throw new Error(`Failed to migrate menu items: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Fetches all data from API and transforms to UI format
 */
export const fetchAllMenuDataForUI = async (): Promise<UIMenuItem[]> => {
  try {
    // Fetch all categories and create a lookup map
    const categories = await fetchCategories();
    const categoryMap: Record<string, APICategory> = {};
    categories.forEach(category => {
      categoryMap[category._id] = category;
    });
    
    // Fetch all subcategories and create a lookup map
    const subcategoryMap: Record<string, APISubcategory> = {};
    for (const category of categories) {
      const subcategories = await fetchSubcategories(category._id);
      subcategories.forEach(subcategory => {
        subcategoryMap[subcategory._id] = subcategory;
      });
    }
    
    // Fetch all menu items and convert to UI format
    const menuItems = await fetchMenuItems();
    return menuItems.map(item => mapAPIToUIMenuItem(item, categoryMap, subcategoryMap));
  } catch (error) {
    console.error('Error fetching all menu data for UI:', error);
    throw new Error('Failed to fetch menu data');
  }
};

