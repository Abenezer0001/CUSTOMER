import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Category } from '@/api/menuService';
import { Avatar } from '@/components/ui/avatar';

interface MenuCategoryListProps {
  categories: Category[];
  onCategorySelect: (categoryId: string) => void;
}

const MenuCategoryList: React.FC<MenuCategoryListProps> = ({ 
  categories, 
  onCategorySelect 
}) => {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Menu Categories</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card 
            key={category._id}
            onClick={() => onCategorySelect(category._id)}
            className="cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-md"
          >
            <CardContent className="flex items-center p-4">
              {category.image && (
                <Avatar 
                  className="h-14 w-14 mr-4"
                >
                  <img 
                    src={category.image} 
                    alt={category.name}
                    className="object-cover h-full w-full"
                  />
                </Avatar>
              )}
              <div>
                <h3 className="text-lg font-semibold">
                  {category.name}
                </h3>
                {category.description && (
                  <p className="text-sm text-muted-foreground">
                    {category.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MenuCategoryList; 