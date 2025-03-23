
import React from 'react';
import { MenuItem } from '@/types';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ItemDetailDialog } from '@/components/ItemDetailDialog';
import { Plus } from 'lucide-react';
import { useCart } from '@/context/CartContext';

interface MenuItemComponentProps {
  item: MenuItem;
}

export const MenuItemComponent: React.FC<MenuItemComponentProps> = ({ item }) => {
  const { addItem } = useCart();
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          {item.featured && (
            <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              Featured
            </span>
          )}
          <div className="aspect-[4/3] overflow-hidden">
            <img 
              src={item.image} 
              alt={item.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="p-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{item.name}</h3>
                <p className="text-xs text-gray-500 my-1 line-clamp-1">{item.description}</p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold">${item.price.toFixed(2)}</span>
                <button 
                  className="mt-1 h-6 w-6 bg-emerald-500 rounded-full flex items-center justify-center text-white"
                  aria-label="View details"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <ItemDetailDialog item={item} />
      </DialogContent>
    </Dialog>
  );
};
