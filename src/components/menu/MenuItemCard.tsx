import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { SharedImage } from '@/components/shared/SharedImage';
import { MenuItem } from '@/types/menu';

interface MenuItemCardProps {
  item: MenuItem;
  onClick?: () => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, onClick }) => {
  return (
    <Card 
      className="overflow-hidden bg-background border-border hover:border-marian-blue/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="aspect-video relative overflow-hidden">
        <SharedImage
          src={item.image}
          alt={item.name}
          fallbackSearchTerm={item.imageSearchTerm}
          className="w-full h-full transition-transform duration-300 hover:scale-105"
        />
      </div>
      
      <div className="p-4 space-y-3">
        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {item.tags.map((tag, index) => (
            <Badge 
              key={index} 
              variant="secondary" 
              className="bg-muted text-muted-foreground text-xs"
            >
              {tag}
            </Badge>
          ))}
        </div>
        
        {/* Name and Description */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg leading-none tracking-tight">{item.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
        </div>
        
        {/* Price and Duration in a more compact layout */}
        <div className="flex items-end justify-between pt-1">
          <div className="space-y-1">
            <div className="text-lg font-bold text-marian-blue">
              ${item.price.toFixed(2)}
            </div>
            {item.preparationTime && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5 mr-1" />
                {item.preparationTime}
              </div>
            )}
          </div>
          {item.popular && (
            <Badge className="bg-marian-blue/10 text-marian-blue hover:bg-marian-blue/20">
              Popular
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
};

export default MenuItemCard;

