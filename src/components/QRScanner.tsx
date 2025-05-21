import { useState, useCallback } from 'react';
import { useQRScanner, TableError } from '@/hooks/useQRScanner';
import { useCart } from '@/context/CartContext';
import { MenuItem } from '@/api/menuService';
import { ChevronRightIcon, ArrowLeftIcon, QrCodeIcon, SearchIcon, Loader2Icon, AlertTriangleIcon } from 'lucide-react';

interface QRScannerProps {
  onScanComplete?: (tableId: string) => void;
}

// Breadcrumb component for navigation
const Breadcrumb: React.FC<{
  category?: { id: string; name: string };
  subcategory?: { id: string; name: string };
  subsubcategory?: { id: string; name: string };
  onNavigate: (level: 'category' | 'subcategory' | 'subsubcategory' | null) => void;
}> = ({ category, subcategory, subsubcategory, onNavigate }) => (
  <nav className="flex items-center space-x-2 text-sm text-gray-500 overflow-x-auto py-2">
    <button 
      onClick={() => onNavigate(null)}
      className="hover:text-gray-700 flex-shrink-0"
    >
      Menu
    </button>
    {category && (
      <>
        <ChevronRightIcon className="h-4 w-4 flex-shrink-0" />
        <button 
          onClick={() => onNavigate('category')}
          className="hover:text-gray-700 flex-shrink-0"
        >
          {category.name}
        </button>
      </>
    )}
    {subcategory && (
      <>
        <ChevronRightIcon className="h-4 w-4 flex-shrink-0" />
        <button 
          onClick={() => onNavigate('subcategory')}
          className="hover:text-gray-700 flex-shrink-0"
        >
          {subcategory.name}
        </button>
      </>
    )}
    {subsubcategory && (
      <>
        <ChevronRightIcon className="h-4 w-4 flex-shrink-0" />
        <button 
          onClick={() => onNavigate('subsubcategory')}
          className="hover:text-gray-700 flex-shrink-0"
        >
          {subsubcategory.name}
        </button>
      </>
    )}
  </nav>
);

