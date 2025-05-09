# INSEAT Menu System Integration Documentation

## 1. Overview

This documentation outlines the integration between INSEAT-Backend and inseat-menu to create a table-specific menu viewing system. When users scan a QR code associated with a table, they should be directed to a menu page showing the menu items available at that venue.

## 2. System Architecture

### Backend Structure (INSEAT-Backend)

The INSEAT-Backend application follows a modular architecture with services:

```
/home/abenezer/Desktop/work/INSEAT-Backend/
├── services/
│   ├── restaurant-service/
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   │   ├── TableController.ts     # Table controller that needs to be updated
│   │   │   ├── routes/
│   │   │   │   ├── table.routes.ts        # Table routes that need to be updated
│   │   │   ├── models/
│   │   │   │   ├── Table.ts               # Table model
│   │   │   │   ├── Venue.ts               # Venue model
│   │   │   │   ├── Category.ts            # Category model
│   │   │   │   └── MenuItem.ts            # Menu item model
```

### Frontend Structure (inseat-menu)

The inseat-menu application is a React-based frontend:

```
/home/abenezer/Desktop/work/inseat-menu/
├── src/
│   ├── api/
│   │   └── menuService.ts          # API integration service (exists, needs updates)
│   ├── components/
│   │   ├── QRScanner.tsx           # QR code scanner component (exists)
│   │   ├── menu/
│   │   │   ├── MenuGrid.tsx        # Grid for menu items (exists)
│   │   │   └── MenuItemCard.tsx    # Individual menu item display (exists)
│   ├── hooks/
│   │   └── useQRScanner.ts         # QR scanner hook (exists)
│   ├── pages/
│   │   ├── Menu.tsx                # Menu display page (exists, needs updates)
│   │   └── ScanTable.tsx           # QR scanning page (to be created)
│   └── App.tsx                     # Main application component with routing (exists, needs updates)
```

## 3. Required Backend Endpoints

### 1. Table Verification Endpoint (TO BE IMPLEMENTED)

**Purpose**: Verify if a table exists and is available for use.

**Endpoint**:
```
GET /api/tables/{tableId}/verify
```

**Example Response (Success)**:
```json
{
  "exists": true,
  "isAvailable": true,
  "venue": {
    "_id": "67f6056fc5f5d349242273c6",
    "name": "Screen 2",
    "description": "Screen 2 at CINEMA CITY ARABIAN CENTRE",
    "capacity": 88,
    "restaurantId": {
      "_id": "67f6056fc5f5d349242273c2",
      "name": "CINEMA CITY ARABIAN CENTRE"
    }
  },
  "table": {
    "_id": "67f60565c5f5d349242273a2",
    "number": "T123",
    "venueId": "67f6056fc5f5d349242273c6",
    "capacity": 4,
    "isOccupied": false,
    "isActive": true
  }
}
```

**Example Response (Table Not Found)**:
```json
{
  "exists": false,
  "isAvailable": false,
  "error": "Table not found"
}
```

### 2. Table Menu Endpoint (TO BE IMPLEMENTED)

**Purpose**: Get the complete menu hierarchy for a table's venue.

**Endpoint**:
```
GET /api/tables/{tableId}/menu
```

**Example Response**:
```json
{
  "venue": {
    "_id": "67f6056fc5f5d349242273c6",
    "name": "Screen 2",
    "description": "Screen 2 at CINEMA CITY ARABIAN CENTRE"
  },
  "menu": {
    "categories": [
      {
        "_id": "681390684d05b2857e931219",
        "name": "FOOD",
        "description": "FOOD category",
        "image": "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg",
        "isActive": true,
        "order": 1
      }
    ],
    "subcategories": {
      "681390684d05b2857e931219": [
        {
          "_id": "6813906a4d05b2857e931230",
          "name": "NOODLES",
          "description": "NOODLES subcategory",
          "image": "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg",
          "isActive": true,
          "order": 0
        }
      ]
    },
    "menuItems": [
      {
        "_id": "67f7bff6fc06b1668c789281",
        "name": "Main Menu",
        "description": "Our primary selection of dishes.",
        "price": 12.99,
        "image": "image_url",
        "categories": [
          {
            "_id": "681390684d05b2857e931219",
            "name": "FOOD"
          }
        ],
        "subCategories": [
          {
            "_id": "6813906a4d05b2857e931230",
            "name": "NOODLES"
          }
        ],
        "isAvailable": true,
        "isActive": true
      }
    ]
  }
}
```

