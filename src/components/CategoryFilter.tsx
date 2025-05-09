import React from 'react';
import { Category } from '@/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <Tabs 
      value={selectedCategory} 
      onValueChange={onSelectCategory}
      className="w-full"
    >
      <TabsList className="flex flex-wrap justify-start gap-2 bg-transparent overflow-x-auto">
        {categories.map((category) => (
          <TabsTrigger 
            key={category.id} 
            value={category.id}
            className="data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            {category.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};

export default CategoryFilter; 