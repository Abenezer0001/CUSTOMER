import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import TableHeader from '@/components/TableHeader';
import CategoryGrid from '@/components/CategoryGrid';
import SplashScreen from '@/components/SplashScreen';
// import HeroSlider from '@/components/home/HeroSlider';
import { api } from '@/services/api';
import { Category as LocalCategory } from '@/types';
import { Category, Menu, TableVerification } from '@/types/menu';
import { verifyTableStatus } from '@/api/menuService';
import { API_BASE_URL } from '@/constants';

// Interface for formatted category display
interface FormattedCategory {
  id: string;
  _id?: string;
  name: string;
  image?: string;
  subCategories: string[];
  subCategoryCount: number;
  totalSubSubCategoryCount: number;
  isActive?: boolean;
}

const Index: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tableError, setTableError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Extract table ID from query parameters instead of URL path
  const queryParams = new URLSearchParams(location.search);
  const tableId = queryParams.get('table');
  
  // Redirect to scan page if no table ID is present
  useEffect(() => {
    if (!tableId) {
      navigate('/scan');
    }
  }, [tableId, navigate]);

  // Fetch table data
  const { data: tableData, isLoading: isTableLoading } = useQuery({
    queryKey: ['table', tableId],
    queryFn: async () => {
      if (!tableId) throw new Error('No table ID available');
      
      try {
        // Use the existing verifyTableStatus function from menuService
        const tableStatus = await verifyTableStatus(tableId);
        
        if (!tableStatus.exists) {
          const error = new Error('Table not found');
          setTableError(error.message);
          throw error;
        }
        
        return {
          venue: tableStatus.venue,
          table: tableStatus.table
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to verify table';
        setTableError(errorMsg);
        console.error('Table verification failed:', error);
        throw error;
      }
    },
    enabled: !!tableId,
    retry: 1
  });
  
  // Log table data for debugging
  useEffect(() => {
    if (!isTableLoading && tableData) {
      console.log('Table data:', tableData);
    }
  }, [tableId, tableData, isTableLoading]);

  // Fetch menu with populated categories
  const { data: menuData, isLoading: isMenuLoading } = useQuery({
    queryKey: ['menu', tableData?.venue?._id],
    queryFn: async () => {
      if (!tableData?.venue?._id) throw new Error('No venue ID available');
      
      const response = await axios.get<Menu[]>(
        `${API_BASE_URL}/menus?venueId=${tableData.venue._id}&populate=true`
      );
      
      if (!response.data || response.data.length === 0) {
        throw new Error('No menu found for this venue');
      }
      
      return response.data[0]; // Assuming one menu per venue
    },
    enabled: !!tableData?.venue?._id,
    retry: 1,
  });

  // Fetch default categories if no table ID
  const { data: defaultCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const localCategories = await api.getCategories();
      // Convert local categories to match the API format
      return localCategories.map((cat: LocalCategory): Category => ({
        _id: cat.id,
        name: cat.name,
        image: cat.image,
        subCategories: cat.subCategories || [],
      }));
    },
    enabled: !tableId,
  });

  // Format categories with proper structure and counts
  const formattedCategories: FormattedCategory[] = React.useMemo(() => {
    if (tableId && menuData?.categories) {
      return menuData.categories.map(category => {
        // Find subcategories for this category
        const categorySubcategories = menuData.subCategories?.filter(subCat => {
          return (
            category._id === subCat.categoryId || 
            (Array.isArray(category.subCategories) && 
             category.subCategories.includes(subCat._id))
          );
        }) || [];
        
        // Count subsubcategories
        let totalSubSubCategoryCount = 0;
        categorySubcategories.forEach(subCat => {
          if (subCat.subSubCategories && Array.isArray(subCat.subSubCategories)) {
            totalSubSubCategoryCount += subCat.subSubCategories.length;
          }
        });
        
        return {
          id: category._id,
          _id: category._id,
          name: category.name,
          // Use real category image from API or placeholder
          image: category.image || `/categories/${category.name.toLowerCase().replace(/\s+/g, '-')}.jpg`,
          // Include subcategory IDs
          subCategories: categorySubcategories.map(sub => sub._id),
          subCategoryCount: categorySubcategories.length,
          totalSubSubCategoryCount: totalSubSubCategoryCount,
          isActive: category.isActive
        };
      });
    } else if (!tableId && Array.isArray(defaultCategories) && defaultCategories.length > 0) {
      // Handle default categories when no table ID is present
      return defaultCategories.map((category: Category) => ({
        id: category._id,
        _id: category._id,
        name: category.name,
        image: category.image || `/categories/${category.name.toLowerCase().replace(/\s+/g, '-')}.jpg`,
        subCategories: [],
        subCategoryCount: 0,
        totalSubSubCategoryCount: 0,
        isActive: true
      }));
    }
    return [];
  }, [menuData, defaultCategories, tableId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/menu?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Handle splash screen
  useEffect(() => {
    const hasSeen = sessionStorage.getItem('hasSeenSplash');
    if (hasSeen) {
      setShowSplash(false);
    } else {
      setTimeout(() => {
        sessionStorage.setItem('hasSeenSplash', 'true');
        setShowSplash(false);
      }, 3000);
    }
  }, []);

  if (tableError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-4">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600">{tableError}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {showSplash ? (
          <SplashScreen onComplete={() => setShowSplash(false)} />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-[#16141F] text-white"
          >
            {/* Table Header with venue and table information */}
            <TableHeader 
              venueName={tableData?.venue?.name}
              tableName={tableData?.table?.number}
            />

            <main className="container mx-auto pt-16 pb-24">
              {/* Hero Slider - commented out as requested */}
              {/* !tableId && (
                <section className="mb-4">
                  <HeroSlider />
                </section>
              ) */}

              {/* Search Bar */}
              <section className="px-4 mb-6">
                <form onSubmit={handleSearch} className="relative">
                  <Input
                    type="text"
                    placeholder={`Search in ${tableData?.venue?.name || 'Menu'}`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 py-5 h-10 rounded-full"
                  />
                  <button
                    type="submit"
                    className="absolute inset-y-0 left-0 pl-3 flex items-center"
                  >
                    <Search className="h-5 w-5 text-muted-foreground" />
                  </button>
                </form>
              </section>

              {/* Category Section */}
              <section>
                <div className="px-4 mb-4">
                  <h2 className="text-xl font-bold">Categories</h2>
                  <p className="text-sm text-muted-foreground">
                    Browse all food and drink categories
                  </p>
                </div>

                {(isTableLoading || isMenuLoading) ? (
                  <div className="p-4 text-center">
                    <div className="animate-pulse">
                      <div className="h-8 bg-muted rounded w-1/2 mx-auto mb-4"></div>
                      <div className="h-8 bg-muted rounded w-1/3 mx-auto"></div>
                    </div>
                  </div>
                ) : (
                  <CategoryGrid categories={formattedCategories} />
                )}
              </section>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Index;
