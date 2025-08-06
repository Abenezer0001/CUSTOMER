import React, { useState, useEffect } from 'react';
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  CheckCircle,
  MessageSquare,
  Calendar,
  TrendingUp,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import ratingService from '@/api/ratingService';
import { Rating, RatingFilters, PaginatedRatings } from '@/types';

interface ReviewsListProps {
  menuItemId: string;
  menuItemName: string;
  className?: string;
  maxHeight?: string;
  showFilters?: boolean;
  onReviewUpdate?: (review: Rating) => void;
}

const ReviewsList: React.FC<ReviewsListProps> = ({
  menuItemId,
  menuItemName,
  className,
  maxHeight = "400px",
  showFilters = true,
  onReviewUpdate
}) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Rating[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [votingStates, setVotingStates] = useState<Record<string, boolean>>({});
  
  // Filter states
  const [filters, setFilters] = useState<RatingFilters>({
    sortBy: 'recent',
    page: 1,
    limit: 10
  });

  const fetchReviews = async (page: number = 1, newFilters?: Partial<RatingFilters>) => {
    setLoading(true);
    setError(null);
    
    try {
      const requestFilters: RatingFilters = {
        ...filters,
        ...newFilters,
        page,
        limit: 10
      };
      
      const result: PaginatedRatings = await ratingService.getMenuItemRatings(
        menuItemId,
        requestFilters
      );
      
      setReviews(result.ratings);
      setCurrentPage(result.currentPage);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
      
      // Update filters state
      setFilters(requestFilters);
    } catch (error: any) {
      console.error('Error fetching reviews:', error);
      setError(error.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchReviews(1);
  }, [menuItemId]);

  const handleFilterChange = (key: keyof RatingFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchReviews(1, newFilters);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && !loading) {
      fetchReviews(newPage);
    }
  };

  const handleHelpfulVote = async (ratingId: string, helpful: boolean) => {
    if (!user) {
      toast.error('Please log in to vote on reviews');
      return;
    }

    // Prevent double-clicking
    if (votingStates[ratingId]) {
      return;
    }

    setVotingStates(prev => ({ ...prev, [ratingId]: true }));

    try {
      const result = await ratingService.markReviewHelpful(ratingId, helpful);
      
      // Update the review in local state
      setReviews(prevReviews => 
        prevReviews.map(review => 
          review._id === ratingId 
            ? {
                ...review,
                helpfulCount: result.helpfulCount,
                unhelpfulCount: result.unhelpfulCount
              }
            : review
        )
      );

      // Call callback if provided
      const updatedReview = reviews.find(r => r._id === ratingId);
      if (updatedReview && onReviewUpdate) {
        onReviewUpdate({
          ...updatedReview,
          helpfulCount: result.helpfulCount,
          unhelpfulCount: result.unhelpfulCount
        });
      }

      toast.success(`Review marked as ${helpful ? 'helpful' : 'not helpful'}`);
    } catch (error: any) {
      console.error('Error voting on review:', error);
      toast.error(error.message || 'Failed to vote on review');
    } finally {
      setVotingStates(prev => ({ ...prev, [ratingId]: false }));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString();
  };

  const getUserInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'U';
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const renderStars = (rating: number, size: 'sm' | 'md' = 'sm') => {
    const starSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
    
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              starSize,
              star <= rating
                ? "fill-amber-400 text-amber-400"
                : "text-gray-300 dark:text-gray-600"
            )}
          />
        ))}
      </div>
    );
  };

  const renderSkeletonReviews = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-4">
          <div className="flex gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Skeleton key={star} className="w-4 h-4 rounded" />
                  ))}
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  if (loading && reviews.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        {showFilters && (
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        )}
        {renderSkeletonReviews()}
      </div>
    );
  }

  if (error) {
    return (
      <Card className={cn("p-6 text-center", className)}>
        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-2" />
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <Button 
          variant="outline" 
          onClick={() => fetchReviews(currentPage)}
          className="mt-2"
        >
          Try Again
        </Button>
      </Card>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card className={cn("p-6 text-center", className)}>
        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-2" />
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
          No reviews yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Be the first to review {menuItemName}!
        </p>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <Select
            value={filters.sortBy}
            onValueChange={(value) => handleFilterChange('sortBy', value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Recent
                </div>
              </SelectItem>
              <SelectItem value="helpful">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Helpful
                </div>
              </SelectItem>
              <SelectItem value="rating_high">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Highest Rated
                </div>
              </SelectItem>
              <SelectItem value="rating_low">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Lowest Rated
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.rating?.toString() || 'all'}
            onValueChange={(value) => 
              handleFilterChange('rating', value === 'all' ? undefined : parseInt(value))
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All ratings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ratings</SelectItem>
              {[5, 4, 3, 2, 1].map((rating) => (
                <SelectItem key={rating} value={rating.toString()}>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {rating}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFilterChange('verifiedOnly', !filters.verifiedOnly)}
            className={cn(
              filters.verifiedOnly && "bg-green-50 border-green-200 text-green-700"
            )}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Verified Only
          </Button>

          <div className="text-sm text-gray-600 dark:text-gray-400 ml-auto">
            {totalCount} review{totalCount !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div 
        className="space-y-3 overflow-y-auto" 
        style={{ maxHeight }}
      >
        {reviews.map((review, index) => (
          <Card 
            key={review._id} 
            className="p-4 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 dark:hover:from-gray-900/50 dark:hover:to-blue-900/20 transition-all duration-300 transform hover:scale-102 hover:shadow-md border border-gray-200 dark:border-gray-700"
            style={{
              animationDelay: `${index * 100}ms`,
              animation: 'fadeInUp 0.5s ease-out forwards'
            }}
          >
            <div className="flex gap-3">
              {/* User Avatar */}
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarImage src={review.user?.avatar} />
                <AvatarFallback>
                  {getUserInitials(review.user?.firstName, review.user?.lastName)}
                </AvatarFallback>
              </Avatar>

              {/* Review Content */}
              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {review.user?.firstName} {review.user?.lastName}
                  </span>
                  
                  {review.isVerifiedPurchase && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                    {formatDate(review.createdAt)}
                  </span>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-2">
                  {renderStars(review.rating)}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {review.rating}/5
                  </span>
                </div>

                {/* Comment */}
                {review.comment && (
                  <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-3">
                    {review.comment}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleHelpfulVote(review._id, true)}
                    disabled={votingStates[review._id]}
                    className="h-8 px-3 text-xs hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 transition-all duration-200 transform hover:scale-105"
                  >
                    <ThumbsUp className="h-3 w-3 mr-1" />
                    {review.helpfulCount > 0 && review.helpfulCount}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleHelpfulVote(review._id, false)}
                    disabled={votingStates[review._id]}
                    className="h-8 px-3 text-xs hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all duration-200 transform hover:scale-105"
                  >
                    <ThumbsDown className="h-3 w-3 mr-1" />
                    {review.unhelpfulCount > 0 && review.unhelpfulCount}
                  </Button>

                  {/* User's own review options */}
                  {user && user.id === review.userId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-auto">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {/* Edit review logic */}}>
                          Edit Review
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {/* Delete review logic */}}
                          className="text-red-600"
                        >
                          Delete Review
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </p>
          
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Loading indicator for pagination */}
      {loading && reviews.length > 0 && (
        <div className="flex justify-center py-2">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default ReviewsList;