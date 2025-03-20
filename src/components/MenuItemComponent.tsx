
import React from 'react';
import { MenuItem } from '@/types';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ItemDetailDialog } from '@/components/ItemDetailDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useCart } from '@/context/CartContext';

interface MenuItemComponentProps {
  item: MenuItem;
}

export const MenuItemComponent: React.FC<MenuItemComponentProps> = ({ item }) => {
  const { addItem } = useCart();
  
  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(item, 1);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm cursor-pointer hover:shadow-md transition-shadow">
          <img 
            src={item.image} 
            alt={item.name}
            className="w-32 h-32 object-cover"
            loading="lazy"
          />
          <div className="flex-1 p-3">
            <div className="flex justify-between items-start">
              <h3 className="font-medium">{item.name}</h3>
              <span className="font-medium text-emerald-600">${item.price.toFixed(2)}</span>
            </div>
            <p className="text-sm text-gray-600 my-2 line-clamp-2">{item.description}</p>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white mt-2"
              onClick={handleQuickAdd}
            >
              <Plus size={16} className="mr-1" /> Add to Cart
            </Button>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <ItemDetailDialog item={item} />
      </DialogContent>
    </Dialog>
  );
};
