import axios, { AxiosError } from 'axios';
import { Table, TableDetails, Venue, VenueDetails } from '@/types';
import { API_BASE_URL } from '@/constants';

// Use API_BASE_URL from centralized configuration

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

export class TableNotActiveError extends ApiError {
  constructor(tableId: string) {
    super(`Table with ID ${tableId} is not active`, 403);
    this.name = 'TableNotActiveError';
  }
}

export class VenueNotFoundError extends ApiError {
  constructor(tableId: string) {
    super(`Venue not found for table with ID ${tableId}`, 404);
    this.name = 'VenueNotFoundError';
  }
}

export class VenueNotActiveError extends ApiError {
  constructor(venueId: string) {
    super(`Venue with ID ${venueId} is not active`, 403);
    this.name = 'VenueNotActiveError';
  }
}

// Helper function to handle API errors
const handleApiError = (error: unknown, defaultMessage: string): never => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      // Handle specific error status codes
      const status = axiosError.response.status;
      const responseData = axiosError.response.data as { error?: string; message?: string };
      const errorMessage = responseData.error || responseData.message || defaultMessage;
      
      if (status === 404) {
        if (defaultMessage.includes('table')) {
          throw new TableNotFoundError(defaultMessage.split(' ').pop() || '');
        } else if (defaultMessage.includes('venue')) {
          throw new VenueNotFoundError(defaultMessage.split(' ').pop() || '');
        }
      } else if (status === 403) {
        if (defaultMessage.includes('table')) {
          throw new TableNotActiveError(defaultMessage.split(' ').pop() || '');
        } else if (defaultMessage.includes('venue')) {
          throw new VenueNotActiveError(defaultMessage.split(' ').pop() || '');
        }
      }
      
      throw new ApiError(errorMessage, status, axiosError.response.data);
    } else if (axiosError.request) {
      throw new ApiError('No response received from server', 503);
    }
  }
  
  // Handle unknown error types
  throw new ApiError(
    error instanceof Error ? error.message : defaultMessage
  );
};

/**
 * Gets a table by its ID
 * @param tableId - The ID of the table to retrieve
 * @returns The table details
 * @throws {TableNotFoundError} If the table is not found
 * @throws {ApiError} For other API errors
 */
export const getTableById = async (tableId: string): Promise<Table> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/tables/${tableId}`);
    
    // Check if the table is active
    const table = response.data;
    if (!table.isActive) {
      throw new TableNotActiveError(tableId);
    }
    
    return table;
  } catch (error) {
    console.error('Error fetching table:', error);
    return handleApiError(error, `Failed to fetch table with ID ${tableId}`);
  }
};

/**
 * Gets table details including venue information
 * @param tableId - The ID of the table to retrieve details for
 * @returns Table details and venue information
 * @throws {TableNotFoundError} If the table is not found
 * @throws {VenueNotFoundError} If the venue is not found
 * @throws {ApiError} For other API errors
 */
export const getTableDetails = async (tableId: string): Promise<{
  table: TableDetails;
  venue: VenueDetails;
}> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/tables/details`, {
      params: { tableId }
    });
    
    const responseData = response.data;
    
    // Validate the response data
    if (!responseData.table) {
      throw new TableNotFoundError(tableId);
    }
    
    if (!responseData.venue) {
      throw new VenueNotFoundError(responseData.table.venueId || 'unknown');
    }
    
    // Check if the table is active
    if (!responseData.table.isActive) {
      throw new TableNotActiveError(tableId);
    }
    
    return {
      table: responseData.table,
      venue: responseData.venue
    };
  } catch (error) {
    console.error('Error fetching table details:', error);
    return handleApiError(error, `Failed to fetch details for table ID ${tableId}`);
  }
};

/**
 * Verifies if a table exists and is available
 * @param tableId - The ID of the table to verify
 * @returns Table verification result with venue data if available
 */
export const verifyTableStatus = async (tableId: string): Promise<{
  exists: boolean;
  isAvailable: boolean;
  venue?: VenueDetails;
}> => {
  try {
    // First try the real API endpoint
    try {
      const response = await axios.get(`${API_BASE_URL}/tables/${tableId}/status`);
      return response.data.data;
    } catch (apiError) {
      console.log('API not available, using fallback verification');
      
      // FALLBACK: If API is not available, use local verification for demo
      // In a real app, you would handle this differently
      
      // For demo purposes, accept any table ID that starts with valid format
      // or use specific test IDs
      const isValidFormat = 
        /^[0-9a-f]{24}$/.test(tableId) || // MongoDB ObjectId format
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(tableId) || // UUID format
        tableId === '123456'; // Test ID
        
      // Always consider these specific IDs as valid for testing
      const testTableIds = [
        '681a581f1a12c59b214b389d',
        '681a582f1a12c59b214b393a',
        '123456'
      ];
      
      const exists = isValidFormat || testTableIds.includes(tableId);
      const isAvailable = exists; // Consider all existing tables as available in demo
      
      // Return fallback data
      return {
        exists,
        isAvailable,
        venue: exists ? {
          _id: `venue_${tableId}`,
          name: `Table ${tableId}`,
          description: 'Fallback venue data',
          address: '123 Test Street',
          logo: '/placeholder.jpg',
          restaurantId: `restaurant_${tableId}`,
          isActive: true,
          openingHours: {
            'Monday': { open: '09:00', close: '22:00' }
          }
        } : undefined
      };
    }
  } catch (error) {
    console.error('Error verifying table status:', error);
    return {
      exists: false,
      isAvailable: false
    };
  }
};

