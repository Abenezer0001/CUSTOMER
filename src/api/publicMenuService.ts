import { API_BASE_URL } from '@/constants';

// Public menu service specifically for customer-facing endpoints
// These endpoints don't require authentication

export interface PublicCategory {
  _id: string;
  name: string;
  description: string;
  image: string;
  isActive: boolean;
  order: number;
  restaurantId?: string;
}

export interface PublicSubCategory {
  _id: string;
  name: string;
  description: string;
  image: string;
  isActive: boolean;
  order: number;
  categoryId: string;
}

export interface PublicMenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categories: string[];
  subCategories?: string[];
  isAvailable: boolean;
  isActive: boolean;
  modifierGroups?: ModifierGroup[];
}

export interface ModifierGroup {
  _id: string;
  name: string;
  description?: string;
  selectionType: 'SINGLE' | 'MULTIPLE';
  isRequired: boolean;
  options: ModifierOption[];
}

export interface ModifierOption {
  _id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  isDefault?: boolean;
}

class PublicMenuService {
  private baseUrl = `${API_BASE_URL}/public/menu`;

  private async request<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('PublicMenuService: Making request to:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PublicMenuService: Request failed:', response.status, errorText);
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getCategories(restaurantId?: string): Promise<PublicCategory[]> {
    try {
      let endpoint = '/categories';
      if (restaurantId) {
        endpoint += `?restaurantId=${restaurantId}`;
      }
      return await this.request<PublicCategory[]>(endpoint);
    } catch (error) {
      console.error('PublicMenuService: Error fetching categories:', error);
      throw error;
    }
  }

  async getCategoryById(categoryId: string): Promise<PublicCategory> {
    try {
      return await this.request<PublicCategory>(`/categories/${categoryId}`);
    } catch (error) {
      console.error('PublicMenuService: Error fetching category:', error);
      throw error;
    }
  }

  async getSubCategories(categoryId: string): Promise<PublicSubCategory[]> {
    try {
      return await this.request<PublicSubCategory[]>(`/subcategories?categoryId=${categoryId}`);
    } catch (error) {
      console.error('PublicMenuService: Error fetching subcategories:', error);
      throw error;
    }
  }

  async getMenuItems(
    categoryId?: string, 
    subCategoryId?: string, 
    restaurantId?: string
  ): Promise<PublicMenuItem[]> {
    try {
      const params = new URLSearchParams();
      if (categoryId) params.append('categoryId', categoryId);
      if (subCategoryId) params.append('subCategoryId', subCategoryId);
      if (restaurantId) params.append('restaurantId', restaurantId);
      
      const queryString = params.toString();
      const endpoint = `/menu-items${queryString ? `?${queryString}` : ''}`;
      
      return await this.request<PublicMenuItem[]>(endpoint);
    } catch (error) {
      console.error('PublicMenuService: Error fetching menu items:', error);
      throw error;
    }
  }

  async getFullMenu(restaurantId: string): Promise<any> {
    try {
      return await this.request(`/restaurant/${restaurantId}/full`);
    } catch (error) {
      console.error('PublicMenuService: Error fetching full menu:', error);
      throw error;
    }
  }
}

export const publicMenuService = new PublicMenuService();
export default publicMenuService;