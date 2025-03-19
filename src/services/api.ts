
import { Category, MenuItem } from '@/types';

// Simulated API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Base URL for placeholder images
const PLACEHOLDER_IMAGE_BASE = 'https://images.unsplash.com/';

// Sample categories
const categories: Category[] = [
  { id: 'starters', name: 'Starters' },
  { id: 'mains', name: 'Main Courses' },
  { id: 'desserts', name: 'Desserts' },
  { id: 'drinks', name: 'Drinks' },
  { id: 'sides', name: 'Sides' }
];

// Sample menu items with categories
const menuItems: MenuItem[] = [
  {
    id: '1',
    name: 'Crispy Calamari',
    description: 'Tender squid lightly fried with a zesty lemon aioli',
    price: 12.99,
    image: `${PLACEHOLDER_IMAGE_BASE}photo-1675257163064-1a7b489e48e4`,
    category: 'starters',
    featured: true,
    tags: ['seafood', 'fried', 'popular']
  },
  {
    id: '2',
    name: 'Bruschetta',
    description: 'Grilled bread rubbed with garlic, topped with diced tomatoes, fresh basil, and olive oil',
    price: 8.99,
    image: `${PLACEHOLDER_IMAGE_BASE}photo-1572695157366-5e585ab88d5d`,
    category: 'starters',
    tags: ['vegetarian', 'italian']
  },
  {
    id: '3',
    name: 'Grilled Salmon',
    description: 'Fresh Atlantic salmon served with seasonal vegetables and lemon butter sauce',
    price: 24.99,
    image: `${PLACEHOLDER_IMAGE_BASE}photo-1519708227418-c8fd9a32b7a2`,
    category: 'mains',
    featured: true,
    popular: true,
    tags: ['seafood', 'healthy', 'gluten-free']
  },
  {
    id: '4',
    name: 'Filet Mignon',
    description: 'Premium beef tenderloin cooked to perfection, served with truffle mashed potatoes',
    price: 34.99,
    image: `${PLACEHOLDER_IMAGE_BASE}photo-1558030006-450675393462`,
    category: 'mains',
    popular: true,
    tags: ['beef', 'premium', 'gluten-free']
  },
  {
    id: '5',
    name: 'Vegetable Stir Fry',
    description: 'Seasonal vegetables stir-fried in a savory sauce, served with steamed rice',
    price: 16.99,
    image: `${PLACEHOLDER_IMAGE_BASE}photo-1512621776951-a57141f2eefd`,
    category: 'mains',
    tags: ['vegetarian', 'vegan', 'healthy']
  },
  {
    id: '6',
    name: 'Tiramisu',
    description: 'Classic Italian dessert with layers of coffee-soaked ladyfingers and mascarpone cream',
    price: 8.99,
    image: `${PLACEHOLDER_IMAGE_BASE}photo-1571877227200-a0d98ea607e9`,
    category: 'desserts',
    popular: true,
    tags: ['italian', 'coffee', 'sweet']
  },
  {
    id: '7',
    name: 'Chocolate Lava Cake',
    description: 'Warm chocolate cake with a molten center, served with vanilla ice cream',
    price: 9.99,
    image: `${PLACEHOLDER_IMAGE_BASE}photo-1624353365286-3f8d62daad51`,
    category: 'desserts',
    featured: true,
    tags: ['chocolate', 'hot', 'sweet']
  },
  {
    id: '8',
    name: 'Craft Beer',
    description: 'Selection of local craft beers',
    price: 7.99,
    image: `${PLACEHOLDER_IMAGE_BASE}photo-1608270586620-248524c67de9`,
    category: 'drinks',
    tags: ['alcoholic', 'cold']
  },
  {
    id: '9',
    name: 'Signature Cocktail',
    description: 'House specialty cocktail with premium spirits and fresh ingredients',
    price: 12.99,
    image: `${PLACEHOLDER_IMAGE_BASE}photo-1608270586620-248524c67de9`,
    category: 'drinks',
    featured: true,
    tags: ['alcoholic', 'premium', 'signature']
  },
  {
    id: '10',
    name: 'Truffle Fries',
    description: 'Golden fries tossed with truffle oil, parmesan cheese, and fresh herbs',
    price: 8.99,
    image: `${PLACEHOLDER_IMAGE_BASE}photo-1630384060421-cb20d0e0649d`,
    category: 'sides',
    popular: true,
    tags: ['vegetarian', 'popular']
  },
  {
    id: '11',
    name: 'Caesar Salad',
    description: 'Crisp romaine lettuce, house-made Caesar dressing, croutons, and parmesan cheese',
    price: 9.99,
    image: `${PLACEHOLDER_IMAGE_BASE}photo-1551248429-40975aa4de74`,
    category: 'sides',
    tags: ['fresh', 'healthy']
  },
  {
    id: '12',
    name: 'Margherita Pizza',
    description: 'Classic pizza with tomato sauce, fresh mozzarella, and basil on a thin crust',
    price: 14.99,
    image: `${PLACEHOLDER_IMAGE_BASE}photo-1565299624946-b28f40a0ae38`,
    category: 'mains',
    featured: true,
    popular: true,
    tags: ['italian', 'vegetarian', 'popular']
  }
];

// API Services
export const api = {
  // Get all categories
  getCategories: async (): Promise<Category[]> => {
    await delay(300);
    return [...categories];
  },
  
  // Get all menu items
  getMenuItems: async (): Promise<MenuItem[]> => {
    await delay(500);
    return [...menuItems];
  },
  
  // Get menu items by category
  getMenuItemsByCategory: async (categoryId: string): Promise<MenuItem[]> => {
    await delay(400);
    return menuItems.filter(item => item.category === categoryId);
  },
  
  // Get a single menu item by ID
  getMenuItem: async (id: string): Promise<MenuItem | undefined> => {
    await delay(300);
    return menuItems.find(item => item.id === id);
  },
  
  // Get featured menu items
  getFeaturedItems: async (): Promise<MenuItem[]> => {
    await delay(400);
    return menuItems.filter(item => item.featured);
  },
  
  // Get popular menu items
  getPopularItems: async (): Promise<MenuItem[]> => {
    await delay(400);
    return menuItems.filter(item => item.popular);
  },
  
  // Search menu items
  searchMenuItems: async (query: string): Promise<MenuItem[]> => {
    await delay(300);
    const lowerCaseQuery = query.toLowerCase();
    return menuItems.filter(
      item =>
        item.name.toLowerCase().includes(lowerCaseQuery) ||
        item.description.toLowerCase().includes(lowerCaseQuery) ||
        item.tags?.some(tag => tag.toLowerCase().includes(lowerCaseQuery))
    );
  }
};
