import { API_BASE_URL } from '@/constants';
import { getEffectiveToken } from './authService';

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

/**
 * Helper function to prepare request headers with auth token
 * Uses the same pattern as orderService.ts that's working correctly
 */
const getAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  // Get token using authService's method first
  let token = getEffectiveToken();
  
  // If token is "http-only-cookie-present", don't add Authorization header
  // The HTTP-only cookies will be sent automatically with credentials: 'include'
  if (token === 'http-only-cookie-present') {
    console.log('MenuService: HTTP-only cookies detected, relying on automatic cookie transmission');
    return headers;
  }
  
  // If no token from authService, try to get from localStorage directly
  if (!token) {
    token = localStorage.getItem('auth_token');
    console.log('MenuService: Fallback - Got token from localStorage:', token ? 'Token found' : 'No token');
  }
  
  // If still no token, try to parse non-HTTP-only cookies manually (for guest users)
  if (!token) {
    try {
      const cookies = document.cookie.split(';').map(c => c.trim());
      
      // Check for guest user token cookie names (these are not HTTP-only)
      const tokenCookieNames = ['auth_token=', 'jwt=', 'token='];
      
      for (const cookieName of tokenCookieNames) {
        const cookieMatch = cookies.find(cookie => cookie.startsWith(cookieName));
        if (cookieMatch) {
          token = cookieMatch.split('=')[1];
          console.log(`MenuService: Found token in ${cookieName.replace('=', '')} cookie`);
          break;
        }
      }
    } catch (error) {
      console.error('MenuService: Error parsing cookies for token:', error);
    }
  }
  
  // Set Authorization header if we have a valid token
  if (token && token !== 'http-only-cookie-present' && token.length > 10) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('MenuService: Added Authorization header with token (length:', token.length, ')');
  } else {
    console.log('MenuService: No valid auth token available for Authorization header, relying on cookies');
    
    // If we have any cookies at all, log them for debugging (excluding HTTP-only ones)
    if (document.cookie) {
      console.log('MenuService: Available non-HTTP-only cookies (for debugging):', document.cookie.split(';').map(c => c.trim().split('=')[0]));
    }
  }
  
  return headers;
};

// Helper function to handle API errors
const handleApiError = (error: unknown, defaultMessage: string): never => {
  if (error instanceof Response) {
    throw new ApiError(
      defaultMessage,
      error.status,
      error.statusText
    );
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

// API Functions using fetch (same pattern as orderService.ts)
export const verifyTableStatus = async (tableId: string): Promise<{
  exists: boolean;
  isAvailable: boolean;
  venue?: Venue;
  table?: Table;
}> => {
  try {
    console.log(`MenuService: Verifying table status for table ID: ${tableId}`);
    
    const response = await fetch(`${API_BASE_URL}/tables/${tableId}/verify`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include' // This ensures cookies are sent with requests
    });
    
    if (!response.ok) {
      console.error('MenuService: Table verification failed:', response.status, response.statusText);
      
      // If it's a 404 Not Found, the table doesn't exist
      if (response.status === 404) {
        throw new TableNotFoundError(tableId);
      }
      
      // For other errors, get the error message from response
      let errorMessage = `Failed to verify table status for table ID ${tableId}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        console.log('MenuService: Could not parse error response');
      }
      
      throw new ApiError(errorMessage, response.status);
    }
    
    const data = await response.json();
    console.log('MenuService: Table verification successful:', data);
    return data;
  } catch (error) {
    console.error('MenuService: Error verifying table:', error);
    
    // Re-throw known errors
    if (error instanceof TableNotFoundError || error instanceof ApiError) {
      throw error;
    }
    
    // For all other errors, wrap in ApiError
    throw new ApiError(
      error instanceof Error ? error.message : `Failed to verify table status for table ID ${tableId}`
    );
  }
};

export const getTableMenu = async (tableId: string): Promise<TableMenu> => {
  try {
    console.log(`MenuService: Fetching menu for table ID: ${tableId}`);
    
    const response = await fetch(`${API_BASE_URL}/tables/${tableId}/menu`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    
    if (!response.ok) {
      let errorMessage = `Failed to fetch menu for table ID ${tableId}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        console.log('MenuService: Could not parse error response');
      }
      throw new ApiError(errorMessage, response.status);
    }
    
    return await response.json();
  } catch (error) {
    console.error('MenuService: Error fetching table menu:', error);
    handleApiError(error, `Failed to fetch menu for table ID ${tableId}`);
  }
};

