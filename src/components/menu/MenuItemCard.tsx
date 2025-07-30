import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SharedImage } from '@/components/shared/SharedImage';
import { MenuItem } from '@/types/menu';
import { RatingStats } from '@/types';
import ratingService from '@/api/ratingService';
import { cn } from '@/lib/utils';

interface MenuItemCardProps {
  item: MenuItem;
  onClick?: () => void;
  className?: string;
  showPlusButton?: boolean;
  showRating?: boolean;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ 
  item, 
  onClick, 
  className,
  showPlusButton = false,
  showRating = true
}) => {
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [loadingRating, setLoadingRating] = useState(false);
  
  // Fetch rating stats
  useEffect(() => {
    if (showRating) {
      const fetchRatingStats = async () => {
        setLoadingRating(true);
        try {
          const stats = await ratingService.getMenuItemRatingStats(item._id || item.id);
          setRatingStats(stats);
        } catch (error) {
          // Silently fail - no rating stats available
          console.log('No rating stats available for item:', item.name);
        } finally {
          setLoadingRating(false);
        }
      };
      
      fetchRatingStats();
    }
  }, [item.id, item._id, showRating]);
  // Handle click with proper propagation control and debug logging
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('MenuItemCard clicked:', item.name); // Debug log
    if (onClick) {
      onClick();
    }
  };
  
  return (
    <Card 
      className={cn(
        "overflow-hidden h-full cursor-pointer transition-all duration-200 hover:shadow-lg group",
        "bg-[#1F1D2B] border-[#2D303E]",
        className
      )}
      onClick={handleClick}
    >
      <div className="relative">
        {/* Image container with fixed aspect ratio */}
        <div className="aspect-[4/3] overflow-hidden">
          <SharedImage
            src={item.image}
            alt={item.name}
            fallbackSearchTerm={item.imageSearchTerm || 'food'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        
        {/* Featured badge */}
        {item.featured && (
          <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full z-10">
            Featured
          </div>
        )}
        
        {/* Plus button - conditionally rendered */}
        {showPlusButton && (
          <Button 
            variant="default"
            size="icon" 
            className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-purple-600 hover:bg-purple-700 shadow-md 
              transition-all duration-200 opacity-0 group-hover:opacity-100 z-10"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              console.log('Plus button clicked:', item.name); // Debug log
              if (onClick) onClick();
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <div className="p-3 space-y-2 text-white">
        {/* Name and Price */}
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-medium text-sm leading-tight line-clamp-1">{item.name}</h3>
          <span className="font-semibold text-sm text-purple-400 whitespace-nowrap ml-1">
            ${item.price.toFixed(2)}
          </span>
        </div>
        
        {/* Description - limited to 2 lines */}
        <p className="text-xs text-gray-400 line-clamp-2 min-h-[2rem]">
          {item.description || 'No description available'}
        </p>
        
        {/* Rating Display */}
        {showRating && ratingStats && ratingStats.totalReviews > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-medium text-gray-300">
                {ratingStats.averageRating.toFixed(1)}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              ({ratingStats.totalReviews})
            </span>
          </div>
        )}
        
        {/* Tags and metadata */}
        <div className="flex flex-wrap items-center justify-between gap-1 pt-1">
          <div className="flex flex-wrap gap-1">
            {item.tags && item.tags.length > 0 && item.tags.slice(0, 1).map((tag, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="bg-[#2D303E] text-gray-300 text-xs px-2 py-0"
              >
                {tag}
              </Badge>
            ))}
            {item.preparationTime && (
              <span className="flex items-center text-xs text-gray-400">
                <Clock className="w-3 h-3 mr-0.5" />
                {item.preparationTime}
              </span>
            )}
          </div>
          
          {item.popular && (
            <Badge className="bg-purple-900/40 text-purple-200 hover:bg-purple-900/60 text-xs border border-purple-600/30">
              Popular
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
};

export default MenuItemCard;
