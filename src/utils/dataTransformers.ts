import { ApiError } from '../api/menuService';
import { 
  Category, 
  MenuItem as ApiMenuItem, 
  Subcategory, 
  TableMenu, 
  Venue 
} from '../api/menuService';
import { MenuItem as UiMenuItem } from '../types/menu';

// Type definitions for UI data structures
export interface UiRestaurant {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  address?: string;
  venues?: UiVenue[];
}

export interface UiVenue {
  id: string;
  name: string;
  description: string;
  restaurantId: string;
  restaurantName?: string;
}

export interface UiCategory {
  id: string;
  name: string;
  image: string;
  description?: string;
  restaurantId?: string;
  order?: number;
}

export interface UiSubcategory {
  id: string;
  name: string;
  image: string;
  description?: string;
  categoryId: string;
  order?: number;
}

/**
 * Transform API restaurant data to UI format
 * Maps _id to id and preserves other fields as appropriate
 */
export function transformRestaurant(apiRestaurant: any): UiRestaurant {
  if (!apiRestaurant?._id || !apiRestaurant?.name) {
    throw new ApiError('Invalid restaurant data format', 400);
  }

  return {
    id: apiRestaurant._id,
    name: apiRestaurant.name,
    description: apiRestaurant.description,
    logoUrl: apiRestaurant.logoUrl,
    address: apiRestaurant.address,
    venues: Array.isArray(apiRestaurant.venues) 
      ? apiRestaurant.venues.map(transformVenue)
      : undefined
  };
}

/**
 * Transform API venue data to UI format
 * Maps _id to id and preserves other fields as appropriate
 */
export function transformVenue(apiVenue: Venue): UiVenue {
  if (!apiVenue?._id || !apiVenue?.name) {
    throw new ApiError('Invalid venue data format', 400);
  }

  return {
    id: apiVenue._id,
    name: apiVenue.name,
    description: apiVenue.description || '',
    restaurantId: apiVenue.restaurantId?._id || '',
    restaurantName: apiVenue.restaurantId?.name
  };
}

/**
 * Transform API category data to UI format
 * Maps _id to id and preserves other fields as appropriate
 */
export function transformCategory(apiCategory: Category): UiCategory {
  if (!apiCategory?._id || !apiCategory?.name) {
    throw new ApiError('Invalid category data format', 400);
  }

  return {
    id: apiCategory._id,
    name: apiCategory.name,
    image: apiCategory.image || '',
    description: apiCategory.description,
    restaurantId: apiCategory.restaurantId,
    order: apiCategory.order
  };
}

/**
 * Transform API subcategory data to UI format
 * Maps _id to id and preserves other fields as appropriate
 */
export function transformSubcategory(apiSubcategory: Subcategory): UiSubcategory {
  if (!apiSubcategory?._id || !apiSubcategory?.name) {
    throw new ApiError('Invalid subcategory data format', 400);
  }

  return {
    id: apiSubcategory._id,
    name: apiSubcategory.name,
    image: apiSubcategory.image || '',
    description: apiSubcategory.description,
    categoryId: apiSubcategory.categoryId,
    order: apiSubcategory.order
  };
}

/**
 * Transform API menu item to UI format
 * Maps _id to id and adapts fields to match the UI MenuItem interface
 */
export function transformMenuItem(apiMenuItem: ApiMenuItem): UiMenuItem {
  if (!apiMenuItem?._id || !apiMenuItem?.name) {
    throw new ApiError('Invalid menu item data format', 400);
  }

  return {
    id: apiMenuItem._id,
    name: apiMenuItem.name,
    description: apiMenuItem.description || '',
    price: apiMenuItem.price,
    image: apiMenuItem.image || '',
    imageSearchTerm: '', // This field doesn't exist in API, defaulting to empty
    category: apiMenuItem.categories?.[0] || '', // Take first category as primary
    categoryId: apiMenuItem.categories?.[0] || '', // Using first category ID
    subcategory: apiMenuItem.subCategories?.[0], // Optional subcategory
    featured: false, // Default values since these fields don't exist in API
    popular: false, 
    tags: [], // No direct mapping in API, defaulting to empty array
    // Add any additional fields from the UI MenuItem interface with sensible defaults
  };
}

/**
 * Transform entire table menu from API to UI format
 * Returns categories and menu items in the UI format
 */
export function transformTableMenu(tableMenu: TableMenu): {
  categories: UiCategory[];
  menuItems: UiMenuItem[];
} {
  if (!tableMenu?.menu?.categories || !tableMenu?.menu?.menuItems) {
    throw new ApiError('Invalid table menu data format', 400);
  }

  const transformedCategories = tableMenu.menu.categories.map(transformCategory);
  const transformedMenuItems = tableMenu.menu.menuItems.map(transformMenuItem);

  return {
    categories: transformedCategories,
    menuItems: transformedMenuItems
  };
}

/**
 * Transform entire menu hierarchy to UI format
 * Handles categories, subcategories, and menu items
 */
export function transformMenuHierarchy(apiData: {
  categories: Category[];
  subcategories: { [categoryId: string]: Subcategory[] };
  subsubcategories: { [subcategoryId: string]: Subcategory[] };
  menuItems: ApiMenuItem[];
}): {
  categories: UiCategory[];
  subcategories: { [categoryId: string]: UiSubcategory[] };
  subsubcategories: { [subcategoryId: string]: UiSubcategory[] };
  menuItems: UiMenuItem[];
} {
  // Transform categories
  const transformedCategories = apiData.categories.map(transformCategory);
  
  // Transform subcategories
  const transformedSubcategories: { [categoryId: string]: UiSubcategory[] } = {};
  Object.entries(apiData.subcategories).forEach(([categoryId, subcategories]) => {
    transformedSubcategories[categoryId] = subcategories.map(transformSubcategory);
  });
  
  // Transform subsubcategories
  const transformedSubsubcategories: { [subcategoryId: string]: UiSubcategory[] } = {};
  Object.entries(apiData.subsubcategories).forEach(([subcategoryId, subsubcategories]) => {
    transformedSubsubcategories[subcategoryId] = subsubcategories.map(transformSubcategory);
  });
  
  // Transform menu items
  const transformedMenuItems = apiData.menuItems.map(transformMenuItem);
  
  return {
    categories: transformedCategories,
    subcategories: transformedSubcategories,
    subsubcategories: transformedSubsubcategories,
    menuItems: transformedMenuItems
  };
}

/**
 * Helper function to validate required fields in data objects
 * Throws an ApiError if any required fields are missing
 */
export function validateRequiredFields(data: any, requiredFields: string[]): void {
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) {
      throw new ApiError(`Missing required field: ${field}`, 400);
    }
  }
}

