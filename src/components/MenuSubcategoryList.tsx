import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Subcategory } from '@/api/menuService';
import { ArrowLeft } from 'lucide-react';

interface MenuSubcategoryListProps {
  categoryName: string;
  subcategories: Subcategory[];
  onSubcategorySelect: (subcategoryId: string) => void;
  onBackClick: () => void;
}

const MenuSubcategoryList: React.FC<MenuSubcategoryListProps> = ({ 
  categoryName,
  subcategories, 
  onSubcategorySelect,
  onBackClick
}) => {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost"
          onClick={onBackClick}
          className="mr-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">{categoryName}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {subcategories.map((subcategory) => (
          <Card 
            key={subcategory._id}
            onClick={() => onSubcategorySelect(subcategory._id)}
            className="cursor-pointer h-full transition-transform hover:scale-[1.02] hover:shadow-md"
          >
            {subcategory.image && (
              <div className="w-full h-40 overflow-hidden">
                <img
                  src={subcategory.image}
                  alt={subcategory.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold">
                {subcategory.name}
              </h3>
              {subcategory.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {subcategory.description}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MenuSubcategoryList; 