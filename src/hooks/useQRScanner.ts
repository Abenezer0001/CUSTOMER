import { useState, useCallback } from 'react';
import { 
  getTableById,
  verifyTableStatus,
  getFullMenuHierarchy,
  getSubcategories, 
  getMenuItems,
  getVenueMenuItems,
  getVenueById,
  Table,
  Venue,
  Category,
  Subcategory,
  MenuItem,
  ApiError,
  TableNotFoundError
} from '@/api/menuService';

// Custom error types
export class TableError extends Error {
  constructor(message: string, public tableId: string) {
    super(message);
    this.name = 'TableError';
  }
}

export class VenueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VenueError';
  }
}

export class MenuError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MenuError';
  }
}

// Define an interface for SubSubcategory since it's missing from menuService.ts
// We'll just use Subcategory type for now
type SubSubcategory = Subcategory;

interface QRScannerState {
  isLoading: boolean;
  error: Error | null;
  data: {
    tableData?: {
      table: Table;
      venue: Venue;
    };
    menuData?: {
      categories: Category[];
      subcategories: { [categoryId: string]: Subcategory[] };
      subsubcategories: { [subcategoryId: string]: SubSubcategory[] };
      menuItems: MenuItem[];
    };
    categoryData?: {
      subcategories: Subcategory[];
      menuItems: MenuItem[];
    };
    subcategoryData?: {
      subsubcategories: SubSubcategory[];
      menuItems: MenuItem[];
    };
    subsubcategoryData?: {
      menuItems: MenuItem[];
    };
    currentCategory?: {
      id: string;
      name: string;
    };
    currentSubcategory?: {
      id: string;
      name: string;
    };
    currentSubSubcategory?: {
      id: string;
      name: string;
    };
  };
}

export const useQRScanner = () => {
  const [state, setState] = useState<QRScannerState>({
    isLoading: false,
    error: null,
    data: {}
  });

  const handleScan = useCallback(async (tableId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      // First verify table status
      const tableStatus = await verifyTableStatus(tableId);
      if (!tableStatus.exists || !tableStatus.isAvailable || !tableStatus.venue) {
        throw new TableError(
          !tableStatus.exists ? 'Table not found' : 
          !tableStatus.isAvailable ? 'Table is not available' :
          'Venue information not found',
          tableId
        );
      }

      // Get the full menu hierarchy for the venue
      const menuHierarchy = await getFullMenuHierarchy(tableStatus.venue._id);
      const table = await getTableById(tableId);

      setState(prev => ({
        ...prev,
        isLoading: false,
        data: {
          ...prev.data,
          tableData: {
            table,
            venue: tableStatus.venue
          },
          menuData: menuHierarchy
        }
      }));
      
      return {
        table: { id: tableId, venue: tableStatus.venue },
        menuHierarchy
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process QR code';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: new Error(errorMessage)
      }));
      throw error;
    }
  }, []);
  
  const selectCategory = useCallback(async (categoryId: string, categoryName: string) => {
    if (!state.data.tableData?.venue) return;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const venue = state.data.tableData.venue;
      const restaurantId = typeof venue.restaurantId === 'string' ? 
        venue.restaurantId : 
        venue.restaurantId._id;

      const subcategories = await getSubcategories(categoryId);
      const menuItems = await getMenuItems(categoryId);

      setState(prev => ({
        ...prev,
        isLoading: false,
        data: {
          ...prev.data,
          currentCategory: { id: categoryId, name: categoryName },
          currentSubcategory: undefined,
          currentSubSubcategory: undefined,
          categoryData: {
            subcategories,
            menuItems
          }
        }
      }));

      return { categoryId, categoryName, subcategories, menuItems };
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: new Error('Failed to load category')
      }));
      throw error;
    }
  }, [state.data.tableData]);

  const selectSubcategory = useCallback(async (subcategoryId: string, subcategoryName: string) => {
    if (!state.data.tableData?.venue || !state.data.currentCategory) return;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const menuItems = await getMenuItems(undefined, subcategoryId);
      // For subsubcategories, we'll just use an empty array since we don't have that endpoint
      const subsubcategories: SubSubcategory[] = [];

      setState(prev => ({
        ...prev,
        isLoading: false,
        data: {
          ...prev.data,
          currentSubcategory: { id: subcategoryId, name: subcategoryName },
          currentSubSubcategory: undefined,
          subcategoryData: {
            subsubcategories,
            menuItems
          }
        }
      }));

      return { subcategoryId, subcategoryName, subsubcategories, menuItems };
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: new Error('Failed to load subcategory')
      }));
      throw error;
    }
  }, [state.data.tableData, state.data.currentCategory]);

  const selectSubSubcategory = useCallback(async (subsubcategoryId: string, subsubcategoryName: string) => {
    if (!state.data.tableData?.venue || !state.data.currentCategory || !state.data.currentSubcategory) return;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      // Since we don't have a specific API for this, we'll just use the menu items API
      // In a real implementation, you'd add a specific parameter for subsubcategory
      const menuItems = await getMenuItems();

      setState(prev => ({
        ...prev,
        isLoading: false,
        data: {
          ...prev.data,
          currentSubSubcategory: { id: subsubcategoryId, name: subsubcategoryName },
          subsubcategoryData: {
            menuItems
          }
        }
      }));

      return { subsubcategoryId, subsubcategoryName, menuItems };
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: new Error('Failed to load subsubcategory')
      }));
      throw error;
    }
  }, [state.data.tableData, state.data.currentCategory, state.data.currentSubcategory]);

  const resetError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const resetState = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      data: {}
    });
  }, []);

  return {
    ...state,
    handleScan,
    selectCategory,
    selectSubcategory,
    selectSubSubcategory,
    resetError,
    resetState
  };
};
