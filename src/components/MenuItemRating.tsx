import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, TrendingUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrdersContext';
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
  const { user, isAuthenticated } = useAuth();
  const { orders: orderHistory, refreshOrders } = useOrders();
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [review, setReview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [existingRating, setExistingRating] = useState<Rating | null>(null);
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [hasOrderedItem, setHasOrderedItem] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Listen for order-related events to detect when orders are available
  useEffect(() => {
    const handleOrdersAvailable = (event: any) => {
      console.log('🔄 Rating: Received orders-available event:', event.detail);
      // Force re-check hasOrdered state
      if (event.detail?.hasOrders) {
        console.log('🔄 Rating: Orders detected via event, allowing rating');
        setHasOrderedItem(true);
      }
    };

    window.addEventListener('orders-available', handleOrdersAvailable);
    return () => window.removeEventListener('orders-available', handleOrdersAvailable);
  }, []);

  // Initialize component data
  useEffect(() => {
    const initializeRatingData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Check if user has ordered this item
        if (user) {
          console.log('🔍 Checking if user has ordered item:', menuItemId);
          console.log('🔍 User authenticated:', !!user);
          console.log('🔍 Order history length:', orderHistory.length);
          console.log('🔍 Available order history:', orderHistory.map(o => ({
            id: o.id || o._id,
            orderNumber: o.orderNumber,
            items: o.items?.map(item => ({
              id: item.id || item._id,
              menuItemId: item.menuItemId,
              name: item.name
            }))
          })));
          
          // If no order history, try to fetch directly from localStorage or check if orders are still loading
          let hasOrdered = false;
          
          if (orderHistory.length > 0) {
            hasOrdered = orderHistory.some(order => {
              if (!order.items || !Array.isArray(order.items)) {
                console.log('🔍 Order has no items array:', order.id || order._id);
                return false;
              }
              
              return order.items.some(item => {
                const itemId = item.id || item._id;
                const itemMenuItemId = item.menuItemId;
                const itemName = item.name;
                
                console.log('🔍 Checking item for hasOrdered:', {
                  itemId,
                  itemMenuItemId,
                  itemName,
                  targetMenuItemId: menuItemId,
                  idMatches: itemId === menuItemId || itemMenuItemId === menuItemId,
                  nameMatches: itemName && itemName.toLowerCase().includes('margherita')
                });
                
                // Check multiple ways to match:
                // 1. Direct ID matches
                if (itemId === menuItemId || itemMenuItemId === menuItemId) {
                  return true;
                }
                
                // 2. Name-based matching as fallback (for cases where IDs don't align)
                if (itemName && menuItemName) {
                  const normalizedItemName = itemName.toLowerCase().replace(/[^a-z0-9]/g, '');
                  const normalizedMenuName = menuItemName.toLowerCase().replace(/[^a-z0-9]/g, '');
                  
                  console.log('🔍 Name comparison:', {
                    normalizedItemName,
                    normalizedMenuName,
                    menuItemNameProp: menuItemName
                  });
                  
                  if (normalizedItemName.includes(normalizedMenuName.substring(0, 10)) || 
                      normalizedMenuName.includes(normalizedItemName.substring(0, 10))) {
                    console.log('🔍 Found match by name similarity');
                    return true;
                  }
                }
                
                return false;
              });
            });
          } else {
            // Fallback: Check if we can find any recent orders in localStorage
            try {
              const storedOrders = localStorage.getItem('recent_orders');
              if (storedOrders) {
                const recentOrders = JSON.parse(storedOrders);
                hasOrdered = recentOrders.some((order: any) => 
                  order.items?.some((item: any) => 
                    item.id === menuItemId || item.menuItemId === menuItemId
                  )
                );
                console.log('🔍 Checked localStorage for recent orders, found:', hasOrdered);
              }
            } catch (e) {
              console.log('🔍 No recent orders in localStorage');
            }
            
            // Try to refresh orders if user is authenticated but no order history found
            if (!hasOrdered && user && user.id && isAuthenticated) {
              console.log('🔍 User is authenticated but no order history found, trying to refresh orders...');
              try {
                if (refreshOrders && typeof refreshOrders === 'function') {
                  await refreshOrders();
                  console.log('🔍 Orders refreshed, will recheck on next render cycle');
                }
              } catch (refreshError) {
                console.log('🔍 Failed to refresh orders:', refreshError);
              }
              
              // Temporary debug: Check if we should allow rating based on recent activity
              const recentOrderTime = localStorage.getItem('last_order_time');
              const now = Date.now();
              const fiveMinutesAgo = now - (5 * 60 * 1000);
              
              if (recentOrderTime && parseInt(recentOrderTime) > fiveMinutesAgo) {
                console.log('🔍 Recent order detected, allowing rating as fallback');
                hasOrdered = true;
              } else {
                console.log('🔍 No verified order found and no recent activity, user cannot rate this item');
              }
            }
          }
          
          console.log('🔍 hasOrderedItem result:', hasOrdered);
          setHasOrderedItem(hasOrdered);

          // If user has ordered, check for existing rating using the correct endpoint
          if (hasOrdered) {
            try {
              const userRating = await ratingService.getUserRatingForItem(menuItemId);
              if (userRating) {
                console.log('Found existing rating for user:', userRating);
                setExistingRating(userRating);
                setRating(userRating.rating);
                setReview(userRating.comment || '');
              } else {
                console.log('No existing rating found - user can submit new rating');
              }
            } catch (error: any) {
              // Handle specific error cases
              if (error.message?.includes('log in')) {
                console.log('Authentication required to check existing rating');
              } else {
                console.log('No existing rating found for user');
              }
            }
          }
        }

        // Always fetch rating stats for display
        if (showFullStats) {
          try {
            const stats = await ratingService.getMenuItemRatingStats(menuItemId);
            setRatingStats(stats);
            onStatsUpdate?.(stats);
          } catch (error: any) {
            // Handle authentication errors gracefully
            if (error.message?.includes('log in')) {
              console.log('Authentication required for rating stats, using empty stats');
            } else {
              console.error('Failed to fetch rating stats:', error);
            }
            
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
  }, [user, orderHistory, menuItemId, showFullStats, onStatsUpdate, isAuthenticated, refreshOrders]);

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
        // Submit new rating - need to find orderId from order history
        console.log('🔍 Looking for order with menuItemId:', menuItemId);
        console.log('🔍 Available orders:', orderHistory.map(o => ({
          id: o.id || o._id,
          orderNumber: o.orderNumber,
          items: o.items?.map(item => ({
            id: item.id || item._id,
            menuItemId: item.menuItemId,
            name: item.name
          }))
        })));
        
        const orderWithItem = orderHistory.find(order => {
          if (!order.items || !Array.isArray(order.items)) {
            console.log('🔍 Order has no items array:', order.id || order._id);
            return false;
          }
          
          return order.items.some(item => {
            const itemId = item.id || item._id;
            const itemMenuItemId = item.menuItemId;
            
            console.log('🔍 Checking item:', {
              itemId,
              itemMenuItemId,
              targetMenuItemId: menuItemId,
              matches: itemId === menuItemId || itemMenuItemId === menuItemId
            });
            
            // Check both item.id and item.menuItemId
            return itemId === menuItemId || itemMenuItemId === menuItemId;
          });
        });
        
        console.log('🔍 Found order with item:', orderWithItem?.id || orderWithItem?._id);
        
        if (!orderWithItem) {
          throw new Error('Order not found for this menu item. You can only rate items you have ordered.');
        }
        
        const submissionData: RatingSubmission = {
          orderId: orderWithItem.id || orderWithItem._id,
          menuItemId,
          rating,
          comment: review.trim() || 'No comment provided'  // Backend requires comment, so provide default
        };
        
        console.log('🔍 Rating submission data:', submissionData);
        
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