## 4. Backend Implementation Details

### 1. Table Verification Endpoint Implementation

Update `/home/abenezer/Desktop/work/INSEAT-Backend/services/restaurant-service/src/controllers/TableController.ts`:

```typescript
// Add this method to the TableController class
public async verifyTable(req: Request, res: Response): Promise<void> {
  try {
    const { tableId } = req.params;
    
    console.log(`Verifying table with ID: ${tableId}`);
    
    // Find table by ID
    const table = await Table.findById(tableId);
    
    if (!table) {
      return res.json({
        exists: false,
        isAvailable: false,
        error: "Table not found"
      });
    }
    
    // Find venue
    const venue = await Venue.findById(table.venueId).populate('restaurantId', 'name');
    
    if (!venue) {
      return res.json({
        exists: true,
        isAvailable: false,
        error: "Venue not found"
      });
    }
    
    const isAvailable = table.isActive && !table.isOccupied;
    
    return res.json({
      exists: true,
      isAvailable,
      venue,
      table
    });
  } catch (error) {
    console.error('Error verifying table:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({
      error: true,
      message: "Server error while verifying table",
      details: errorMessage
    });
  }
}
```

### 2. Table Menu Endpoint Implementation

Add to `/home/abenezer/Desktop/work/INSEAT-Backend/services/restaurant-service/src/controllers/TableController.ts`:

```typescript
// Add this method to the TableController class
public async getTableMenu(req: Request, res: Response): Promise<void> {
  try {
    const { tableId } = req.params;
    
    console.log(`Getting menu for table with ID: ${tableId}`);
    
    // Find table by ID
    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(404).json({
        error: true,
        message: "Table not found"
      });
    }
    
    // Find venue
    const venue = await Venue.findById(table.venueId);
    if (!venue) {
      return res.status(404).json({
        error: true,
        message: "Venue not found"
      });
    }
    
    // Get restaurant ID
    const restaurantId = venue.restaurantId;
    
    // Get categories for this venue
    const categories = await Category.find({
      restaurantId,
      isActive: true
    }).sort({ order: 1 });
    
    // Get subcategories organized by category
    const subcategoriesMap = {};
    for (const category of categories) {
      const subcategories = await Subcategory.find({
        categoryId: category._id,
        isActive: true
      }).sort({ order: 1 });
      
      subcategoriesMap[category._id] = subcategories;
    }
    
    // Get menu items for this venue
    const menuItems = await MenuItem.find({
      venueId: venue._id,
      isActive: true
    });
    
    return res.json({
      venue: {
        _id: venue._id,
        name: venue.name,
        description: venue.description
      },
      menu: {
        categories,
        subcategories: subcategoriesMap,
        menuItems
      }
    });
  } catch (error) {
    console.error('Error fetching table menu:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({
      error: true,
      message: "Server error while fetching table menu",
      details: errorMessage
    });
  }
}
```

### 3. Update Table Routes

Update `/home/abenezer/Desktop/work/INSEAT-Backend/services/restaurant-service/src/routes/table.routes.ts`:

```typescript
// Add these routes to the router
router.route('/tables/:tableId/verify')
  .get(validateIds, controller.verifyTable.bind(controller));

router.route('/tables/:tableId/menu')
  .get(validateIds, controller.getTableMenu.bind(controller));
```

## 5. Frontend Implementation Details

### 1. Create ScanTable.tsx

Create a new file at `/home/abenezer/Desktop/work/inseat-menu/src/pages/ScanTable.tsx`:

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrReader } from 'react-qr-reader';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { verifyTableStatus } from '@/api/menuService';
import { Loader2 } from 'lucide-react';

