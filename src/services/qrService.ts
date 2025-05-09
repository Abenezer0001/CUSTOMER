import { 
  verifyTableStatus, 
  getCategories, 
  getVenueMenuItems, 
  getVenueById,
  getSubcategories,
  getSubSubcategories,
  getMenuItems,
  Venue,
  Category,
  MenuItem,
  Subcategory,
  SubSubcategory
} from '@/api/menuService';

// Custom error types
export class TableError extends Error {
  constructor(message: string, public tableId: string) {
    super(message);
    this.name = 'TableError';
  }
}

export class VenueError extends Error {
  constructor(message: string, public venueId: string) {
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

// Response interfaces
export interface QRScanResponse {
  table: {
    id: string;
    status: {
      exists: boolean;
      isAvailable: boolean;
      venue?: Venue;
    }
  };
  venue: Venue;
  menu: {
    categories: Category[];
    items: MenuItem[];
  }
}

export interface CategorySelectionResponse {
  subcategories: Subcategory[];
  menuItems: MenuItem[];
  category: {
    id: string;
    name: string;
  };
}

export interface SubcategorySelectionResponse {
  subsubcategories: SubSubcategory[];
  menuItems: MenuItem[];
  subcategory: {
    id: string;
    name: string;
  };
}

export interface SubSubcategorySelectionResponse {
  menuItems: MenuItem[];
  subsubcategory: {
    id: string;
    name: string;
  };
}

// Validation functions
const validateMenuData = (categories: Category[], items: MenuItem[]): boolean => {
  return Array.isArray(categories) && Array.isArray(items) && 
    categories.length > 0;
};

const validateCategoryData = (subcategories: Subcategory[], menuItems: MenuItem[]): boolean => {
  return Array.isArray(subcategories) && Array.isArray(menuItems);
};

const validateSubcategoryData = (subsubcategories: SubSubcategory[], menuItems: MenuItem[]): boolean => {
  return Array.isArray(subsubcategories) && Array.isArray(menuItems);
};

/**
 * Handles a table QR code scan and loads the venue-specific menu
 * @param tableId The ID of the table from the QR code
 * @returns Table, venue and menu information
 */
export const handleTableQRScan = async (tableId: string): Promise<QRScanResponse> => {
  try {
    // Step 1: Verify table and get venue info with retry logic
    let retries = 3;
    let tableStatus;
    
    while (retries > 0) {
      tableStatus = await verifyTableStatus(tableId);
      if (tableStatus.exists) break;
      retries--;
      if (retries > 0) await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!tableStatus?.exists || !tableStatus?.isAvailable) {
      throw new TableError('Table not found or not available', tableId);
    }

    // Get venue info from table status
    const venue = tableStatus.venue;
    if (!venue) {
      throw new VenueError('Venue information not found for table', tableId);
    }

    // Step 2: Fetch menu data
    const [categories, menuItems] = await Promise.all([
      getCategories(venue.restaurantId),
      getVenueMenuItems(venue._id)
    ]);

    if (!validateMenuData(categories, menuItems)) {
      throw new MenuError('Invalid menu data received from server');
    }

    // Step 3: Structure the response
    return {
      table: {
        id: tableId,
        status: tableStatus
      },
      venue,
      menu: {
        categories,
        items: menuItems
      }
    };
  } catch (error) {
    console.error('Error handling QR code scan:', error);
    if (error instanceof TableError || error instanceof VenueError || error instanceof MenuError) {
      throw error;
    }
    throw new Error('Failed to process QR code scan');
  }
};

/**
 * Handles category selection and loads subcategories and menu items
 * @param categoryId The ID of the selected category
 * @param venueId The venue ID
 * @param categoryName Optional category name
 * @returns Subcategories and menu items for the selected category
 */
export const handleCategorySelection = async (
  categoryId: string, 
  venueId: string,
  categoryName?: string
): Promise<CategorySelectionResponse> => {
  try {
    const venue = await getVenueById(venueId);
    if (!venue) {
      throw new VenueError('Venue not found', venueId);
    }

    const [subcategories, menuItems] = await Promise.all([
      getSubcategories(categoryId, venue.restaurantId),
      getMenuItems(venue.restaurantId, categoryId, undefined, undefined, venueId)
    ]);

    if (!validateCategoryData(subcategories, menuItems)) {
      throw new MenuError('Invalid category data received from server');
    }

    return {
      subcategories,
      menuItems,
      category: {
        id: categoryId,
        name: categoryName || subcategories[0]?.categoryId || categoryId
      }
    };
  } catch (error) {
    console.error('Error handling category selection:', error);
    if (error instanceof VenueError || error instanceof MenuError) {
      throw error;
    }
    throw new Error(`Failed to process category selection for category ${categoryId}`);
  }
};

/**
 * Handles subcategory selection and loads subsubcategories and menu items
 * @param subcategoryId The ID of the selected subcategory
 * @param venueId The venue ID
 * @param subcategoryName Optional subcategory name
 * @returns Subsubcategories and menu items for the selected subcategory
 */
export const handleSubcategorySelection = async (
  subcategoryId: string, 
  venueId: string,
  subcategoryName?: string
): Promise<SubcategorySelectionResponse> => {
  try {
    const venue = await getVenueById(venueId);
    if (!venue) {
      throw new VenueError('Venue not found', venueId);
    }

    const [subsubcategories, menuItems] = await Promise.all([
      getSubSubcategories(subcategoryId, venue.restaurantId),
      getMenuItems(venue.restaurantId, undefined, subcategoryId, undefined, venueId)
    ]);

    if (!validateSubcategoryData(subsubcategories, menuItems)) {
      throw new MenuError('Invalid subcategory data received from server');
    }

    return {
      subsubcategories,
      menuItems,
      subcategory: {
        id: subcategoryId,
        name: subcategoryName || subcategoryId
      }
    };
  } catch (error) {
    console.error('Error handling subcategory selection:', error);
    if (error instanceof VenueError || error instanceof MenuError) {
      throw error;
    }
    throw new Error(`Failed to process subcategory selection for subcategory ${subcategoryId}`);
  }
};

/**
 * Handles subsubcategory selection and loads menu items
 * @param subsubcategoryId The ID of the selected subsubcategory
 * @param venueId The venue ID
 * @param subsubcategoryName Optional subsubcategory name
 * @returns Menu items for the selected subsubcategory
 */
export const handleSubSubcategorySelection = async (
  subsubcategoryId: string, 
  venueId: string,
  subsubcategoryName?: string
): Promise<SubSubcategorySelectionResponse> => {
  try {
    const venue = await getVenueById(venueId);
    if (!venue) {
      throw new VenueError('Venue not found', venueId);
    }

    const menuItems = await getMenuItems(
      venue.restaurantId, 
      undefined, 
      undefined, 
      subsubcategoryId, 
      venueId
    );

    if (!Array.isArray(menuItems)) {
      throw new MenuError('Invalid menu items data received from server');
    }

    return {
      menuItems,
      subsubcategory: {
        id: subsubcategoryId,
        name: subsubcategoryName || subsubcategoryId
      }
    };
  } catch (error) {
    console.error('Error handling subsubcategory selection:', error);
    if (error instanceof VenueError || error instanceof MenuError) {
      throw error;
    }
    throw new Error(`Failed to process subsubcategory selection for subsubcategory ${subsubcategoryId}`);
  }
};