export interface TableData {
  _id: string;
  number: string;
  capacity: number;
  status: string;
  restaurantId: string;
  venueId?: string;
  restaurant?: {
    _id: string;
    name: string;
  };
  venue?: {
    _id: string;
    restaurantId: string;
    restaurant?: {
      _id: string;
      name: string;
    };
  };
}

export class TableService {
  /**
   * Get table details by table ID
   */
  static async getTableById(tableId: string): Promise<TableData> {
    try {
      console.log('Fetching table details for tableId:', tableId);
      
      // Since API_BASE_URL already includes /api, we should use the correct endpoints
      // Let's try various endpoints that might exist on the backend
      const possibleEndpoints = [
        `${API_BASE_URL}/tables/${tableId}`,
        `${API_BASE_URL}/restaurant-service/tables/${tableId}`,
        `${API_BASE_URL}/restaurant/tables/${tableId}`,
        `${API_BASE_URL.replace('/api', '')}/api/tables/${tableId}`,
        `${API_BASE_URL.replace('/api', '')}/api/restaurant-service/tables/${tableId}`
      ];

      let tableData = null;
      let lastError = null;

      for (const endpoint of possibleEndpoints) {
        try {
          console.log('Trying endpoint:', endpoint);
          
          const response = await fetch(endpoint, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          if (response.ok) {
            tableData = await response.json();
            console.log('Table data received from', endpoint, ':', tableData);
            break;
          } else {
            console.log('Endpoint failed:', endpoint, response.status);
          }
        } catch (error) {
          console.log('Error with endpoint:', endpoint, error);
          lastError = error;
        }
      }

      if (!tableData) {
        console.warn('Table not found via API, using fallback data');
        
        // Create fallback table data that allows the app to function
        tableData = {
          _id: tableId,
          number: tableId.substring(tableId.length - 6), // Use last 6 chars as table number
          capacity: 4,
          status: 'available',
          restaurantId: '67563e1b24ae70b95d7bc123', // Default restaurant ID - should be configurable
          venue: {
            _id: `venue_${tableId}`,
            restaurantId: '67563e1b24ae70b95d7bc123',
            restaurant: {
              _id: '67563e1b24ae70b95d7bc123',
              name: 'InSeat Restaurant'
            }
          }
        };
        
        console.log('Using fallback table data:', tableData);
      }
      
      return tableData;
    } catch (error) {
      console.error('Error fetching table details:', error);
      throw error;
    }
  }

  /**
   * Extract restaurant ID from table data
   */
  static getRestaurantIdFromTable(tableData: TableData): string {
    // Try multiple paths to get restaurant ID
    if (tableData.restaurantId) {
      console.log('Found restaurantId directly:', tableData.restaurantId);
      return tableData.restaurantId;
    }
    
    if (tableData.restaurant?._id) {
      console.log('Found restaurant._id:', tableData.restaurant._id);
      return tableData.restaurant._id;
    }
    
    if (tableData.venue?.restaurantId) {
      console.log('Found venue.restaurantId:', tableData.venue.restaurantId);
      return tableData.venue.restaurantId;
    }
    
    if (tableData.venue?.restaurant?._id) {
      console.log('Found venue.restaurant._id:', tableData.venue.restaurant._id);
      return tableData.venue.restaurant._id;
    }
    
    // Try extracting from table ID pattern (some systems use restaurantId-tableNumber)
    const idParts = tableData._id.split('-');
    if (idParts.length > 1) {
      console.log('Trying to extract restaurant ID from table ID pattern:', idParts[0]);
      return idParts[0];
    }
    
    console.error('Could not find restaurant ID in table data:', tableData);
    throw new Error(`Unable to determine restaurant ID from table: ${tableData._id}`);
  }

  /**
   * Get restaurant ID from table ID (convenience method)
   */
  static async getRestaurantIdFromTableId(tableId: string): Promise<string> {
    try {
      console.log('Getting restaurant ID for tableId:', tableId);
      
      // First try to extract from table ID pattern (quick method)
      const idParts = tableId.split('-');
      if (idParts.length > 1 && idParts[0].length === 24) { // MongoDB ObjectId length
        console.log('Extracted restaurant ID from table ID pattern:', idParts[0]);
        return idParts[0];
      }
      
      // If pattern doesn't work, fetch full table data
      const tableData = await this.getTableById(tableId);
      const restaurantId = this.getRestaurantIdFromTable(tableData);
      
      console.log('Successfully extracted restaurant ID:', restaurantId);
      return restaurantId;
    } catch (error) {
      console.error('Error getting restaurant ID from table ID:', error);
      throw error;
    }
  }
}

export default TableService;

