
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MenuItemComponent } from '@/components/MenuItemComponent';
import { api } from '@/services/api';
import { MenuItem } from '@/types';

interface Category {
  id: string;
  name: string;
  image: string;
  subCategories: string[];
}

// Function to get a fallback image based on category
const getFallbackImage = (searchTerm: string) => {
  const stockImages: Record<string, string> = {
    food: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
    burger: 'https://images.pexels.com/photos/1639562/pexels-photo-1639562.jpeg',
    pizza: 'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg',
    drink: 'https://images.pexels.com/photos/602750/pexels-photo-602750.jpeg',
    cocktail: 'https://images.pexels.com/photos/1170598/pexels-photo-1170598.jpeg',
    beer: 'https://images.pexels.com/photos/1552630/pexels-photo-1552630.jpeg',
    wine: 'https://images.pexels.com/photos/3019019/pexels-photo-3019019.jpeg',
    dessert: 'https://images.pexels.com/photos/132694/pexels-photo-132694.jpeg',
    coffee: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
    cinema: 'https://images.pexels.com/photos/614117/pexels-photo-614117.jpeg'
  };
  
  const category = Object.keys(stockImages).find(cat => 
    searchTerm?.toLowerCase().includes(cat)) || 'food';
  
  return stockImages[category];
};

