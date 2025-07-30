
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Minus, ArrowLeft, ArrowRight, CheckCircle, Heart, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TippingModal } from '@/components/TippingModal';
import { RatingSubmissionModal } from '@/components/RatingSubmissionModal';
import { useTableInfo } from '@/context/TableContext';
import { createOrder } from '@/api/orderService';
import { groupOrderingService, GroupOrder, Participant } from '@/services/GroupOrderingService';

const Cart: React.FC = () => {
  const { items, removeItem, updateQuantity, clearCart, subtotal } = useCart();
  const { restaurantId, tableId } = useTableInfo();
  const navigate = useNavigate();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [isTippingModalOpen, setIsTippingModalOpen] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  
  // Group ordering state
  const [isGroupOrder, setIsGroupOrder] = useState(false);
  const [groupOrder, setGroupOrder] = useState<GroupOrder | null>(null);
  const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(null);
  const [isGroupLeader, setIsGroupLeader] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isJoiningGroup, setIsJoiningGroup] = useState(false);
  const [showGroupOptions, setShowGroupOptions] = useState(false);

  // Group ordering functions
  const handleCreateGroupOrder = async () => {
    if (!tableId || !restaurantId) {
      toast.error("Table or restaurant information not available");
      return;
    }

    try {
      setIsJoiningGroup(true);
      const result = await groupOrderingService.createGroupOrder({
        restaurantId,
        tableId,
        expirationMinutes: 60 // 1 hour expiration
      });

      setGroupOrder(result.groupOrder);
      setCurrentParticipantId(result.participantId);
      setIsGroupLeader(true);
      setIsGroupOrder(true);
      setShowGroupOptions(false);
      
      toast.success(`Group order created! Share code: ${result.groupOrder.joinCode}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create group order');
    } finally {
      setIsJoiningGroup(false);
    }
  };

  const handleJoinGroupOrder = async () => {
    if (!joinCode.trim() || !userName.trim() || !userEmail.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setIsJoiningGroup(true);
      const result = await groupOrderingService.joinGroupOrder({
        joinCode: joinCode.trim(),
        userName: userName.trim(),
        email: userEmail.trim()
      });

      setGroupOrder(result.groupOrder);
      setCurrentParticipantId(result.participantId);
      setIsGroupLeader(false);
      setIsGroupOrder(true);
      setShowGroupOptions(false);
      
      toast.success('Successfully joined the group order!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to join group order');
    } finally {
      setIsJoiningGroup(false);
    }
  };

  const handleLeaveGroupOrder = async () => {
    if (!groupOrder) return;

    try {
      await groupOrderingService.leaveGroupOrder(groupOrder._id);
      setGroupOrder(null);
      setCurrentParticipantId(null);
      setIsGroupLeader(false);
      setIsGroupOrder(false);
      toast.success('Left group order');
    } catch (error: any) {
      toast.error(error.message || 'Failed to leave group order');
    }
  };

  // Real checkout process using Stripe integration
  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    
    if (!restaurantId) {
      toast.error("Restaurant information not available");
      return;
    }
    
    // Get tableId from context or localStorage
    const currentTableId = tableId || localStorage.getItem('currentTableId') || localStorage.getItem('table_id');
    if (!currentTableId) {
      toast.error("Table information not available");
      return;
    }
    
    setIsCheckingOut(true);
    
    try {
      // Create order using real API
      const orderData = await createOrder(items, currentTableId, restaurantId, undefined, navigate);
      
      // Set the real order ID from API response
      setCurrentOrderId(orderData._id);
      setOrderPlaced(true);
      clearCart();
      
      toast.success("Order placed successfully!");
      
      // Show tipping modal after a short delay
      setTimeout(() => {
        setIsTippingModalOpen(true);
      }, 1500);
      
    } catch (error) {
      console.error('Checkout error:', error);
      
      // Handle authentication errors specifically
      if (error instanceof Error && error.message.includes('Authentication required')) {
        toast.error("Please log in to place your order");
        // The createOrder function will handle the redirect
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to place order. Please try again.");
      }
      
      setIsCheckingOut(false);
    }
  };

  const handleTipSubmitted = (tipAmount: number) => {
    setIsTippingModalOpen(false);
    toast.success(`Thank you! $${tipAmount.toFixed(2)} tip added.`);
    
    // Show rating modal after tipping
    setTimeout(() => {
      setIsRatingModalOpen(true);
    }, 500);
  };

  const handleTipSkipped = () => {
    setIsTippingModalOpen(false);
    // Show rating modal even if they skip tipping
    setTimeout(() => {
      setIsRatingModalOpen(true);
    }, 500);
  };

  const handleRatingSubmitted = () => {
    setIsRatingModalOpen(false);
    toast.success("Thank you for your feedback!");
    
    // Redirect to home after rating
    setTimeout(() => {
      navigate('/');
      toast.success("Thank you for your order!");
    }, 1000);
  };

  if (orderPlaced) {
    return (
      <div className="container mx-auto px-4 py-16 md:py-24 text-center max-w-md animate-fade-in">
        <CheckCircle className="mx-auto h-16 w-16 text-primary mb-6" />
        <h1 className="text-3xl font-medium mb-4">Order Confirmed!</h1>
        <p className="text-muted-foreground mb-8">
          Your order has been successfully placed. You'll be redirected to the homepage shortly.
        </p>
        <div className="animate-pulse bg-primary/10 h-2 w-full rounded-full overflow-hidden">
          <div className="bg-primary h-full animate-[progress_3s_ease-in-out]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 animate-fade-in">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)} 
        className="mb-8 pl-0 hover:pl-1 transition-all"
        disabled={isCheckingOut}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl md:text-4xl font-medium">Your Cart</h1>
        
        {/* Group ordering controls */}
        {!isGroupOrder && (
          <Button
            variant="outline"
            onClick={() => setShowGroupOptions(!showGroupOptions)}
            className="flex items-center gap-2"
            disabled={isJoiningGroup}
          >
            <Heart className="h-4 w-4" />
            Group Order
          </Button>
        )}
        
        {isGroupOrder && groupOrder && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              Group: {groupOrder.joinCode}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLeaveGroupOrder}
            >
              Leave
            </Button>
          </div>
        )}
      </div>

      {/* Group ordering options */}
      {showGroupOptions && !isGroupOrder && (
        <div className="mb-8 p-6 border rounded-lg bg-card">
          <h3 className="text-lg font-medium mb-4">Join or Create Group Order</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Create new group */}
            <div className="space-y-4">
              <h4 className="font-medium">Create New Group</h4>
              <p className="text-sm text-muted-foreground">
                Start a new group order and share the join code with others
              </p>
              <Button
                onClick={handleCreateGroupOrder}
                disabled={isJoiningGroup || !tableId || !restaurantId}
                className="w-full"
              >
                {isJoiningGroup ? 'Creating...' : 'Create Group Order'}
              </Button>
            </div>

            {/* Join existing group */}
            <div className="space-y-4">
              <h4 className="font-medium">Join Existing Group</h4>
              <div className="space-y-3">
                <Input
                  placeholder="Join Code (e.g., ABC123)"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="font-mono"
                />
                <Input
                  placeholder="Your Name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
                <Input
                  type="email"
                  placeholder="Your Email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                />
                <Button
                  onClick={handleJoinGroupOrder}
                  disabled={isJoiningGroup || !joinCode.trim() || !userName.trim() || !userEmail.trim()}
                  className="w-full"
                >
                  {isJoiningGroup ? 'Joining...' : 'Join Group'}
                </Button>
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            onClick={() => setShowGroupOptions(false)}
            className="mt-4 w-full"
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Group order participants */}
      {isGroupOrder && groupOrder && (
        <div className="mb-8 p-6 border rounded-lg bg-card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Group Members ({groupOrder.participants.length})</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Join Code:</span>
              <code className="px-2 py-1 bg-muted rounded font-mono">{groupOrder.joinCode}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(groupOrder.joinCode);
                  toast.success('Join code copied!');
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupOrder.participants.map((participant) => (
              <div
                key={participant._id}
                className={cn(
                  "p-4 rounded-lg border",
                  participant._id === currentParticipantId ? "bg-primary/5 border-primary/20" : "bg-muted/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {participant.userName}
                      {participant.isLeader && <Badge variant="outline">Leader</Badge>}
                      {participant._id === currentParticipantId && <Badge variant="secondary">You</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">{participant.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${participant.totalAmount.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">{participant.items.length} items</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Total Group Order: <span className="font-semibold">${groupOrder.totalAmount.toFixed(2)}</span>
            </div>
            {isGroupLeader && (
              <Button
                variant="outline"
                onClick={() => {
                  // TODO: Implement lock order functionality
                  toast.info('Order locking feature coming soon');
                }}
              >
                Lock Order
              </Button>
            )}
          </div>
        </div>
      )}
      
      {items.length === 0 ? (
        <div className="text-center py-16 max-w-md mx-auto">
          <h2 className="text-2xl font-medium mb-4">Your cart is empty</h2>
          <p className="text-muted-foreground mb-8">
            Looks like you haven't added any items to your cart yet.
          </p>
          <Button asChild size="lg" className="rounded-full px-8">
            <Link to="/menu">Browse Menu</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div 
                key={item.id} 
                className="flex items-stretch border border-border/50 rounded-xl overflow-hidden bg-card"
              >
                <img 
                  src={item.image} 
                  alt={item.name}
                  className="w-24 h-24 object-cover"
                />
                
                <div className="flex-1 p-4 flex flex-col">
                  <div className="flex justify-between">
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    ${item.price.toFixed(2)} each
                  </p>
                  
                  {item.specialInstructions && (
                    <p className="text-sm text-muted-foreground mb-2 italic">
                      "{item.specialInstructions}"
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center border border-border rounded-full overflow-hidden">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-none h-8 w-8 p-0"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={isCheckingOut}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      
                      <span className="flex-1 text-center text-sm min-w-[30px]">
                        {item.quantity}
                      </span>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-none h-8 w-8 p-0"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={isCheckingOut}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                      disabled={isCheckingOut}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="lg:col-span-1">
            <div className="bg-card border border-border/50 rounded-xl p-6 sticky top-24">
              <h3 className="text-xl font-medium mb-4">Order Summary</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span>${(3.99).toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${(subtotal * 0.08).toFixed(2)}</span>
                </div>
                
                <div className="border-t border-border pt-3 flex justify-between font-medium">
                  <span>Total</span>
                  <span>${(subtotal + 3.99 + subtotal * 0.08).toFixed(2)}</span>
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="promoCode" className="block text-sm font-medium mb-2">
                  Promo Code
                </label>
                <div className="flex items-center gap-2">
                  <Input 
                    id="promoCode" 
                    placeholder="Enter code" 
                    className="flex-1"
                    disabled={isCheckingOut}
                  />
                  <Button variant="outline" disabled={isCheckingOut}>Apply</Button>
                </div>
              </div>
              
              <Button 
                className="w-full rounded-full" 
                size="lg"
                onClick={handleCheckout}
                disabled={isCheckingOut || items.length === 0}
              >
                {isCheckingOut ? (
                  <div className="flex items-center">
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full"></div>
                    Processing...
                  </div>
                ) : (
                  <>
                    Checkout <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tipping Modal */}
      {currentOrderId && restaurantId && (
        <TippingModal
          isOpen={isTippingModalOpen}
          onClose={handleTipSkipped}
          orderId={currentOrderId}
          restaurantId={restaurantId}
          orderAmount={subtotal + 3.99 + subtotal * 0.08} // Total order amount
          onTipSubmitted={handleTipSubmitted}
        />
      )}

      {/* Rating Modal */}
      {currentOrderId && restaurantId && (
        <RatingSubmissionModal
          isOpen={isRatingModalOpen}
          onClose={() => {
            setIsRatingModalOpen(false);
            // Redirect to home if they skip rating
            setTimeout(() => {
              navigate('/');
              toast.success("Thank you for your order!");
            }, 500);
          }}
          orderId={currentOrderId}
          restaurantId={restaurantId}
          onRatingSubmitted={handleRatingSubmitted}
        />
      )}
    </div>
  );
};

export default Cart;
