import React, { useState, useEffect, useRef } from 'react';
import { Users, Copy, Clock, ShoppingCart, Crown, UserPlus, X, Share, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  groupOrderingService, 
  GroupOrder, 
  Participant, 
  OrderItem,
  GroupOrderWebSocketEvents
} from '@/services/GroupOrderingService';

interface GroupOrderingModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  tableId: string;
  initialJoinCode?: string;
  onOrderPlaced?: (orderId: string) => void;
}

const GroupOrderingModal: React.FC<GroupOrderingModalProps> = ({
  isOpen,
  onClose,
  restaurantId,
  tableId,
  initialJoinCode,
  onOrderPlaced
}) => {
  // Debug logging
  React.useEffect(() => {
    console.log('GroupOrderingModal props:', { isOpen, restaurantId, tableId, initialJoinCode });
  }, [isOpen, restaurantId, tableId, initialJoinCode]);
  const [loading, setLoading] = useState(false);
  const [groupOrder, setGroupOrder] = useState<GroupOrder | null>(null);
  const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [joinCode, setJoinCode] = useState(initialJoinCode || '');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [mode, setMode] = useState<'join' | 'create' | 'active'>('join');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket event handlers
  const wsEvents: Partial<GroupOrderWebSocketEvents> = {
    participantJoined: (participant: Participant) => {
      setGroupOrder(prev => {
        if (!prev) return null;
        return {
          ...prev,
          participants: [...prev.participants, participant]
        };
      });
      toast.success(`${participant.userName} joined the group order!`);
    },
    
    participantLeft: (participantId: string) => {
      setGroupOrder(prev => {
        if (!prev) return null;
        const participant = prev.participants.find(p => p._id === participantId);
        if (participant) {
          toast.info(`${participant.userName} left the group order`);
        }
        return {
          ...prev,
          participants: prev.participants.filter(p => p._id !== participantId)
        };
      });
    },
    
    itemsAdded: (participantId: string, items: OrderItem[]) => {
      setGroupOrder(prev => {
        if (!prev) return null;
        const updatedParticipants = prev.participants.map(p => {
          if (p._id === participantId) {
            return { ...p, items: [...p.items, ...items] };
          }
          return p;
        });
        return { ...prev, participants: updatedParticipants };
      });
    },
    
    orderLocked: () => {
      setGroupOrder(prev => prev ? { ...prev, status: 'locked' } : null);
      toast.info('Group order has been locked by the leader');
    },
    
    orderPlaced: (orderId: string) => {
      toast.success('Group order has been placed!');
      onOrderPlaced?.(orderId);
      onClose();
    },
    
    orderCancelled: (reason: string) => {
      toast.error(`Group order cancelled: ${reason}`);
      onClose();
    }
  };

  // Initialize and connect to WebSocket when active
  useEffect(() => {
    if (groupOrder && mode === 'active') {
      groupOrderingService.connectToGroupOrder(groupOrder._id, wsEvents);
      return () => {
        groupOrderingService.disconnectFromGroupOrder();
      };
    }
  }, [groupOrder?._id, mode]);

  // Timer for expiration countdown
  useEffect(() => {
    if (groupOrder && groupOrder.expiresAt) {
      const updateTimer = () => {
        const now = new Date().getTime();
        const expiresAt = new Date(groupOrder.expiresAt).getTime();
        const remaining = Math.max(0, expiresAt - now);
        setTimeRemaining(remaining);
      };

      updateTimer();
      intervalRef.current = setInterval(updateTimer, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [groupOrder?.expiresAt]);

  // Initialize with join code if provided
  useEffect(() => {
    if (isOpen && initialJoinCode) {
      setJoinCode(initialJoinCode);
      handleValidateJoinCode(initialJoinCode);
    }
  }, [isOpen, initialJoinCode]);

  const handleValidateJoinCode = async (code: string) => {
    if (!code.trim()) return;

    setLoading(true);
    try {
      const validation = await groupOrderingService.validateJoinCode(code);
      if (validation.isValid) {
        setMode('join');
      } else {
        toast.error(validation.error || 'Invalid join code');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to validate join code');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroupOrder = async () => {
    setIsSubmitting(true);
    try {
      const result = await groupOrderingService.createGroupOrder({
        restaurantId,
        tableId,
        expirationMinutes: 30 // 30 minute default
      });

      setGroupOrder(result.groupOrder);
      setCurrentParticipantId(result.participantId);
      setIsLeader(true);
      setMode('active');
      toast.success('Group order created! Share the join code with others.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create group order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinGroupOrder = async () => {
    if (!joinCode.trim() || !userName.trim() || !userEmail.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await groupOrderingService.joinGroupOrder({
        joinCode,
        userName,
        email: userEmail
      });

      setGroupOrder(result.groupOrder);
      setCurrentParticipantId(result.participantId);
      setIsLeader(false);
      setMode('active');
      toast.success('Successfully joined the group order!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to join group order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyJoinCode = () => {
    if (groupOrder?.joinCode) {
      navigator.clipboard.writeText(groupOrder.joinCode);
      toast.success('Join code copied to clipboard!');
    }
  };

  const handleLockOrder = async () => {
    if (!groupOrder || !isLeader) return;

    setIsSubmitting(true);
    try {
      await groupOrderingService.lockGroupOrder(groupOrder._id);
      toast.success('Group order locked! Ready to place the order.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to lock group order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlaceOrder = async () => {
    console.log('🚀 Place Order button clicked!');
    console.log('Group Order:', groupOrder);
    console.log('Is Leader:', isLeader);
    console.log('Current Participant ID:', currentParticipantId);
    console.log('Group Leader ID:', groupOrder?.groupLeaderId);
    
    if (!groupOrder) {
      console.error('❌ No group order found');
      toast.error('No group order found');
      return;
    }
    
    if (!isLeader) {
      console.error('❌ User is not the leader');
      toast.error('Only the group leader can place the order');
      return;
    }

    console.log('✅ Starting order placement...');
    setIsSubmitting(true);
    try {
      console.log('📞 Calling placeFinalOrder with ID:', groupOrder._id);
      const result = await groupOrderingService.placeFinalOrder(groupOrder._id);
      console.log('📥 Place order result:', result);
      
      if (result.success) {
        console.log('✅ Order placed successfully!', result.orderId);
        toast.success('Group order placed successfully!');
        onOrderPlaced?.(result.orderId);
        onClose();
      } else {
        console.error('❌ Order placement failed:', result);
        toast.error('Failed to place order');
      }
    } catch (error: any) {
      console.error('❌ Error placing order:', error);
      toast.error(error.message || 'Failed to place group order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimeRemaining = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getCurrentParticipant = (): Participant | undefined => {
    return groupOrder?.participants.find(p => p._id === currentParticipantId);
  };

  const getTotalItems = (): number => {
    return groupOrder?.participants.reduce((total, participant) => {
      return total + participant.items.reduce((itemTotal, item) => itemTotal + item.quantity, 0);
    }, 0) || 0;
  };

  // Join/Create Mode
  if (mode === 'join' || mode === 'create') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Group Ordering
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Join existing group */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Join a Group Order</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="joinCode">Join Code</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="joinCode"
                      placeholder="ABC-123"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      onClick={() => handleValidateJoinCode(joinCode)}
                      disabled={!joinCode.trim() || loading}
                    >
                      Check
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="userName">Your Name</Label>
                    <Input
                      id="userName"
                      placeholder="John Doe"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="userEmail">Email</Label>
                    <Input
                      id="userEmail"
                      type="email"
                      placeholder="john@example.com"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleJoinGroupOrder}
                  disabled={!joinCode.trim() || !userName.trim() || !userEmail.trim() || isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? 'Joining...' : 'Join Group Order'}
                </Button>
              </CardContent>
            </Card>

            {/* Create new group */}
            <div className="text-center">
              <div className="flex items-center gap-4">
                <Separator className="flex-1" />
                <span className="text-sm text-muted-foreground">OR</span>
                <Separator className="flex-1" />
              </div>
              <Button
                variant="outline"
                onClick={handleCreateGroupOrder}
                disabled={isSubmitting}
                className="mt-4"
              >
                {isSubmitting ? 'Creating...' : 'Start New Group Order'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Active Group Order Mode
  if (loading || !groupOrder) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Loading Group Order...</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Group Order
              {isLeader && <Crown className="h-4 w-4 text-yellow-500" />}
            </div>
            <Badge variant={groupOrder.status === 'active' ? 'default' : 'secondary'}>
              {groupOrder.status.toUpperCase()}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Group Info & Timer */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {groupOrderingService.formatJoinCode(groupOrder.joinCode)}
                  </div>
                  <div className="text-sm text-muted-foreground">Join Code</div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyJoinCode}
                    className="mt-1"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold">{groupOrder.participants.length}</div>
                  <div className="text-sm text-muted-foreground">Members</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold">{getTotalItems()}</div>
                  <div className="text-sm text-muted-foreground">Items</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">
                    {formatTimeRemaining(timeRemaining)}
                  </div>
                  <div className="text-sm text-muted-foreground">Time Left</div>
                </div>
              </div>

              {timeRemaining > 0 && (
                <Progress
                  value={(timeRemaining / (30 * 60 * 1000)) * 100}
                  className="mt-4"
                />
              )}
            </CardContent>
          </Card>

          {/* Participants */}
          <Card>
            <CardHeader>
              <CardTitle>Group Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {groupOrder.participants.map((participant) => (
                  <div
                    key={participant._id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border",
                      participant._id === currentParticipantId ? "bg-primary/5 border-primary/20" : "bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {participant.userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{participant.userName}</span>
                          {participant.isLeader && <Crown className="h-4 w-4 text-yellow-500" />}
                          {participant._id === currentParticipantId && (
                            <Badge variant="outline">You</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{participant.email}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(participant.totalAmount)}</div>
                      <div className="text-sm text-muted-foreground">
                        {participant.items.length} item{participant.items.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          {groupOrder.finalOrder.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {groupOrder.finalOrder.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span>
                        {item.quantity}x {item.menuItemName}
                        {item.customizations.length > 0 && (
                          <span className="text-sm text-muted-foreground ml-2">
                            ({item.customizations.join(', ')})
                          </span>
                        )}
                      </span>
                      <span>{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(groupOrder.totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {/* Debug: Button rendering conditions */}
            {console.log('🔍 Button Debug:', {
              isLeader,
              groupOrderStatus: groupOrder.status,
              totalItems: getTotalItems(),
              isSubmitting,
              participantCount: groupOrder.participants.length,
              showPlaceButton: (groupOrder.status === 'locked' || groupOrder.status === 'active'),
              buttonDisabled: (getTotalItems() === 0 || isSubmitting)
            })}
            
            {isLeader ? (
              <>
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Close
                </Button>
                {groupOrder.status === 'active' && (
                  <Button
                    onClick={handleLockOrder}
                    disabled={groupOrder.participants.length <= 1 || isSubmitting}
                    className="flex-1"
                    variant="outline"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Locking...' : 'Lock Order'}
                  </Button>
                )}
                {(groupOrder.status === 'locked' || groupOrder.status === 'active') && (
                  <Button
                    onClick={(e) => {
                      console.log('🚀 Button clicked! Event:', e);
                      console.log('🔍 Pre-click state:', { isLeader, groupOrder: groupOrder.status, totalItems: getTotalItems() });
                      handlePlaceOrder();
                    }}
                    disabled={getTotalItems() === 0 || isSubmitting}
                    className="flex-1"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Placing...' : 'Place Order'}
                  </Button>
                )}
              </>
            ) : (
              <Button onClick={onClose} className="flex-1">
                Continue Shopping
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GroupOrderingModal;
