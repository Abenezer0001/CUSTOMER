import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '@/constants';

// Custom error types for better error handling
export class ApiError extends Error {
  status: number;
  data?: any;
  
  constructor(message: string, status: number = 500, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export class TableNotFoundError extends ApiError {
  constructor(tableId: string) {
    super(`Table with ID ${tableId} not found`, 404);
    this.name = 'TableNotFoundError';
  }
}

export class VenueNotFoundError extends ApiError {
  constructor(venueId: string) {
    super(`Venue with ID ${venueId} not found`, 404);
    this.name = 'VenueNotFoundError';
  }
}

export class TableNotAvailableError extends ApiError {
  constructor(tableId: string) {
    super(`Table with ID ${tableId} is not available`, 400);
    this.name = 'TableNotAvailableError';
  }
}

// Helper function to handle API errors
const handleApiError = (error: unknown, defaultMessage: string): never => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      // Type assertion for response data to access error property safely
      const responseData = axiosError.response.data as { error?: string };
      throw new ApiError(
        responseData.error || defaultMessage,
        axiosError.response.status,
        axiosError.response.data
      );
    } else if (axiosError.request) {
      throw new ApiError('No response received from server', 503);
    }
  }
  // Handle unknown error types safely
  throw new ApiError(
    error instanceof Error ? error.message : defaultMessage
  );
};

// Interfaces
export interface Venue {
  _id: string;
  name: string;
  description: string;
  restaurantId: {
    _id: string;
    name: string;
  };
}

export interface Table {
  _id: string;
  number: string;
  venueId: string;
  capacity: number;
  isOccupied: boolean;
  isActive: boolean;
}

export interface Category {
  _id: string;
  name: string;
  description: string;
  image: string;
  isActive: boolean;
  order: number;
  restaurantId?: string;
}

export interface Subcategory {
  _id: string;
  name: string;
  description: string;
  image: string;
  isActive: boolean;
  order: number;
  categoryId: string;
}

export interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categories: string[];
  subCategories?: string[];
  isAvailable: boolean;
  isActive: boolean;
}

export interface TableMenu {
  venue: {
    _id: string;
    name: string;
    description: string;
  };
  menu: {
    categories: Category[];
    subcategories: { [categoryId: string]: Subcategory[] };
    menuItems: MenuItem[];
  };
}

// API Functions
export const verifyTableStatus = async (tableId: string): Promise<{
  exists: boolean;
  isAvailable: boolean;
  venue?: Venue;
  table?: Table;
}> => {
  try {
    console.log(`Verifying table status for table ID: ${tableId}`);
    const response = await axios.get(`${API_BASE_URL}/tables/${tableId}/verify`, {
      timeout: 5000 // Add a 5 second timeout for faster feedback
    });
    return response.data;
  } catch (error) {
    console.error('Error verifying table:', error);
    
    // Check for specific error types
    if (axios.isAxiosError(error)) {
      // If it's a 404 Not Found, the table doesn't exist
      if (error.response?.status === 404) {
        throw new TableNotFoundError(tableId);
      }
    }
    
    // For all other errors, throw an appropriate error
    handleApiError(error, `Failed to verify table status for table ID ${tableId}`);
  }
};

export const getTableMenu = async (tableId: string): Promise<TableMenu> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/tables/${tableId}/menu`);
    return response.data;
  } catch (error) {
    console.error('Error fetching table menu:', error);
    handleApiError(error, `Failed to fetch menu for table ID ${tableId}`);
  }
};

export const getCategories = async (): Promise<Category[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/categories`);
    return response.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    handleApiError(error, 'Failed to fetch categories');
  }
};

export const getSubcategories = async (categoryId: string): Promise<Subcategory[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/categories/${categoryId}/subcategories`);
    return response.data;
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    handleApiError(error, `Failed to fetch subcategories for category ${categoryId}`);
  }
};

export const getSubSubcategories = async (subcategoryId: string): Promise<Subcategory[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/subcategories/${subcategoryId}/subsubcategories`);
    return response.data;
  } catch (error) {
    console.error('Error fetching subsubcategories:', error);
    handleApiError(error, `Failed to fetch subsubcategories for subcategory ${subcategoryId}`);
  }
};

export const getMenuItems = async (categoryId?: string, subcategoryId?: string): Promise<MenuItem[]> => {
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
    handleApiError(error, 'Failed to fetch menu items');
  }
};

export const getVenueById = async (venueId: string): Promise<Venue> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/venues/${venueId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching venue:', error);
    handleApiError(error, `Failed to fetch venue with ID ${venueId}`);
  }
};

export const getVenueMenuItems = async (venueId: string): Promise<MenuItem[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/venues/${venueId}/menu-items`);
    return response.data;
  } catch (error) {
    console.error('Error fetching venue menu items:', error);
    handleApiError(error, `Failed to fetch menu items for venue ${venueId}`);
  }
};

export const getFullMenuHierarchy = async (venueId: string): Promise<{
  categories: Category[];
  subcategories: { [categoryId: string]: Subcategory[] };
  subsubcategories: { [subcategoryId: string]: Subcategory[] };
  menuItems: MenuItem[];
}> => {
  try {
    // Get venue info
    const venue = await getVenueById(venueId);
    if (!venue) throw new VenueNotFoundError(venueId);

    // Get all categories
    const categories = await getCategories();
    
    // Get all venue menu items
    const menuItems = await getVenueMenuItems(venueId);
    
    // Get subcategories for each category
    const subcategoriesMap: { [categoryId: string]: Subcategory[] } = {};
    for (const category of categories) {
      const subcategories = await getSubcategories(category._id);
      subcategoriesMap[category._id] = subcategories;
    }
    
    // Initialize subsubcategories (in this case we're using Subcategory as the type since there is no SubSubcategory type)
    const subsubcategoriesMap: { [subcategoryId: string]: Subcategory[] } = {};
    
    return {
      categories,
      subcategories: subcategoriesMap,
      subsubcategories: subsubcategoriesMap,
      menuItems
    };
  } catch (error) {
    console.error('Error fetching full menu hierarchy:', error);
    handleApiError(error, `Failed to fetch full menu hierarchy for venue ${venueId}`);
  }
};

export const getTableById = async (tableId: string): Promise<Table> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/tables/${tableId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching table:', error);
    handleApiError(error, `Failed to fetch table with ID ${tableId}`);
  }
};
