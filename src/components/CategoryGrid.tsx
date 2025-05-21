import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

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
}

const CategoryGrid: React.FC<CategoryGridProps> = ({ categories }) => {
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
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-4">
      {categories.map((category) => (
        <Card 
          key={category.id}
          className={`overflow-hidden cursor-pointer transition-all hover:shadow-md ${
            category.isActive === false ? 'opacity-60' : ''
          }`}
          onClick={() => handleCategoryClick(category.id)}
        >
          <div className="relative h-32 overflow-hidden">
            <img
              src={category.image || '/placeholder-category.jpg'}
              alt={category.name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/placeholder-category.jpg';
              }}
            />
            {category.isActive === false && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-sm font-medium">Unavailable</span>
              </div>
            )}
          </div>
          
          <CardContent className="p-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-base">{category.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {category.subCategoryCount > 0 
                    ? `${category.subCategoryCount} subcategories` 
                    : 'View items'}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CategoryGrid;
