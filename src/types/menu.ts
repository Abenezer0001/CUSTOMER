export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  imageSearchTerm: string;
  category: string;
  categoryId: string;
  subcategory?: string;
  featured: boolean;
  popular: boolean;
  tags: string[];
  preparationTime?: string;
  modifiers?: Array<{
    name: string;
    type: 'single-select' | 'multi-select';
    required: boolean;
    options: Array<{
      name: string;
      price: number;
    }>;
  }>;
}

