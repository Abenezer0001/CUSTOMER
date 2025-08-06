import React, { useState } from 'react';
import { Star, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import RatingSubmissionModal from './RatingSubmissionModal';
import { Rating } from '@/types';

interface OrderItem {
  id: string;
  menuItemId?: string;
  _id?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  modifiers?: any[];
  specialInstructions?: string;
}

interface OrderItemRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    _id: string;
    orderNumber?: string;
    items: OrderItem[];
    restaurantId?: string;
  };
  onAllRatingsSubmitted: () => void;
}

const OrderItemRatingModal: React.FC<OrderItemRatingModalProps> = ({
  isOpen,
  onClose,
  order,
  onAllRatingsSubmitted
}) => {
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratedItems, setRatedItems] = useState<Set<string>>(new Set());
  const [showItemSelection, setShowItemSelection] = useState(true);

  const currentItem = order.items[currentItemIndex];
  const totalItems = order.items.length;
  const allItemsRated = ratedItems.size === totalItems;

  const handleRateItem = (item: OrderItem) => {
    setCurrentItemIndex(order.items.findIndex(i => i.id === item.id || i._id === item._id));
    setShowItemSelection(false);
    setRatingModalOpen(true);
  };

  const handleRatingSubmitted = (rating: Rating) => {
    const itemId = currentItem.id || currentItem._id || currentItem.menuItemId;
    if (itemId) {
      setRatedItems(prev => new Set([...prev, itemId]));
    }
    
    setRatingModalOpen(false);
    toast.success(`Rating submitted for ${currentItem.name}!`);

    // Check if all items are rated
    if (ratedItems.size + 1 === totalItems) {
      // All items rated, close the entire modal
      setTimeout(() => {
        onAllRatingsSubmitted();
        onClose();
        toast.success('Thank you for rating all items in your order!');
      }, 500);
    } else {
      // Show item selection again
      setShowItemSelection(true);
    }
  };

  const navigateToItem = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
    } else if (direction === 'next' && currentItemIndex < totalItems - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    }
  };

  const getItemId = (item: OrderItem) => {
    return item.menuItemId || item._id || item.id;
  };

  const isItemRated = (item: OrderItem) => {
    const itemId = getItemId(item);
    return itemId ? ratedItems.has(itemId) : false;
  };

  const getRemainingItems = () => {
    return order.items.filter(item => !isItemRated(item));
  };

  return (
    <>
      <Dialog open={isOpen && !ratingModalOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              Rate Your Order Items
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Order {order.orderNumber || order._id?.slice(-6)} • {totalItems} items
            </p>
          </DialogHeader>

          {showItemSelection ? (
            <div className="space-y-4">
              {/* Progress indicator */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {ratedItems.size} of {totalItems} items rated
                </span>
                <Badge variant={allItemsRated ? "default" : "secondary"}>
                  {allItemsRated ? "Complete!" : `${totalItems - ratedItems.size} remaining`}
                </Badge>
              </div>

              {/* Enhanced progress bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                  style={{ width: `${(ratedItems.size / totalItems) * 100}%` }}
                />
              </div>

              {/* Items list */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {order.items.map((item, index) => {
                  const itemRated = isItemRated(item);
                  
                  return (
                    <Card 
                      key={item.id || item._id || index} 
                      className={cn(
                        "cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-102",
                        itemRated && "bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800 shadow-sm",
                        !itemRated && "hover:border-amber-300 dark:hover:border-amber-600"
                      )}
                      onClick={() => !itemRated && handleRateItem(item)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          {item.image && (
                            <img 
                              src={item.image} 
                              alt={item.name}
                              className="w-12 h-12 object-cover rounded-md flex-shrink-0"
                            />
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                {item.quantity}× {item.name}
                              </h3>
                              {itemRated && (
                                <div className="flex items-center gap-1 text-green-600">
                                  <Star className="h-4 w-4 fill-current" />
                                  <span className="text-sm">Rated</span>
                                </div>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground">
                              ${(item.price * item.quantity).toFixed(2)}
                            </p>
                            
                            {item.modifiers && item.modifiers.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {item.modifiers.map(mod => mod.name).join(', ')}
                              </p>
                            )}
                          </div>
                          
                          {!itemRated && (
                            <Button variant="outline" size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-none font-medium transition-all duration-200 transform hover:scale-105">
                              <Star className="w-3 h-3 mr-1" />
                              Rate
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  {allItemsRated ? 'Close' : 'Rate Later'}
                </Button>
                
                {!allItemsRated && getRemainingItems().length > 0 && (
                  <Button 
                    onClick={() => handleRateItem(getRemainingItems()[0])}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    Rate Next Item
                  </Button>
                )}
              </div>

              {allItemsRated && (
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-green-800 dark:text-green-200 font-medium">
                    🎉 Thank you for rating all items in your order!
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                    Your feedback helps other customers make great choices.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Item navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateToItem('prev')}
                  disabled={currentItemIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <span className="text-sm text-muted-foreground">
                  {currentItemIndex + 1} of {totalItems}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateToItem('next')}
                  disabled={currentItemIndex === totalItems - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Current item display */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {currentItem?.image && (
                      <img 
                        src={currentItem.image} 
                        alt={currentItem.name}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                    )}
                    <div>
                      <h3 className="font-medium text-lg">
                        {currentItem?.quantity}× {currentItem?.name}
                      </h3>
                      <p className="text-muted-foreground">
                        ${((currentItem?.price || 0) * (currentItem?.quantity || 1)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowItemSelection(true)}
                  className="flex-1"
                >
                  Back to Items
                </Button>
                <Button 
                  onClick={() => setRatingModalOpen(true)}
                  className="flex-1 bg-amber-500 hover:bg-amber-600"
                >
                  Rate This Item
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Individual item rating modal */}
      {currentItem && (
        <RatingSubmissionModal
          isOpen={ratingModalOpen}
          onClose={() => {
            setRatingModalOpen(false);
            setShowItemSelection(true);
          }}
          menuItemId={getItemId(currentItem) || ''}
          menuItemName={currentItem.name}
          menuItemImage={currentItem.image}
          restaurantId={order.restaurantId || localStorage.getItem('restaurantId') || ''}
          isVerifiedPurchase={true}
          onRatingSubmitted={handleRatingSubmitted}
        />
      )}
    </>
  );
};

export default OrderItemRatingModal;