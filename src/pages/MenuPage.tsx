import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MenuCategoryList from '@/components/MenuCategoryList';
import MenuSubcategoryList from '@/components/MenuSubcategoryList';
import MenuItemList from '@/components/MenuItemList';
import { getCategories, getSubcategories, getMenuItems, Category, Subcategory, MenuItem } from '@/api/menuService';
import { useToast } from '@/components/ui/use-toast';

const MenuPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  
  // Example restaurant ID - should come from context/props/route params in real app
  const restaurantId = "655f142a12345678901234ff";

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const data = await getCategories(restaurantId);
        setCategories(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch categories');
        toast({
          title: "Error",
          description: "Failed to fetch menu categories. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, [restaurantId, toast]);

  // Fetch subcategories when a category is selected
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (!selectedCategory) {
        setSubcategories([]);
        return;
      }
      
      try {
        setLoading(true);
        const data = await getSubcategories(selectedCategory);
        setSubcategories(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch subcategories');
        toast({
          title: "Error",
          description: "Failed to fetch subcategories. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
      }
    };
    
    fetchSubcategories();
  }, [selectedCategory, toast]);

  // Fetch menu items when a subcategory is selected
  useEffect(() => {
    const fetchMenuItems = async () => {
      if (!selectedCategory) {
        setMenuItems([]);
        return;
      }
      
      try {
        setLoading(true);
        const data = await getMenuItems(
          restaurantId, 
          selectedCategory, 
          selectedSubcategory || undefined
        );
        setMenuItems(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch menu items');
        toast({
          title: "Error",
          description: "Failed to fetch menu items. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
      }
    };
    
    fetchMenuItems();
  }, [restaurantId, selectedCategory, selectedSubcategory, toast]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory(null);
  };

  const handleSubcategorySelect = (subcategoryId: string) => {
    setSelectedSubcategory(subcategoryId);
  };

  const handleMenuItemSelect = (menuItemId: string) => {
    navigate(`/menu-item/${menuItemId}`);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
  };

  const handleBackToSubcategories = () => {
    setSelectedSubcategory(null);
  };

  const handleAddToCart = (item: MenuItem) => {
    // In a real app, this would add the item to a cart context/state
    toast({
      title: "Added to Cart",
      description: `${item.name} has been added to your cart.`,
      variant: "default"
    });
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 text-xl">{error}</p>
      </div>
    );
  }

  if (loading && !categories.length) {
    return (
      <div className="flex justify-center items-center p-8 min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="mt-16">
      {!selectedCategory ? (
        <MenuCategoryList 
          categories={categories} 
          onCategorySelect={handleCategorySelect} 
        />
      ) : !selectedSubcategory ? (
        <MenuSubcategoryList 
          subcategories={subcategories} 
          onSubcategorySelect={handleSubcategorySelect} 
          onBackClick={handleBackToCategories}
          categoryName={categories.find(c => c._id === selectedCategory)?.name || ''}
        />
      ) : (
        <MenuItemList 
          menuItems={menuItems} 
          onBackClick={handleBackToSubcategories}
          onAddToCart={handleAddToCart}
          subcategoryName={subcategories.find(s => s._id === selectedSubcategory)?.name || ''}
        />
      )}
    </div>
  );
};

export default MenuPage; 