const CategoryDetail: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const [activeSubCategory, setActiveSubCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Get categories data
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  });
  
  // Get menu items
  const { data: menuItems, isLoading: menuItemsLoading } = useQuery({
    queryKey: ['menuItems'],
    queryFn: api.getMenuItems,
  });
  
  // Find the current category
  const category = categoriesData?.find(
    (cat) => cat.id === categoryId
  ) as CategoryWithSubcategories | undefined;
  
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [menuItemsBySubCategory, setMenuItemsBySubCategory] = useState<Record<string, MenuItem[]>>({});
  
  // Create a mapping of menu items by subcategory
  useEffect(() => {
    if (!menuItems || !category) return;

    // Filter items for this category
    const categoryItems = menuItems.filter((item: MenuItem) => item.categoryId === categoryId);

    // Create a mapping for each subcategory
    const mapping: Record<string, MenuItem[]> = {};

    // Generate subcategory items if they don't exist
    const getSubcategoryItems = (subCat: string) => {
      const subcatItems = categoryItems.filter((item) =>
        item.subcategory && item.subcategory.toUpperCase() === subCat.toUpperCase()
      );

      if (subcatItems.length > 0) {
        return subcatItems;
      }

      // Create dummy items for the subcategory if none exist
      console.log(`Creating dummy items for ${subCat}`);

      // Get appropriate images for the category
      const imageTerms: Record<string, string> = {
        'NOODLES': 'noodles',
        'STARTERS': 'appetizers',
        'BURGERS': 'burger',
        'PIZZA': 'pizza',
        'PASTA': 'pasta',
        'SALADS': 'salad',
        'DESSERTS': 'dessert',
        'SIDES': 'sides',
        'MAIN': 'main course',
        'Popcorn': 'popcorn',
        'Nachos': 'nachos',
        'Candy': 'candy',
        'Pretzels': 'pretzels',
        'Soft Drinks': 'soda',
        'Coffee': 'coffee',
        'Tea': 'tea',
        'Draft Beers': 'beer',
        'Craft Beers': 'craft beer',
        'Red Wine': 'red wine',
        'White Wine': 'white wine'
      };

      const searchTerm = imageTerms[subCat] || subCat.toLowerCase();
      
      // Create base item if categoryItems is empty
      const baseItem = categoryItems.length > 0 ? categoryItems[0] : {
        id: '',
        name: '',
        description: '',
        price: 0,
        category: 'food',
        categoryId: categoryId || 'food',
        subcategory: '',
        featured: false,
        popular: false
      };

      const dummyItems = [...Array(4)].map((_, index) => ({
        ...baseItem,
        id: `${categoryId}-${subCat}-${index}`,
        name: `${subCat} Item ${index + 1}`,
        description: `Delicious ${subCat.toLowerCase()} item with premium ingredients`,
        price: 12.99 + index,
        image: getFallbackImage(searchTerm),
        subcategory: subCat,
        categoryId: categoryId,
        featured: index === 0,
        popular: index === 1
      }));

      return dummyItems;
    };

    // Add a menu item for each subcategory
    category.subCategories.forEach((subCat) => {
      const subcategoryItems = getSubcategoryItems(subCat);
      mapping[subCat] = subcategoryItems;
    });

    setMenuItemsBySubCategory(mapping);

    // Set initial filtered items
    if (activeSubCategory === 'all') {
      // Flatten all subcategory arrays into one
      const allItems = Object.values(mapping).flat();
      setFilteredItems(allItems);
    } else {
      setFilteredItems(mapping[activeSubCategory] || []);
    }
  }, [menuItems, categoryId, category]);

  // Filter items based on subcategory and search
  useEffect(() => {
    if (!category) return;

    let items: MenuItem[] = [];

    if (activeSubCategory === 'all') {
      // Get all items from all subcategories
      items = Object.values(menuItemsBySubCategory).flat();
    } else {
      // Get items only from the selected subcategory
      items = menuItemsBySubCategory[activeSubCategory] || [];
    }

    // Apply search filter if needed
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item) =>
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        (item.tags && item.tags.some((tag) => tag.toLowerCase().includes(query)))
      );
    }

    setFilteredItems(items);
  }, [activeSubCategory, searchQuery, menuItemsBySubCategory, category]);

  // Reset to top when changing category
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSubCategory]);

  if (menuItemsLoading || categoriesLoading || !category) {
    return (
      <div className="pt-16 px-4 animate-pulse">
        <div className="h-6 w-24 bg-secondary rounded mb-4"></div>
        <div className="h-12 w-full bg-secondary rounded mb-4"></div>
        <div className="h-8 w-full bg-secondary rounded mb-4"></div>
        <div className="grid grid-cols-2 gap-4 mt-6 pb-20">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-secondary rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 pb-24">
      {/* Header */}
      <div className="relative h-48 mb-4 overflow-hidden rounded-b-xl" style={{ backgroundColor: '#1F1D2B' }}>
        <img
          src={category.image}
          alt={category.name}
          className="w-full h-full object-cover opacity-90"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = getFallbackImage(category.name.toLowerCase().replace(/ /g, '-'));
          }}
        />
        <div className="absolute inset-0 flex flex-col justify-end p-6 pb-8">
          <div className="absolute bottom-0 left-0 p-6">
            <h1 className="text-3xl font-bold text-white">{category.name}</h1>
            <p className="text-white/80 text-sm">
              {category.subCategories.length} subcategories
            </p>
          </div>
        </div>
        
        {/* Back button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 bg-[#16141F]/50 text-white hover:bg-[#16141F]/70 rounded-full"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Search bar */}
      <div className="px-4 py-4 sticky top-0 bg-[#1F1D2B]/95 backdrop-blur-lg z-10 border-b border-[#2D303E]/30">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#2D303E]/70 border-none text-white rounded-full text-sm"
            style={{ backgroundColor: 'rgba(65, 53, 89, 0.8)' }}
          />
        </div>
      </div>
      
      {/* Subcategories */}
      <div className="px-4">
        <div className="overflow-x-auto flex gap-2 pb-4 no-scrollbar subcategory-scroll">
          <Button
            variant={activeSubCategory === 'all' ? 'default' : 'outline'}
            className={`flex-shrink-0 whitespace-nowrap subcategory-button ${activeSubCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveSubCategory('all')}
            style={{
              backgroundColor: activeSubCategory === 'all' ? '#7B61FF' : 'transparent',
              borderColor: '#7B61FF',
              color: activeSubCategory === 'all' ? 'white' : '#7B61FF'
            }}
          >
            All
          </Button>
          
          {category.subCategories.map((subCategory) => (
            <Button
              key={subCategory}
              variant={activeSubCategory === subCategory ? 'default' : 'outline'}
              className={`flex-shrink-0 whitespace-nowrap subcategory-button ${activeSubCategory === subCategory ? 'active' : ''}`}
              onClick={() => setActiveSubCategory(subCategory)}
              style={{
                backgroundColor: activeSubCategory === subCategory ? '#7B61FF' : 'transparent',
                borderColor: '#7B61FF',
                color: activeSubCategory === subCategory ? 'white' : '#7B61FF'
              }}
            >
              {subCategory}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Menu items */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubCategory + searchQuery}
          className="px-4 grid grid-cols-2 gap-3 mt-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <MenuItemComponent key={item.id} item={item} />
            ))
          ) : (
            <div className="col-span-2 py-12 text-center">
              <p className="text-muted-foreground">No items found.</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default CategoryDetail;
