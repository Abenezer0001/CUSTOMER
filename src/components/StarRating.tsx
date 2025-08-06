import React, { useState, useCallback } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  /** Current rating value (0-5) */
  rating: number;
  /** Maximum number of stars */
  maxRating?: number;
  /** Size of the stars */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Whether the rating is interactive (clickable) */
  interactive?: boolean;
  /** Whether to show half stars for decimal ratings */
  allowHalfStars?: boolean;
  /** Whether to show the numeric rating */
  showNumeric?: boolean;
  /** Custom class name */
  className?: string;
  /** Callback when rating changes (only for interactive mode) */
  onRatingChange?: (rating: number) => void;
  /** Callback when hovering over stars (only for interactive mode) */
  onRatingHover?: (rating: number) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Color variant */
  variant?: 'default' | 'amber' | 'yellow' | 'orange';
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxRating = 5,
  size = 'md',
  interactive = false,
  allowHalfStars = true,
  showNumeric = false,
  className,
  onRatingChange,
  onRatingHover,
  disabled = false,
  variant = 'amber'
}) => {
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isHovering, setIsHovering] = useState<boolean>(false);

  // Size configurations
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8'
  };

  // Color configurations
  const colorVariants = {
    default: {
      filled: 'text-gray-900 fill-gray-900',
      empty: 'text-gray-300'
    },
    amber: {
      filled: 'text-amber-400 fill-amber-400',
      empty: 'text-gray-300 dark:text-gray-600'
    },
    yellow: {
      filled: 'text-yellow-400 fill-yellow-400',
      empty: 'text-gray-300 dark:text-gray-600'
    },
    orange: {
      filled: 'text-orange-400 fill-orange-400',
      empty: 'text-gray-300 dark:text-gray-600'
    }
  };

  const colors = colorVariants[variant];

  const handleStarClick = useCallback((starIndex: number, isHalf: boolean = false) => {
    if (!interactive || disabled) return;
    
    const newRating = isHalf ? starIndex + 0.5 : starIndex + 1;
    onRatingChange?.(newRating);
  }, [interactive, disabled, onRatingChange]);

  const handleStarHover = useCallback((starIndex: number, isHalf: boolean = false) => {
    if (!interactive || disabled) return;
    
    const newRating = isHalf ? starIndex + 0.5 : starIndex + 1;
    setHoverRating(newRating);
    setIsHovering(true);
    onRatingHover?.(newRating);
  }, [interactive, disabled, onRatingHover]);

  const handleMouseLeave = useCallback(() => {
    if (!interactive || disabled) return;
    
    setHoverRating(0);
    setIsHovering(false);
    onRatingHover?.(0);
  }, [interactive, disabled, onRatingHover]);

  const getStarFillType = (starIndex: number): 'empty' | 'half' | 'full' => {
    const currentRating = isHovering ? hoverRating : rating;
    
    if (currentRating >= starIndex + 1) {
      return 'full';
    } else if (allowHalfStars && currentRating >= starIndex + 0.5) {
      return 'half';
    } else {
      return 'empty';
    }
  };

  const renderStar = (starIndex: number) => {
    const fillType = getStarFillType(starIndex);
    const isClickable = interactive && !disabled;
    
    return (
      <div
        key={starIndex}
        className={cn(
          "relative transform transition-transform duration-200",
          isClickable && "cursor-pointer hover:scale-110",
          disabled && "opacity-50"
        )}
        onMouseLeave={interactive ? handleMouseLeave : undefined}
      >
        {/* Base star (empty) */}
        <Star
          className={cn(
            sizeClasses[size],
            colors.empty,
            "transition-colors duration-150"
          )}
        />
        
        {/* Filled star overlay with enhanced animations */}
        <div
          className={cn(
            "absolute inset-0 overflow-hidden transition-all duration-300 ease-out",
            fillType === 'empty' && "w-0",
            fillType === 'half' && "w-1/2",
            fillType === 'full' && "w-full"
          )}
        >
          <Star
            className={cn(
              sizeClasses[size],
              colors.filled,
              "transition-all duration-300 ease-out",
              interactive && !disabled && "hover:scale-110 hover:drop-shadow-sm"
            )}
          />
        </div>
        
        {/* Interactive overlay for half-star selection */}
        {interactive && allowHalfStars && (
          <>
            {/* Left half for 0.5 rating */}
            <div
              className="absolute inset-0 w-1/2 z-10"
              onClick={() => handleStarClick(starIndex, true)}
              onMouseEnter={() => handleStarHover(starIndex, true)}
            />
            {/* Right half for full rating */}
            <div
              className="absolute inset-0 left-1/2 w-1/2 z-10"
              onClick={() => handleStarClick(starIndex, false)}
              onMouseEnter={() => handleStarHover(starIndex, false)}
            />
          </>
        )}
        
        {/* Simple click overlay for non-half-star mode */}
        {interactive && !allowHalfStars && (
          <div
            className="absolute inset-0 z-10"
            onClick={() => handleStarClick(starIndex)}
            onMouseEnter={() => handleStarHover(starIndex)}
          />
        )}
      </div>
    );
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Stars */}
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxRating }, (_, index) => renderStar(index))}
      </div>
      
      {/* Numeric rating with enhanced styling */}
      {showNumeric && (
        <span className={cn(
          "ml-2 font-semibold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent",
          size === 'xs' && "text-xs",
          size === 'sm' && "text-sm",
          size === 'md' && "text-base",
          size === 'lg' && "text-lg",
          size === 'xl' && "text-xl"
        )}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
};

export default StarRating;