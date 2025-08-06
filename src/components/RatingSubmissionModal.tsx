import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import ratingService from '@/api/ratingService';
import { Rating, RatingSubmission, RatingUpdate } from '@/types';

interface RatingSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItemId: string;
  menuItemName: string;
  menuItemImage?: string;
  restaurantId: string;
  existingRating?: Rating | null;
  isVerifiedPurchase?: boolean;
  onRatingSubmitted: (rating: Rating) => void;
}

const RatingSubmissionModal: React.FC<RatingSubmissionModalProps> = ({
  isOpen,
  onClose,
  menuItemId,
  menuItemName,
  menuItemImage,
  restaurantId,
  existingRating,
  isVerifiedPurchase = false,
  onRatingSubmitted
}) => {
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with existing rating data
  useEffect(() => {
    if (existingRating) {
      setRating(existingRating.rating);
      setComment(existingRating.comment || '');
    } else {
      setRating(0);
      setComment('');
    }
    setError(null);
  }, [existingRating, isOpen]);

  const handleStarClick = (starValue: number) => {
    setRating(starValue);
    setError(null);
  };

  const handleStarHover = (starValue: number) => {
    setHoveredRating(starValue);
  };

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return 'Select a rating';
    }
  };

  const getRatingColor = (rating: number) => {
    switch (rating) {
      case 1: return 'text-red-600 dark:text-red-400';
      case 2: return 'text-orange-600 dark:text-orange-400';
      case 3: return 'text-yellow-600 dark:text-yellow-400';
      case 4: return 'text-blue-600 dark:text-blue-400';
      case 5: return 'text-emerald-600 dark:text-emerald-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Please select a rating');
      toast.error('Please select a rating');
      return;
    }

    if (!user) {
      setError('Please log in to submit a rating');
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
          comment: comment.trim() || undefined
        };
        
        result = await ratingService.updateRating(existingRating._id, updateData);
        toast.success('Rating updated successfully!');
      } else {
        // Submit new rating
        const submissionData: RatingSubmission = {
          menuItemId,
          rating,
          comment: comment.trim() || undefined
        };
        
        result = await ratingService.submitRating(submissionData);
        toast.success('Thank you for your rating!');
      }

      // Call callback and close modal
      onRatingSubmitted(result);
      onClose();
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      const errorMessage = error.message || 'Failed to submit rating. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      // Reset form if not editing existing rating
      if (!existingRating) {
        setRating(0);
        setComment('');
      }
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            {existingRating ? 'Update Your Rating' : 'Rate This Item'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Menu Item Info with enhanced styling */}
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            {menuItemImage && (
              <img 
                src={menuItemImage} 
                alt={menuItemName}
                className="w-14 h-14 object-cover rounded-lg shadow-sm ring-2 ring-white dark:ring-gray-800"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                {menuItemName}
              </h3>
              {isVerifiedPurchase && (
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 mt-1">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified Purchase
                </Badge>
              )}
            </div>
          </div>

          {/* Star Rating */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Your Rating *
            </label>
            
            <div className="flex items-center gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-2 rounded-full transition-all duration-200 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:scale-110 transform active:scale-95"
                  onClick={() => handleStarClick(star)}
                  onMouseEnter={() => handleStarHover(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  disabled={isSubmitting}
                >
                  <Star
                    className={cn(
                      "h-10 w-10 transition-all duration-300 ease-out",
                      (hoveredRating >= star || (!hoveredRating && rating >= star))
                        ? "fill-amber-400 text-amber-400 drop-shadow-sm scale-110"
                        : "text-gray-300 dark:text-gray-600 hover:text-amber-300"
                    )}
                  />
                </button>
              ))}
            </div>
            
            {(rating > 0 || hoveredRating > 0) && (
              <p className={cn("text-sm font-medium", getRatingColor(hoveredRating || rating))}>
                {getRatingText(hoveredRating || rating)}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Your Review (Optional)
            </label>
            
            <Textarea
              placeholder={`Share your thoughts about ${menuItemName}...`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="resize-none min-h-[100px]"
              disabled={isSubmitting}
              maxLength={500}
            />
            
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Help others by sharing your experience
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {comment.length}/500
              </p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Action Buttons with enhanced styling */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1 border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 transition-all duration-200"
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={isSubmitting || rating === 0}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 dark:from-emerald-600 dark:to-teal-600 dark:hover:from-emerald-700 dark:hover:to-teal-700 text-white font-semibold py-3 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:transform-none disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {existingRating ? 'Updating...' : 'Submitting...'}
                </div>
              ) : (
                <>
                  <Star className="w-4 h-4 mr-2" />
                  {existingRating ? 'Update Rating' : 'Submit Rating'}
                </>
              )}
            </Button>
          </div>

          {/* Helper Text */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
            Your rating helps other customers make informed decisions
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RatingSubmissionModal;