export const getCategories = async (): Promise<Category[]> => {
  try {
    console.log('MenuService: Fetching categories');
    
    const response = await fetch(`${API_BASE_URL}/categories`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    
    if (!response.ok) {
      let errorMessage = 'Failed to fetch categories';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        console.log('MenuService: Could not parse error response');
      }
      throw new ApiError(errorMessage, response.status);
    }
    
    return await response.json();
  } catch (error) {
    console.error('MenuService: Error fetching categories:', error);
    handleApiError(error, 'Failed to fetch categories');
  }
};

export const getSubcategories = async (categoryId: string): Promise<Subcategory[]> => {
  try {
    console.log(`MenuService: Fetching subcategories for category: ${categoryId}`);
    
    const response = await fetch(`${API_BASE_URL}/categories/${categoryId}/subcategories`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    
    if (!response.ok) {
      let errorMessage = `Failed to fetch subcategories for category ${categoryId}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        console.log('MenuService: Could not parse error response');
      }
      throw new ApiError(errorMessage, response.status);
    }
    
    return await response.json();
  } catch (error) {
    console.error('MenuService: Error fetching subcategories:', error);
    handleApiError(error, `Failed to fetch subcategories for category ${categoryId}`);
  }
};

export const getSubSubcategories = async (subcategoryId: string): Promise<Subcategory[]> => {
  try {
    console.log(`MenuService: Fetching subsubcategories for subcategory: ${subcategoryId}`);
    
    const response = await fetch(`${API_BASE_URL}/subcategories/${subcategoryId}/subsubcategories`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    
    if (!response.ok) {
      let errorMessage = `Failed to fetch subsubcategories for subcategory ${subcategoryId}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        console.log('MenuService: Could not parse error response');
      }
      throw new ApiError(errorMessage, response.status);
    }
    
    return await response.json();
  } catch (error) {
    console.error('MenuService: Error fetching subsubcategories:', error);
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
    
    console.log(`MenuService: Fetching menu items with URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    
    if (!response.ok) {
      let errorMessage = 'Failed to fetch menu items';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        console.log('MenuService: Could not parse error response');
      }
      throw new ApiError(errorMessage, response.status);
    }
    
    return await response.json();
  } catch (error) {
    console.error('MenuService: Error fetching menu items:', error);
    handleApiError(error, 'Failed to fetch menu items');
  }
};

export const getVenueById = async (venueId: string): Promise<Venue> => {
  try {
    console.log(`MenuService: Fetching venue: ${venueId}`);
    
    const response = await fetch(`${API_BASE_URL}/venues/${venueId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    
    if (!response.ok) {
      let errorMessage = `Failed to fetch venue with ID ${venueId}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        console.log('MenuService: Could not parse error response');
      }
      throw new ApiError(errorMessage, response.status);
    }
    
    return await response.json();
  } catch (error) {
    console.error('MenuService: Error fetching venue:', error);
    handleApiError(error, `Failed to fetch venue with ID ${venueId}`);
  }
};

export const getVenueMenuItems = async (venueId: string): Promise<MenuItem[]> => {
  try {
    console.log(`MenuService: Fetching venue menu items for: ${venueId}`);
    
    const response = await fetch(`${API_BASE_URL}/venues/${venueId}/menu-items`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    
    if (!response.ok) {
      let errorMessage = `Failed to fetch menu items for venue ${venueId}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        console.log('MenuService: Could not parse error response');
      }
      throw new ApiError(errorMessage, response.status);
    }
    
    return await response.json();
  } catch (error) {
    console.error('MenuService: Error fetching venue menu items:', error);
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
    console.error('MenuService: Error fetching full menu hierarchy:', error);
    handleApiError(error, `Failed to fetch full menu hierarchy for venue ${venueId}`);
  }
};

export const getTableById = async (tableId: string): Promise<Table> => {
  try {
    console.log(`MenuService: Fetching table: ${tableId}`);
    
    const response = await fetch(`${API_BASE_URL}/tables/${tableId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    
    if (!response.ok) {
      let errorMessage = `Failed to fetch table with ID ${tableId}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        console.log('MenuService: Could not parse error response');
      }
      throw new ApiError(errorMessage, response.status);
    }
    
    return await response.json();
  } catch (error) {
    console.error('MenuService: Error fetching table:', error);
    handleApiError(error, `Failed to fetch table with ID ${tableId}`);
  }
};
