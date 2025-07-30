import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, TrendingUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrderContext';
import ratingService from '@/api/ratingService';
import { Rating, RatingStats, RatingSubmission, RatingUpdate } from '@/types';

interface MenuItemRatingProps {
  menuItemId: string;
  menuItemName: string;
  restaurantId: string;
  showFullStats?: boolean;
  onRatingSubmitted?: (rating: Rating) => void;
  onStatsUpdate?: (stats: RatingStats) => void;
}

const MenuItemRating: React.FC<MenuItemRatingProps> = ({
  menuItemId,
  menuItemName,
  restaurantId,
  showFullStats = true,
  onRatingSubmitted,
  onStatsUpdate
}) => {
  const { user } = useAuth();
  const { orderHistory } = useOrders();
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [review, setReview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [existingRating, setExistingRating] = useState<Rating | null>(null);
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [hasOrderedItem, setHasOrderedItem] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize component data
  useEffect(() => {
    const initializeRatingData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Check if user has ordered this item
        if (user && orderHistory.length > 0) {
          const hasOrdered = orderHistory.some(order => 
            order.items.some(item => 
              item.id === menuItemId || item.menuItemId === menuItemId
            )
          );
          setHasOrderedItem(hasOrdered);

          // If user has ordered, check for existing rating
          if (hasOrdered) {
            try {
              const userRating = await ratingService.getUserRatingForItem(menuItemId);
              if (userRating) {
                setExistingRating(userRating);
                setRating(userRating.rating);
                setReview(userRating.comment || '');
              }
            } catch (error) {
              // No existing rating found - this is normal
              console.log('No existing rating found for user');
            }
          }
        }

        // Always fetch rating stats for display
        if (showFullStats) {
          try {
            const stats = await ratingService.getMenuItemRatingStats(menuItemId);
            setRatingStats(stats);
            onStatsUpdate?.(stats);
          } catch (error) {
            console.error('Failed to fetch rating stats:', error);
            // Initialize empty stats if fetch fails
            setRatingStats({
              averageRating: 0,
              totalReviews: 0,
              ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
            });
          }
        }
      } catch (error) {
        console.error('Error initializing rating data:', error);
        setError('Failed to load rating information');
      } finally {
        setIsLoading(false);
      }
    };

    initializeRatingData();
  }, [user, orderHistory, menuItemId, showFullStats, onStatsUpdate]);

  // Show loading skeleton while initializing
  if (isLoading) {
    return (
      <Card className="mt-6 border border-emerald-100 dark:border-emerald-800">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Skeleton key={star} className="w-8 h-8 rounded" />
            ))}
          </div>
          {showFullStats && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Show error state if there was an error loading
  if (error && !showFullStats) {
    return (
      <Card className="mt-6 border border-red-100 dark:border-red-800">
        <CardContent className="pt-6">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const handleStarClick = (starValue: number) => {
    setRating(starValue);
  };

  const handleStarHover = (starValue: number) => {
    setHoveredRating(starValue);
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (!user) {
      toast.error('Please log in to submit a rating');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let result: Rating;
      
      if (existingRating) {
        // Update existing rating
        const updateData: RatingUpdate = {
          rating,
          comment: review.trim() || undefined
        };
        
        result = await ratingService.updateRating(existingRating._id, updateData);
        toast.success('Rating updated successfully!');
      } else {
        // Submit new rating
        const submissionData: RatingSubmission = {
          menuItemId,
          rating,
          comment: review.trim() || undefined
        };
        
        result = await ratingService.submitRating(submissionData);
        toast.success('Rating submitted successfully!');
      }

      // Update local state
      setExistingRating(result);
      
      // Refresh rating stats
      if (showFullStats) {
        try {
          const updatedStats = await ratingService.getMenuItemRatingStats(menuItemId);
          setRatingStats(updatedStats);
          onStatsUpdate?.(updatedStats);
        } catch (statsError) {
          console.error('Failed to refresh rating stats:', statsError);
        }
      }
      
      // Call callback if provided
      onRatingSubmitted?.(result);
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      setError(error.message || 'Failed to submit rating');
      toast.error(error.message || 'Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return 'Rate this item';
    }
  };

  return (
    <Card className="mt-6 border border-emerald-100 dark:border-emerald-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Star className="h-5 w-5 text-emerald-500" />
          {existingRating ? 'Your Rating' : 'Rate this Item'}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {existingRating 
            ? 'You can update your rating and review anytime'
            : `Share your experience with ${menuItemName}`
          }
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Star Rating */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={cn(
                  "p-1 rounded transition-colors",
                  user && hasOrderedItem 
                    ? "hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer"
                    : "cursor-not-allowed opacity-50"
                )}
                onClick={() => user && hasOrderedItem && handleStarClick(star)}
                onMouseEnter={() => user && hasOrderedItem && handleStarHover(star)}
                onMouseLeave={() => user && hasOrderedItem && setHoveredRating(0)}
                disabled={isSubmitting || !user || !hasOrderedItem}
              >
                <Star
                  className={cn(
                    "h-8 w-8 transition-colors",
                    (hoveredRating >= star || (!hoveredRating && rating >= star))
                      ? "fill-amber-400 text-amber-400"
                      : "text-gray-300 dark:text-gray-600"
                  )}
                />
              </button>
            ))}
          </div>
          
          {(rating > 0 || hoveredRating > 0) && (
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {getRatingText(hoveredRating || rating)}
            </p>
          )}
        </div>

        {/* Review Text Area - only show if user can rate */}
        {user && hasOrderedItem && rating > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Write a Review (Optional)
            </label>
            <Textarea
              placeholder={`Tell others about your experience with ${menuItemName}...`}
              value={review}
              onChange={(e) => setReview(e.target.value)}
              className="resize-none min-h-[80px]"
              disabled={isSubmitting}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {review.length}/500 characters
            </p>
          </div>
        )}

        {/* Submit Button - only show if user has ordered this item */}
        {user && hasOrderedItem && rating > 0 && (
          <Button
            onClick={handleSubmitRating}
            disabled={isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {existingRating ? 'Updating...' : 'Submitting...'}
              </div>
            ) : (
              existingRating ? 'Update Rating' : 'Submit Rating'
            )}
          </Button>
        )}

        {/* Message for users who haven't ordered */}
        {user && !hasOrderedItem && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              You can rate this item after ordering it. Order now to share your experience!
            </p>
          </div>
        )}

        {/* Message for non-authenticated users */}
        {!user && (
          <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Please log in to rate this item and share your experience.
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Existing Rating Display */}
        {existingRating && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "h-4 w-4",
                      star <= existingRating.rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-gray-300 dark:text-gray-600"
                    )}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {getRatingText(existingRating.rating)}
              </span>
              {existingRating.isVerifiedPurchase && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Verified Purchase
                </span>
              )}
            </div>
            
            {existingRating.comment && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">
                "{existingRating.comment}"
              </p>
            )}
            
            <p className="text-xs text-emerald-500 dark:text-emerald-500 mt-2">
              Submitted on {new Date(existingRating.createdAt).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Rating Statistics */}
        {showFullStats && ratingStats && ratingStats.totalReviews > 0 && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {ratingStats.averageRating.toFixed(1)}
                </span>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                <Users className="h-4 w-4" />
                <span>{ratingStats.totalReviews} review{ratingStats.totalReviews !== 1 ? 's' : ''}</span>
              </div>
            </div>
            
            {/* Rating Distribution */}
            <div className="space-y-1">
              {[5, 4, 3, 2, 1].map((starCount) => {
                const count = ratingStats.ratingDistribution[starCount as keyof typeof ratingStats.ratingDistribution];
                const percentage = ratingStats.totalReviews > 0 ? (count / ratingStats.totalReviews) * 100 : 0;
                
                return (
                  <div key={starCount} className="flex items-center gap-2 text-xs">
                    <span className="w-4">{starCount}</span>
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-amber-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-gray-600 dark:text-gray-400">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MenuItemRating;