// Alert component for errors and warnings
const Alert: React.FC<{
  type: 'error' | 'warning' | 'info';
  message: string;
  onDismiss?: () => void;
}> = ({ type, message, onDismiss }) => {
  const bgColor = 
    type === 'error' ? 'bg-red-100' : 
    type === 'warning' ? 'bg-yellow-100' : 
    'bg-blue-100';
  
  const textColor = 
    type === 'error' ? 'text-red-800' : 
    type === 'warning' ? 'text-yellow-800' : 
    'text-blue-800';

  return (
    <div className={`rounded-lg p-4 ${bgColor} my-4`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangleIcon className={`h-5 w-5 ${textColor}`} />
        </div>
        <div className="ml-3">
          <p className={`text-sm font-medium ${textColor}`}>{message}</p>
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <button
              onClick={onDismiss}
              className={`inline-flex rounded-md p-1.5 ${textColor} hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2`}
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Menu Item Card component
const MenuItemCard: React.FC<{
  item: MenuItem;
}> = ({ item }) => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden">
    {item.image && (
      <div className="w-full h-48 overflow-hidden">
        <img 
          src={item.image} 
          alt={item.name} 
          className="w-full h-full object-cover"
          onError={(e) => {
            // Replace with placeholder on error
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=No+Image';
          }}
        />
      </div>
    )}
    <div className="p-4">
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
        <span className="text-lg font-bold text-green-600">${item.price.toFixed(2)}</span>
      </div>
      <p className="mt-2 text-sm text-gray-600">{item.description}</p>
      
      {/* Preparation time */}
      {item.preparationTime && (
        <div className="mt-2 text-xs text-gray-500">
          Preparation time: {item.preparationTime} min
        </div>
      )}
      
      {/* Allergens */}
      {item.allergens && item.allergens.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-medium text-gray-500">Allergens:</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {item.allergens.map((allergen) => (
              <span 
                key={allergen} 
                className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full"
              >
                {allergen}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Available status */}
      <div className="mt-3 flex items-center">
        <span 
          className={`inline-block w-3 h-3 rounded-full mr-2 ${
            item.isAvailable ? 'bg-green-500' : 'bg-red-500'
          }`}
        ></span>
        <span className="text-sm text-gray-600">
          {item.isAvailable ? 'Available' : 'Unavailable'}
        </span>
      </div>
    </div>
  </div>
);

export const QRScanner: React.FC<QRScannerProps> = ({ onScanComplete }) => {
  const { 
    isLoading, 
    error, 
    data, 
    handleScan, 
    selectCategory, 
    selectSubcategory, 
    selectSubSubcategory,
    resetError,
    resetState
  } = useQRScanner();
  
  const [tableId, setTableId] = useState('');
  const { clearCart } = useCart();

  // Reset scanner and clear cart
  const resetScanner = useCallback(() => {
    clearCart();
    resetState();
    setTableId('');
  }, [clearCart, resetState]);

  // Handle form submission for manual table ID input
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableId.trim()) return;

    // Clear the cart before scanning new table
    clearCart();
    
    try {
      await handleScan(tableId.trim());
      if (onScanComplete) {
        onScanComplete(tableId.trim());
      }
    } catch (error) {
      console.error('Error in form submission:', error);
      // Error will be handled by the useQRScanner hook
    }
  };

  // Navigation handler for breadcrumb
  const handleNavigation = async (level: 'category' | 'subcategory' | 'subsubcategory' | null) => {
    if (!data.tableData?.venue) return;

    if (level === null) {
      // Reset to top level (categories)
      if (data.tableData?.table) {
        // Clear cart when navigating back to top level with table scan
        resetScanner();
        await handleScan(data.tableData.table._id);
      }
      return;
    }

    if (level === 'category' && data.currentCategory) {
      // Navigate to category level
      await selectCategory(data.currentCategory.id, data.currentCategory.name);
      return;
    }

    if (level === 'subcategory' && data.currentSubcategory) {
      // Navigate to subcategory level
      await selectSubcategory(data.currentSubcategory.id, data.currentSubcategory.name);
      return;
    }

    // No need to handle 'subsubcategory' as it's already the deepest level
  };

  // Helper to get items to display based on current navigation level
  const getItemsToDisplay = (): MenuItem[] => {
    if (!data.menuData) return [];
    
    // If we're at subsubcategory level, show those items
    if (data.currentSubSubcategory && data.subsubcategoryData) {
      return data.subsubcategoryData.menuItems;
    }
    
    // If we're at subcategory level, show those items
    if (data.currentSubcategory && data.subcategoryData) {
      return data.subcategoryData.menuItems;
    }
    
    // If we're at category level, show those items
    if (data.currentCategory && data.categoryData) {
      return data.categoryData.menuItems;
    }
    
    // Otherwise show venue menu items
    return data.menuData.menuItems || [];
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">In-Seat Menu</h1>
      
      {/* Table Scanning Section */}
      {!data.tableData && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Scan Table QR Code</h2>
          
          {/* QR Code Scanner (Placeholder) */}
          <div className="mb-4 p-6 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center">
            <QrCodeIcon className="h-16 w-16 text-gray-400 mb-2" />
            <p className="text-gray-500 text-center">
              Camera access not available. Please enter your table ID manually.
            </p>
          </div>
          
          {/* Manual Input Form */}
          <form onSubmit={handleSubmit} className="mb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <SearchIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Enter table ID"
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !tableId.trim()}
                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2Icon className="h-5 w-5 animate-spin mr-2" />
                ) : null}
                {isLoading ? 'Loading...' : 'Submit'}
              </button>
            </div>
          </form>
          
          {/* Error Display */}
          {error && (
            <Alert 
              type="error" 
              message={error.message}
              onDismiss={resetError}
            />
          )}
        </div>
      )}
      
      {/* Menu Display Section */}
      {data.tableData && (
        <div className="bg-white rounded-lg shadow p-6">
          {/* Venue Information */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {data.tableData.venue.name}
            </h2>
            <p className="text-gray-600 mt-1">
              Table: {data.tableData.table.number}
            </p>
            {data.tableData.venue.description && (
              <p className="text-sm text-gray-500 mt-2">
                {data.tableData.venue.description}
              </p>
            )}
          </div>
          
          {/* Breadcrumb Navigation */}
          <Breadcrumb 
            category={data.currentCategory}
            subcategory={data.currentSubcategory}
            subsubcategory={data.currentSubSubcategory}
            onNavigate={handleNavigation}
          />
          
          {/* Loading State */}
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center">
              <Loader2Icon className="h-8 w-8 text-indigo-500 animate-spin mb-4" />
              <p className="text-gray-500">Loading menu...</p>
            </div>
          )}
          
          {!isLoading && (
            <>
              {/* Categories List (Top Level) */}
              {data.menuData && !data.currentCategory && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Categories</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.menuData.categories.map((category) => (
                      <button
                        key={category._id}
                        onClick={() => selectCategory(category._id, category.name)}
                        className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 text-left"
                      >
                        <div className="flex items-center">
                          {category.image && (
                            <div className="flex-shrink-0 h-10 w-10 mr-3">
                              <img
                                src={category.image}
                                alt={category.name}
                                className="h-10 w-10 rounded-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40?text=C';
                                }}
                              />
                            </div>
                          )}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{category.name}</h4>
                            {category.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{category.description}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Subcategories (When Category is Selected) */}
              {data.categoryData?.subcategories && data.categoryData.subcategories.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {data.currentCategory?.name} - Subcategories
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.categoryData.subcategories.map((subcategory) => (
                      <button
                        key={subcategory._id}
                        onClick={() => selectSubcategory(subcategory._id, subcategory.name)}
                        className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 text-left"
                      >
                        <h4 className="text-sm font-medium text-gray-900">{subcategory.name}</h4>
                        {subcategory.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{subcategory.description}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Subsubcategories (When Subcategory is Selected) */}
              {data.subcategoryData?.subsubcategories && data.subcategoryData.subsubcategories.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {data.currentSubcategory?.name} - Options
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.subcategoryData.subsubcategories.map((subsubcategory) => (
                      <button
                        key={subsubcategory._id}
                        onClick={() => selectSubSubcategory(subsubcategory._id, subsubcategory.name)}
                        className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 text-left"
                      >
                        <h4 className="text-sm font-medium text-gray-900">{subsubcategory.name}</h4>
                        {subsubcategory.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{subsubcategory.description}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Menu Items */}
              {getItemsToDisplay().length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {data.currentSubSubcategory?.name || data.currentSubcategory?.name || data.currentCategory?.name || 'All Items'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {getItemsToDisplay().map((item) => (
                      <MenuItemCard key={item._id} item={item} />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Empty State */}
              {getItemsToDisplay().length === 0 && !isLoading && (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <p className="text-gray-500 mb-2">No menu items found.</p>
                  <p className="text-sm text-gray-400">
                    {data.currentSubSubcategory ? 
                      'Try selecting a different subsubcategory' : 
                      data.currentSubcategory ? 
                        'Try selecting a different subcategory' : 
                        data.currentCategory ? 
                          'Try selecting a different category' : 
                          'No items available for this venue'}
                  </p>
                </div>
              )}
              
              {/* Back Navigation */}
              {(data.currentCategory || data.currentSubcategory || data.currentSubSubcategory) && (
                <div className="mt-8">
                  <button
                    onClick={() => handleNavigation(
                      data.currentSubSubcategory ? 'subcategory' : 
                      data.currentSubcategory ? 'category' : null
                    )}
                    className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
                  >
                    <ArrowLeftIcon className="h-4 w-4 mr-1" />
                    Back to {data.currentSubSubcategory ? 'Subcategory' : 
                            data.currentSubcategory ? 'Category' : 'Menu'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