export const ScanTable: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const handleScan = async (result: string | null) => {
    if (result && !loading) {
      setLoading(true);
      setError(null);
      
      try {
        const tableId = result; // In real implementation, parse QR code content
        const verification = await verifyTableStatus(tableId);
        
        if (verification.exists && verification.isAvailable) {
          navigate(`/${tableId}`);
        } else {
          setError(verification.exists ? 
            'This table is currently not available.' : 
            'Invalid table QR code.');
        }
      } catch (err) {
        setError('Failed to verify table. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to INSEAT</CardTitle>
          <CardDescription>
            Scan your table's QR code to view the menu
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {showScanner ? (
            <div className="relative aspect-square w-full">
              <QrReader
                constraints={{ facingMode: 'environment' }}
                onResult={(result) => result && handleScan(result.getText())}
                className="w-full h-full"
              />
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
            </div>
          ) : (
            <Button 
              onClick={() => setShowScanner(true)}
              className="w-full"
            >
              Start Scanning
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScanTable;
```

### 2. Update App.tsx

Update `/home/abenezer/Desktop/work/inseat-menu/src/App.tsx` to add the new routes:

```tsx
// Import the new component
import ScanTable from "./pages/ScanTable";
import { useEffect } from "react";

// Update the Routes in App.tsx
<Routes>
  {/* Add root path to scan QR code - this is the landing page */}
  <Route path="/" element={<ScanTable />} />
  
  {/* Add table-specific route */}
  <Route path="/:tableId" element={<Layout />}>
    <Route index element={<TableMenu />} />
    {/* Other existing routes */}
    <Route path="menu" element={<Menu />} />
    {/* ... */}
  </Route>
</Routes>

// Create a TableMenu component to handle table verification
const TableMenu: React.FC = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkTable = async () => {
      if (!tableId) {
        navigate('/');
        return;
      }
      
      try {
        const verification = await verifyTableStatus(tableId);
        if (!verification.exists || !verification.isAvailable) {
          navigate('/');
        }
      } catch (error) {
        console.error('Error verifying table:', error);
        navigate('/');
      }
    };
    
    checkTable();
  }, [tableId, navigate]);
  
  return <Menu />;
};
```

### 3. Update menu

# INSEAT Menu System Integration Documentation

## 1. Overview

This documentation outlines the integration between INSEAT-Backend and inseat-menu to create a table-specific menu viewing system. This system allows restaurant patrons to scan QR codes on tables to view menus specific to that venue.

## 2. Repository Structure

### Backend Structure (INSEAT-Backend)
```
/home/abenezer/Desktop/work/INSEAT-Backend/
├── src/
│   ├── controllers/
│   │   ├── tableController.ts      # Table-related logic
│   │   ├── menuController.ts       # Menu-related logic
│   │   └── categoryController.ts   # Category-related logic
│   ├── routes/
│   │   ├── tableRoutes.ts          # Table API endpoints
│   │   ├── menuRoutes.ts           # Menu API endpoints
│   │   └── categoryRoutes.ts       # Category API endpoints
│   ├── models/
│   │   ├── Table.ts                # Table data model
│   │   ├── Menu.ts                 # Menu data model
│   │   ├── Category.ts             # Category data model
│   │   └── MenuItem.ts             # Menu item data model
│   └── app.ts                      # Express app setup
```

### Frontend Structure (inseat-menu)
```
/home/abenezer/Desktop/work/inseat-menu/
├── src/
│   ├── api/
│   │   └── menuService.ts          # API integration service
│   ├── components/
│   │   ├── QRScanner.tsx           # QR code scanner component (exists)
│   │   ├── menu/
│   │   │   ├── MenuGrid.tsx        # Grid for menu items (exists)
│   │   │   └── MenuItemCard.tsx    # Individual menu item display
│   ├── context/
│   │   └── TableContext.tsx        # Table context for state management
│   ├── hooks/
│   │   └── useQRScanner.ts         # QR scanner hook (exists)
│   ├── pages/
│   │   ├── Menu.tsx                # Menu display page (exists)
│   │   └── ScanTable.tsx           # QR scanning page (to be created)
│   └── App.tsx                     # Main application component with routing
```

## 3. Backend API Endpoints

### Table Verification Endpoint (NEEDS IMPLEMENTATION)

**Purpose**: Verifies if a table exists and is available for use.

**Endpoint**: 
```
GET /api/tables/{tableId}/verify
```

**Request**: None

**Example Response (Success)**:
```json
{
  "exists": true,
  "isAvailable": true,
  "venue": {
    "_id": "67f6056fc5f5d349242273c6",
    "name": "Screen 2",
    "description": "Screen 2 at CINEMA CITY ARABIAN CENTRE",
    "capacity": 88,
    "restaurantId": {
      "_id": "67f6056fc5f5d349242273c2",
      "name": "CINEMA CITY ARABIAN CENTRE"
    }
  },
  "table": {
    "_id": "67f60565c5f5d349242273a2",
    "number": "T123",
    "venueId": "67f6056fc5f5d349242273c6",
    "capacity": 4,
    "isOccupied": false,
    "isActive": true
  }
}
```

**Example Response (Table Not Found)**:
```json
{
  "exists": false,
  "isAvailable": false,
  "error": "Table not found"
}
```

**Implementation Path**: `/home/abenezer/Desktop/work/INSEAT-Backend/src/controllers/tableController.ts`

```typescript
export const verifyTable = async (req: Request, res: Response) => {
  try {
    const { tableId } = req.params;
    
    // Find table by ID
    const table = await Table.findById(tableId);
    
    if (!table) {
      return res.json({
        exists: false,
        isAvailable: false,
        error: "Table not found"
      });
    }
    
    // Find venue
    const venue = await Venue.findById(table.venueId).populate('restaurantId', 'name');
    
    if (!venue) {
      return res.json({
        exists: true,
        isAvailable: false,
        error: "Venue not found"
      });
    }
    
    const isAvailable = table.isActive && !table.isOccupied;
    
    return res.json({
      exists: true,
      isAvailable,
      venue,
      table
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Server error while verifying table",
      details: error.message
    });
  }
};
```

### Table Menu Endpoint (NEEDS IMPLEMENTATION)

**Purpose**: Retrieves the complete menu hierarchy for a table's venue.

**Endpoint**: 
```
GET /api/tables/{tableId}/menu
```

**Request**: None

**Example Response**:
```json
{
  "venue": {
    "_id": "67f6056fc5f5d349242273c6",
    "name": "Screen 2",
    "description": "Screen 2 at CINEMA CITY ARABIAN CENTRE"
  },
  "menu": {
    "categories": [
      {
        "_id": "681390684d05b2857e931219",
        "name": "FOOD",
        "description": "FOOD category",
        "image": "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg",
        "isActive": true,
        "order": 1
      }
    ],
    "subcategories": {
      "681390684d05b2857e931219": [
        {
          "_id": "6813906a4d05b2857e931230",
          "name": "NOODLES",
          "description": "NOODLES subcategory",
          "image": "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg",
          "isActive": true,
          "order": 0
        }
      ]
    },
    "menuItems": [
      {
        "_id": "67f7bff6fc06b1668c789281",
        "name": "Main Menu",
        "description": "Our primary selection of dishes.",
        "price": 12.99,
        "image": "image_url",
        "categories": [
          {
            "_id": "681390684d05b2857e931219",
            "name": "FOOD"
          }
        ],
        "subCategories": [
          {
            "_id": "6813906a4d05b2857e931230",
            "name": "NOODLES"
          }
        ],
        "isAvailable": true,
        "isActive": true
      }
    ]
  }
}
```

**Implementation Path**: `/home/abenezer/Desktop/work/INSEAT-Backend/src/controllers/tableController.ts`

```typescript
export const getTableMenu = async (req: Request, res: Response) => {
  try {
    const { tableId } = req.params;
    
    // Find table by ID
    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(404).json({
        error: true,
        message: "Table not found"
      });
    }
    
    // Find venue
    const venue = await Venue.findById(table.venueId);
    if (!venue) {
      return res.status(404).json({
        error: true,
        message: "Venue not found"
      });
    }
    
    // Get categories for this venue
    const categories = await Category.find({
      restaurantId: venue.restaurantId,
      isActive: true
    }).sort({ order: 1 });
    
    // Get subcategories organized by category
    const subcategoriesMap = {};
    for (const category of categories) {
      const subcategories = await Subcategory.find({
        categoryId: category._id,
        isActive: true
      }).sort({ order: 1 });
      
      subcategoriesMap[category._id] = subcategories;
    }
    
    // Get menu items for this venue
    const menuItems = await MenuItem.find({
      venueId: venue._id,
      isActive: true
    });
    
    return res.json({
      venue: {
        _id: venue._id,
        name: venue.name,
        description: venue.description
      },
      menu: {
        categories,
        subcategories: subcategoriesMap,
        menuItems
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Server error while fetching table menu",
      details: error.message
    });
  }
};
```

### Category and Subcategory Endpoints (EXISTING)

**Category Endpoint**:
```
GET /api/categories
```

**Example Call**:
```bash
curl -s http://localhost:3001/api/categories
```

**Subcategory Endpoint**:
```
GET /api/subcategories?categoryId=<category-id>
```

**Example Call**:
```bash
curl -s "http://localhost:3001/api/subcategories?categoryId=681390684d05b2857e931219"
```

## 4. Frontend Implementation

### API Service Integration (src/api/menuService.ts)

**Add these functions to `/home/abenezer/Desktop/work/inseat-menu/src/api/menuService.ts`**:

```typescript
// This function is already implemented
export const verifyTableStatus = async (tableId: string): Promise<{
  exists: boolean;
  isAvailable: boolean;
  venue?: Venue;
  table?: Table;
}> => {
  try {
    let table;
    try {
      table = await getTableById(tableId);
    } catch (err) {
      if (err instanceof TableNotFoundError) {
        return { exists: false, isAvailable: false };
      }
      throw err;
    }
    
    let venue;
    try {
      venue = await getVenueById(table.venueId);
    } catch (err) {
      if (err instanceof VenueNotFoundError) {
        return { exists: true, isAvailable: false };
      }
      throw err;
    }

    const isAvailable = table.isActive && !table.isOccupied;
    
    if (!isAvailable) {
      return { exists: true, isAvailable: false, venue, table };
    }

    return {
      exists: true,
      isAvailable: true,
      venue,
      table
    };
  } catch (error) {
    console.error('Error verifying table status:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(`Failed to verify table status for table ID ${tableId}`, 500);
  }
};

// This function is already implemented
export const getFullMenuHierarchy = async (venueId: string): Promise<{
  categories: Category[];
  subcategories: { [categoryId: string]: Subcategory[] };
  subsubcategories: { [subcategoryId: string]: SubSubcategory[] };
  menuItems: MenuItem[];
}> => {
  try {
    const venue = await getVenueById(venueId);
    if (!venue) throw new Error('Venue not found');

    const restaurantId = typeof venue.restaurantId === 'string' ? 
      venue.restaurantId : 
      venue.restaurantId._id;

    // Get all menu data in parallel
    const [categories, menuItems] = await Promise.all([
      getCategories(restaurantId),
      getVenueMenuItems(venueId)
    ]);

    // Get subcategories for each category
    const subcategoriesPromises = categories.map(category => 
      getSubcategories(category._id, restaurantId)
    );
    const subcategoriesArrays = await Promise.all(subcategoriesPromises);
    
    // Create subcategories map
    const subcategories: { [categoryId: string]: Subcategory[] } = {};
    categories.forEach((category, index) => {
      subcategories[category._id] = subcategoriesArrays[index];
    });

    // Get subsubcategories for each subcategory
    const subsubcategoriesPromises = Object.values(subcategories)
      .flat()
      .map(subcategory => getSubSubcategories(subcategory._id, restaurantId));
    const subsubcategoriesArrays = await Promise.all(subsubcategoriesPromises);

    // Create subsubcategories map
    const subsubcategories: { [subcategoryId: string]: SubSubcategory[] } = {};
    Object.values(subcategories).flat().forEach((subcategory, index) => {
      subsubcategories[subcategory._id] = subsubcategoriesArrays[index];
    });

    return {
      categories,
      subcategories,
      subsubcategories,
      menuItems
    };
  } catch (error) {
    console.error('Error fetching full menu hierarchy:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(`Failed to fetch menu hierarchy for venue ID ${venueId}`, 500);
  }
};

// Direct API call to the new backend endpoints (to be added)
export const getTableMenu = async (tableId: string) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/tables/${tableId}/menu`);
    return response.data;
  } catch (error) {
    console.error('Error fetching table menu:', error);
    handleApiError(error, `Failed to fetch menu for table ID ${tableId}`);
  }
};

export const getTableById = async (tableId: string): Promise<Table> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/tables/${tableId}`);
    const data = response.data.data || response.data;
    if (!data) {
      throw new TableNotFoundError(tableId);
    }
    return data;
  } catch (error) {
    console.error('Error fetching table:', error);
    handleApiError(error, `Failed to fetch table with ID ${tableId}`);
  }
};
```

### Create Scan Table Page (src/pages/ScanTable.tsx)

**Create a new file at `/home/abenezer/Desktop/work/inseat-menu/src/pages/ScanTable.tsx`**:

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrReader } from 'react-qr-reader';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { verifyTableStatus } from '@/api/menuService';
import { Loader2 } from 'lucide-react';

export const ScanTable: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const handleScan = async (result: string | null) => {
    if (result && !loading) {
      setLoading(true);
      setError(null);
      
      try {
        const tableId = result; // In real implementation, parse QR code content
        const verification = await verifyTableStatus(tableId);
        
        if (verification.exists && verification.isAvailable) {
          navigate(`/${tableId}`);
        } else {
          setError(verification.exists ? 
            'This table is currently not available.' : 
            'Invalid table QR code.');
        }
      } catch (err) {
        setError('Failed to verify table. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to INSEAT</CardTitle>
          <CardDescription>
            Scan your table's QR code to view the menu
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {showScanner ? (
            <div className="relative aspect-square w-full">
              <QrReader
                constraints={{ facingMode: 'environment' }}
                onResult={(result) => result && handleScan(result.getText())}
                className="w-full h-full"
              />
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
            </div>
          ) : (
            <Button 
              onClick={() => setShowScanner(true)}
              className="w-full"
            >
              Start Scanning
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScanTable;
```

### Update App.tsx with Table Routing

**Modify `/home/abenezer/Desktop/work/inseat-menu/src/App.tsx`**:

```typescript
// Current App.tsx imports (keep existing imports)
import ScanTable from "./pages/ScanTable";
import { useEffect } from "react";

const App = () => {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
          <AuthProvider>
            <TableProvider>
              <OrdersProvider>
                <CartProvider>
                  <FavoritesProvider>
                    <TooltipProvider>
                      <Toaster />
                      <Sonner position="top-right" closeButton />
                      <BrowserRouter>
                        <Routes>
                          {/* Add root path to scan QR code - this is the landing page */}
                          <Route path="/" element={<ScanTable />} />
                          
                          {/* Regular app routes inside Layout */}
                          <Route element={<Layout />}>
                            {/* Add table-specific route that checks the table ID */}
                            <Route path="/:tableId" element={<TableMenuChecker />} />
                            
                            {/* Keep existing routes */}
                            <Route path="/menu" element={<Menu />} />
                            <Route path="/menu/:id" element={<MenuItemDetail />} />
                            <Route path="/category/:categoryId" element={<CategoryDetail />} />
                            <Route path="/my-orders" element={
                              <ProtectedRoute>
                                <MyOrders />
                              </ProtectedRoute>
                            } />
                            <Route path="/call-waiter" element={<CallWaiter />} />
                            <Route path="/bill" element={<Bill />} />
                            <Route path="/checkout" element={
                              <ProtectedRoute>
                                <Checkout />
                              </ProtectedRoute>
                            } />
                            <Route path="/order-confirmation" element={<OrderConfirmation />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/signup" element={<Signup />} />
                            <Route path="/account" element={
                              <ProtectedRoute>
                                <Account />
                              </ProtectedRoute>
                            } />
                            <Route path="*" element={<NotFound />} />
                          </Route>
                        </Routes>
                      </BrowserRouter>
                    </TooltipProvider>
                  </FavoritesProvider>
                </CartProvider>
              </OrdersProvider>
            </TableProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
};

// Create a component to handle table verification and redirection
const TableMenuChecker: React.FC = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkTable = async () => {
      if (!tableId) {
        navigate('/');
        return;
      }
      
      try {
        const verification = await verifyTableStatus(tableId);
        if (!verification.exists || !verification.isAvailable) {
          navigate('/');
        }
      } catch (error) {
        console.error('Error verifying table:', error);
        navigate('/');
      }
    };
    
    checkTable();
  }, [tableId, navigate]);
  
  return <Menu />;
};

export default App;
```

### Update Menu Component to Handle Table-Specific Data

**Modify `/home/abenezer/Desktop/work/inseat-menu/src/pages/Menu.tsx`**:

```typescript
// Add to the imports
import { useParams } from 'react-router-dom';
import { getTableMenu, verifyTableStatus } from '@/api/menuService';
import { useTableInfo } from '@/context/TableContext';

const Menu: React.FC = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const tableInfo = useTableInfo();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Get menu data based on table ID if available
  const { data: menuData, isLoading: menuLoading } = useQuery({
    queryKey: ['tableMenu', tableId],
    queryFn: () => tableId ? getTableMenu(tableId) : null,
    enabled: !!tableId,
  });
  
  // Use the categories from the table-specific menu if available
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories', tableId],
    queryFn: () => {
      if (tableId && menuData) {
        return menuData.menu.categories;
      }
      return api.getCategories();
    },
    placeholderData: defaultCategories,
    enabled: !menuLoading,
  });
  
  // Update table info in context when we have verified table data
  useEffect(() => {
    if (tableId && menuData?.venue) {
      tableInfo.setTableInfo({
        tableNumber: tableId,
        restaurantName: menuData.venue.name,
      });
    }
  }, [tableId, menuData, tableInfo]);

  // Rest of the component remains the same...
  
  return (
    <div className="container mx-auto px-4 py-8 md:py-12 animate-fade-in">
      {/* Show venue info if available */}
      {menuData?.venue && (
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">{menuData.venue.name}</h1>
          {menuData.venue.description && (
            <p className="text-muted-foreground mt-1">{menuData.venue.description}</p>
          )}
        </div>
      )}
      
      <div className="text-center mb-8 md:mb-12">
        <h1 className="text-3xl font-medium mb-4">Our Menu</h1>
        <p className="text-muted-foreground">Discover our exquisite selection of dishes</p>
      </div>
      
      {/* Rest of the component remains the same... */}
    </div>
  );
};

export default Menu;
```

## 5. Testing Instructions

### Backend Testing

1. First, ensure the backend is running:
```bash
cd /home/abenezer/Desktop/work/INSEAT-Backend
npm run dev
```

2. Test table verification endpoint:
```bash
# Test with a valid table ID
curl -s http://localhost:3001/api/tables/67f60565c5f5d349242273a2/verify

# Test with an invalid table ID
curl -s http://localhost:3001/api/tables/invalid_id/verify
```

3. Test table menu endpoint:
```bash
# Test with a valid table ID
curl -s http://localhost:3001/api/tables/67f60565c5f5d349242273a2/menu

# Test with an invalid table ID
curl -s http://localhost:3001/api/tables/invalid_id/menu
```

### Frontend Testing

1. Start the frontend development server:
```bash
cd /home/abenezer/Desktop/work/inseat-menu
npm run dev
```

2. Test the QR scanning flow:
   - Open http://localhost:8080 in a mobile browser
   - Click "Start Scanning"
   - Scan a valid table QR code
   - Verify that you're redirected to the menu page

3. Test direct table access:
   - Visit http://localhost:8080/67f60565c5f5d349242273a2 (replace with valid table ID)
   - Verify that the menu loads correctly
   - Check that categories and subcategories are properly displayed
   - Verify that menu items are filtered correctly when selecting categories

4. Test error scenarios:
   - Try accessing an invalid table ID
   - Test with an inactive table
   - Test with a non-existent venue
   - Verify that appropriate error messages are shown

## 6. Next Steps

1. Deploy the changes:
   - Backend: Deploy updated controllers and routes
   - Frontend: Deploy new ScanTable page and updated Menu components

2. Monitor for issues:
   - Watch for API errors in logs
   - Monitor frontend error boundaries
   - Check performance metrics

3. Gather feedback:
   - Test with real users
   - Monitor user interaction patterns
   - Collect feedback on UI/UX

## 7. Success Criteria

The integration will be considered successful when:
1. Users can scan table QR codes and view the correct menu
2. The menu hierarchy (categories, subcategories) is properly displayed
3. All error cases are properly handled with user-friendly messages
4. The system performs well under load
5. The UI is responsive and works well on mobile devices

Remember to test thoroughly on multiple devices and browsers before deploying to production.

