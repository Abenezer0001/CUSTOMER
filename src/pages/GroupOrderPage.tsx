import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useGroupOrder } from '@/context/GroupOrderContext';
import { groupOrderingService, GroupOrder, Participant } from '@/services/GroupOrderingService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Users, 
  ShoppingCart, 
  Copy, 
  UserPlus, 
  UserMinus, 
  Crown, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Share2,
  Eye,
  TrendingUp,
  Target
} from 'lucide-react';

interface GroupOrderPageProps {}

const GroupOrderPage: React.FC<GroupOrderPageProps> = () => {
  const { joinCode } = useParams<{ joinCode: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { joinGroupOrder: contextJoinGroupOrder } = useGroupOrder();
  
  const [groupOrder, setGroupOrder] = useState<GroupOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  // Current user's participant data
  const currentParticipant = groupOrder?.participants?.find(p => p.userId === user?.id);
  const isGroupLeader = groupOrder?.groupLeaderId === user?.id;
  const isParticipant = !!currentParticipant;
  
  // Get spending status for display
const spendingStatus = groupOrder ? {} : {}; // Initialize as empty and populate via helper
if (groupOrder && Array.isArray(groupOrder.participants)) {
  groupOrder.participants.forEach(participant => {
    if (participant._id) {
      spendingStatus[participant._id] = groupOrderingService.checkParticipantSpendingStatus(groupOrder, participant._id);
    }
  });
}
  const hasSpendingLimits = groupOrder?.spendingLimits?.enabled || false;

  // Fetch group order data
  useEffect(() => {
    const fetchGroupOrder = async () => {
      if (!joinCode) {
        setError('Invalid join code');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // First validate the join code
        const validation = await groupOrderingService.validateJoinCode(joinCode);
        
        if (!validation.isValid) {
          setError(validation.error || 'Invalid or expired join code');
          setLoading(false);
          return;
        }

        // Get full group order details
        if (validation.groupOrder?._id) {
          const fullGroupOrder = await groupOrderingService.getGroupOrder(validation.groupOrder._id);
          setGroupOrder(fullGroupOrder);
        }
      } catch (err) {
        console.error('Error fetching group order:', err);
        setError(err instanceof Error ? err.message : 'Failed to load group order');
      } finally {
        setLoading(false);
      }
    };

    fetchGroupOrder();
  }, [joinCode]);

  // Update time remaining
  useEffect(() => {
    if (!groupOrder) return;

    const updateTimeRemaining = () => {
      const now = new Date();
      const expiry = new Date(groupOrder.expiresAt);
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s remaining`);
      } else {
        setTimeRemaining(`${seconds}s remaining`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [groupOrder]);

  // Join group order
  const handleJoinGroup = async () => {
    if (!isAuthenticated || !user || !joinCode) {
      toast.error('Please log in to join the group order');
      navigate('/login');
      return;
    }

    setIsJoining(true);
    try {
      const success = await contextJoinGroupOrder(
        joinCode,
        user.name || `${user.firstName} ${user.lastName}`.trim(),
        user.email
      );

      if (success) {
        console.log('✅ Join successful via context');
        toast.success('Successfully joined the group order!');
        
        // Refresh the page data after joining
        setTimeout(async () => {
          try {
            const validation = await groupOrderingService.validateJoinCode(joinCode);
            if (validation.isValid && validation.groupOrder?._id) {
              const refreshedOrder = await groupOrderingService.getGroupOrder(validation.groupOrder._id);
              console.log('✅ Refreshed group order after join:', refreshedOrder);
              setGroupOrder(refreshedOrder);
            }
          } catch (error) {
            console.error('Error refreshing group order after join:', error);
          }
        }, 1000);
      }
    } catch (err) {
      console.error('Error joining group:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to join group order');
    } finally {
      setIsJoining(false);
    }
  };

  // Leave group order
  const handleLeaveGroup = async () => {
    if (!groupOrder) return;

    setIsLeaving(true);
    try {
      await groupOrderingService.leaveGroupOrder(groupOrder._id);
      
      // Refresh group order data
      const updatedGroupOrder = await groupOrderingService.getGroupOrder(groupOrder._id);
      setGroupOrder(updatedGroupOrder);
      
      toast.success('Successfully left the group order');
    } catch (err) {
      console.error('Error leaving group:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to leave group order');
    } finally {
      setIsLeaving(false);
    }
  };

  // Copy group link
  const handleCopyLink = async () => {
    try {
      const groupLink = `${window.location.origin}/group-order/${joinCode}`;
      await navigator.clipboard.writeText(groupLink);
      toast.success('Group link copied to clipboard!');
    } catch (err) {
      console.error('Error copying link:', err);
      toast.error('Failed to copy link');
    }
  };

  // Share group link
  const handleShare = async () => {
    const groupLink = `${window.location.origin}/group-order/${joinCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join our group order!',
          text: `Join our group order at ${groupOrder?.participants.find(p => p.isLeader)?.userName || 'the restaurant'}`,
          url: groupLink
        });
      } catch (err) {
        // User cancelled sharing or error occurred
        console.log('Share cancelled or failed:', err);
      }
    } else {
      // Fallback to copy link
      handleCopyLink();
    }
  };

  // Get status color and icon
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'active':
        return { 
          color: 'bg-green-500', 
          icon: <CheckCircle className="w-4 h-4" />, 
          text: 'Active', 
          description: 'Order is open for modifications' 
        };
      case 'locked':
        return { 
          color: 'bg-yellow-500', 
          icon: <AlertTriangle className="w-4 h-4" />, 
          text: 'Locked', 
          description: 'Order is locked, no more changes allowed' 
        };
      case 'placed':
        return { 
          color: 'bg-blue-500', 
          icon: <Clock className="w-4 h-4" />, 
          text: 'Placed', 
          description: 'Order has been placed and is being prepared' 
        };
      case 'completed':
        return { 
          color: 'bg-green-600', 
          icon: <CheckCircle className="w-4 h-4" />, 
          text: 'Completed', 
          description: 'Order has been completed' 
        };
      case 'cancelled':
        return { 
          color: 'bg-red-500', 
          icon: <XCircle className="w-4 h-4" />, 
          text: 'Cancelled', 
          description: 'Order has been cancelled' 
        };
      default:
        return { 
          color: 'bg-gray-500', 
          icon: <Clock className="w-4 h-4" />, 
          text: status, 
          description: '' 
        };
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    if (!groupOrder || !Array.isArray(groupOrder.participants)) {
      return { totalItems: 0, totalAmount: 0 };
    }
    
    const totalItems = groupOrder.participants.reduce((total, participant) => {
      if (!participant.items || !Array.isArray(participant.items)) return total;
      return total + participant.items.reduce((itemTotal, item) => itemTotal + (item.quantity || 0), 0);
    }, 0);
    
    const totalAmount = groupOrder.participants.reduce((total, participant) => {
      return total + (participant.totalAmount || 0);
    }, 0);
    
    return { totalItems, totalAmount };
  };

  const { totalItems, totalAmount } = calculateTotals();
  const statusDisplay = getStatusDisplay(groupOrder?.status || '');

  // Debug log the current state
  console.log('🔍 GroupOrderPage render state:', {
    loading,
    error,
    groupOrder: !!groupOrder,
    joinCode,
    isAuthenticated,
    user: !!user
  });

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24 max-w-4xl">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !groupOrder) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Group Order Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error || 'The group order you\'re looking for doesn\'t exist or has expired.'}
              </AlertDescription>
            </Alert>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <Button onClick={() => navigate('/menu')} variant="outline">
                Browse Menu
              </Button>
              <Button onClick={() => navigate('/')} variant="default">
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24 max-w-6xl">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold">Group Order</h1>
            <p className="text-muted-foreground mt-1">Share this link to invite others to join</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${statusDisplay.color} text-white`}>
              {statusDisplay.icon}
              {statusDisplay.text}
            </Badge>
          </div>
        </div>

        {/* Join Code and Sharing */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">Join Code:</span>
                  <code className="bg-muted px-3 py-1 rounded text-lg font-mono tracking-wider">
                    {groupOrderingService.formatJoinCode(joinCode!)}
                  </code>
                </div>
                <p className="text-sm text-muted-foreground">{statusDisplay.description}</p>
                {timeRemaining && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {timeRemaining}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCopyLink} variant="outline" size="sm">
                  <Copy className="w-4 h-4" />
                  Copy Link
                </Button>
                {navigator.share && (
                  <Button onClick={handleShare} variant="outline" size="sm">
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Participants Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Participants ({groupOrder.participants?.length || 0})
              </CardTitle>
              <CardDescription>
                Everyone who has joined this group order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(groupOrder.participants || []).map((participant) => {
                  const participantSpendingStatus = spendingStatus[participant._id];
                  const hasSpendingLimit = hasSpendingLimits && participantSpendingStatus && participantSpendingStatus.status !== 'no_limit';
                  const isExceeded = participantSpendingStatus?.status === 'exceeded_limit';
                  const isApproaching = participantSpendingStatus?.status === 'approaching_limit';
                  
                  return (
                    <div key={participant._id} className={`border rounded-lg p-4 ${
                      isExceeded ? 'border-red-200 bg-red-50' : 
                      isApproaching ? 'border-yellow-200 bg-yellow-50' : ''
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{participant.userName}</span>
                          {participant.isLeader && (
                            <Badge variant="secondary" className="text-xs">
                              <Crown className="w-3 h-3 mr-1" />
                              Leader
                            </Badge>
                          )}
                          {participant.userId === user?.id && (
                            <Badge variant="outline" className="text-xs">
                              You
                            </Badge>
                          )}
                          {isExceeded && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Over Limit
                            </Badge>
                          )}
                          {isApproaching && !isExceeded && (
                            <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              Near Limit
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${(participant.totalAmount || 0).toFixed(2)}</div>
                          {hasSpendingLimit && (
                            <div className={`text-xs ${
                              isExceeded ? 'text-red-600' : 
                              isApproaching ? 'text-yellow-600' : 'text-muted-foreground'
                            }`}>
                              Limit: ${participantSpendingStatus.limit?.toFixed(2)}
                            </div>
                          )}
                          <Badge 
                            variant={participant.paymentStatus === 'paid' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {participant.paymentStatus === 'paid' ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Paid
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 mr-1" />
                                Pending
                              </>
                            )}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Spending limit progress bar */}
                      {hasSpendingLimit && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Spending Progress</span>
                            <span className={`font-medium ${
                              isExceeded ? 'text-red-600' : 
                              isApproaching ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {participantSpendingStatus.percentageUsed?.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all ${
                                isExceeded ? 'bg-red-500' : 
                                isApproaching ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(participantSpendingStatus.percentageUsed || 0, 100)}%` }}
                            />
                          </div>
                          {isExceeded && (
                            <div className="text-xs text-red-600 mt-1">
                              Exceeds limit by ${((participantSpendingStatus.currentSpending || 0) - (participantSpendingStatus.limit || 0)).toFixed(2)}
                            </div>
                          )}
                          {isApproaching && !isExceeded && (
                            <div className="text-xs text-yellow-600 mt-1">
                              ${((participantSpendingStatus.limit || 0) - (participantSpendingStatus.currentSpending || 0)).toFixed(2)} remaining
                            </div>
                          )}
                        </div>
                      )}
                      
                      {(participant.items && participant.items.length > 0) ? (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">
                            Items ({(participant.items || []).reduce((total, item) => total + (item.quantity || 0), 0)})
                          </div>
                          {participant.items.map((item, index) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                              <div>
                                <span>{item.quantity}x {item.menuItemName}</span>
                                {item.customizations.length > 0 && (
                                  <div className="text-xs text-muted-foreground ml-4">
                                    {item.customizations.join(', ')}
                                  </div>
                                )}
                                {item.specialRequests && (
                                  <div className="text-xs text-muted-foreground ml-4">
                                    Note: {item.specialRequests}
                                  </div>
                                )}
                              </div>
                              <span className="font-medium">${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground text-center py-2">
                          No items added yet
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Actions Section */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                {!isParticipant ? (
                  <Button 
                    onClick={handleJoinGroup}
                    disabled={isJoining || groupOrder.status !== 'active'}
                    className="flex-1"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {isJoining ? 'Joining...' : 'Join Group Order'}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleLeaveGroup}
                    disabled={isLeaving || isGroupLeader}
                    variant="outline"
                    className="flex-1"
                  >
                    <UserMinus className="w-4 h-4 mr-2" />
                    {isLeaving ? 'Leaving...' : 'Leave Group'}
                  </Button>
                )}
                
                <Button 
                  asChild
                  variant="default"
                  className="flex-1"
                >
                  <Link to={groupOrder?.tableId ? `/?table=${groupOrder.tableId}&groupOrder=${groupOrder._id}` : `/menu?groupOrder=${groupOrder?._id}`}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Menu
                  </Link>
                </Button>
              </div>
              
              {isGroupLeader && (
                <Alert className="mt-4">
                  <Crown className="h-4 w-4" />
                  <AlertDescription>
                    As the group leader, you cannot leave the group. You can cancel the entire order if needed.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Items:</span>
                  <span className="font-medium">{totalItems}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Participants:</span>
                  <span className="font-medium">{groupOrder.participants?.length || 0}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total Amount:</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Spending Limits Overview */}
          {hasSpendingLimits && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Spending Limits
                </CardTitle>
                <CardDescription>
                  Track participant spending against set limits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(groupOrder.participants || []).map((participant) => {
                    const participantStatus = spendingStatus[participant._id];
                    if (!participantStatus || participantStatus.status === 'no_limit') return null;
                    
                    const isExceeded = participantStatus.status === 'exceeded_limit';
                    const isApproaching = participantStatus.status === 'approaching_limit';
                    
                    return (
                      <div key={participant._id} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {participant.userName}
                              {participant.userId === user?.id && ' (You)'}
                            </span>
                            {isExceeded && (
                              <Badge variant="destructive" className="text-xs">
                                Over
                              </Badge>
                            )}
                            {isApproaching && !isExceeded && (
                              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                                Near
                              </Badge>
                            )}
                          </div>
                          <span className={`text-xs font-medium ${
                            isExceeded ? 'text-red-600' : 
                            isApproaching ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            ${(participantStatus.currentSpending || 0).toFixed(2)} / ${(participantStatus.limit || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className={`h-1 rounded-full transition-all ${
                              isExceeded ? 'bg-red-500' : 
                              isApproaching ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(participantStatus.percentageUsed || 0, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  
                  {groupOrder.spendingLimits?.defaultLimit && (
                    <div className="mt-4 pt-3 border-t">
                      <div className="text-xs text-muted-foreground">
                        Default limit: ${(groupOrder.spendingLimits?.defaultLimit || 0).toFixed(2)} AED
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Structure */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Payment Structure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm">
                  <div className="font-medium mb-2">Individual Payments:</div>
                  <div className="space-y-2">
                    {(groupOrder.participants || []).map((participant) => (
                      <div key={participant._id} className="flex justify-between items-center">
                        <span className="text-muted-foreground">
                          {participant.userName}
                          {participant.userId === user?.id && ' (You)'}:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">${(participant.totalAmount || 0).toFixed(2)}</span>
                          {participant.paymentStatus === 'paid' ? (
                            <CheckCircle className="w-3 h-3 text-green-600" />
                          ) : (
                            <Clock className="w-3 h-3 text-yellow-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                <div className="text-xs text-muted-foreground">
                  Each participant pays for their own items. Payment will be processed when the order is finalized.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Group Info */}
          <Card>
            <CardHeader>
              <CardTitle>Group Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Created:</span>
                  <div className="text-muted-foreground">
                    {new Date(groupOrder.createdAt).toLocaleDateString()} at{' '}
                    {new Date(groupOrder.createdAt).toLocaleTimeString()}
                  </div>
                </div>
                
                <div>
                  <span className="font-medium">Expires:</span>
                  <div className="text-muted-foreground">
                    {new Date(groupOrder.expiresAt).toLocaleDateString()} at{' '}
                    {new Date(groupOrder.expiresAt).toLocaleTimeString()}
                  </div>
                </div>
                
                <div>
                  <span className="font-medium">Status:</span>
                  <div className="text-muted-foreground">{statusDisplay.description}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GroupOrderPage;