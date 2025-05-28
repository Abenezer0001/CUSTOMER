import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card'; 

// Skeleton Loader Component
const CategorySkeleton = () => (
  <div className="space-y-4 px-4">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="relative overflow-hidden rounded-xl">
        <div className="relative h-48 w-full overflow-hidden">
          {/* Image Skeleton */}
          <Skeleton className="w-full h-full bg-gray-800/50" />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/40 to-black/20" />
          
          {/* Left Border */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gray-700" />
          
          {/* Content Skeleton */}
          <div className="absolute bottom-0 left-0 right-0 pb-4 px-4">
            <div className="flex justify-between items-end">
              <div className="space-y-2 pl-2 w-2/3">
                <Skeleton className="h-6 w-3/4 bg-gray-600" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20 bg-gray-600 rounded-full" />
                  <Skeleton className="h-6 w-16 bg-gray-600 rounded-full" />
                </div>
              </div>
              <Skeleton className="w-10 h-10 rounded-full bg-gray-600" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

interface Category {
  id: string;
  name: string;
  image?: string;
  subCategories: string[];
  subCategoryCount: number;
  totalSubSubCategoryCount: number;
  isActive?: boolean;
}

interface CategoryGridProps {
  categories: Category[];
  isLoading?: boolean;
}

const CategoryGrid: React.FC<CategoryGridProps> = ({ categories, isLoading = false }) => {
  if (isLoading) {
    return <CategorySkeleton />;
  }
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get table ID from URL if it exists
  const queryParams = new URLSearchParams(location.search);
  const tableId = queryParams.get('table');
  
  const handleCategoryClick = (categoryId: string) => {
    // Add table ID to the URL if it exists
    const url = tableId 
      ? `/category/${categoryId}?table=${tableId}` 
      : `/category/${categoryId}`;
    
    navigate(url);
  };
  
  return (
    <div className="space-y-4 px-4">
      {categories.map((category) => (
        <div 
          key={category.id}
          className={`relative group overflow-hidden rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
            category.isActive === false ? 'opacity-60' : ''
          }`}
          onClick={() => handleCategoryClick(category.id)}
        >
          {/* Background Image */}
          <div className="relative h-48 w-full overflow-hidden">
            <img
              src={category.image || '/placeholder-category.jpg'}
              alt={category.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/placeholder-category.jpg';
              }}
            />
            
            {/* Gradient Overlay - Full Card */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/40 to-black/20 opacity-100 transition-opacity duration-300" />
            
            {/* Left Border */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-purple-600" />
            
            {/* Category Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 pb-4 px-4 text-white">
              <div className="flex justify-between items-end">
                {/* Text Container - No Background */}
                <div className="relative pl-2">
                  <h3 className="text-xl font-bold mb-1.5 text-white drop-shadow-md">{category.name}</h3>
                  
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 bg-purple-600/90 text-white text-xs font-medium rounded-full backdrop-blur-sm border border-purple-400/20">
                      {category.subCategoryCount === 0 ? 'No' : category.subCategoryCount} 
                      {category.subCategoryCount === 1 ? 'Category' : 'Categories'}
                    </span>
                    
                    {category.totalSubSubCategoryCount > 0 && (
                      <span className="inline-flex items-center px-2.5 py-1 bg-purple-800/80 text-white text-xs font-medium rounded-full backdrop-blur-sm border border-purple-400/20">
                        {category.totalSubSubCategoryCount} Items
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {category.isActive === false && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
                  Currently Unavailable
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CategoryGrid;
