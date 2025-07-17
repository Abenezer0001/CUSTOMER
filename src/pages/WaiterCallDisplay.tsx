import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Clock, User, CheckCircle, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { waiterCallService, WaiterCall, WaiterCallStatus, WaiterCallReason } from '@/api/waiterCallService';

interface WaiterCallDisplayProps {
  restaurantId: string;
  venueId?: string;
  staffUserId?: string;
}

const WaiterCallDisplay: React.FC<WaiterCallDisplayProps> = ({ 
  restaurantId, 
  venueId,
  staffUserId 
}) => {
  const [activeCalls, setActiveCalls] = useState<WaiterCall[]>([]);
  const [resolvedCalls, setResolvedCalls] = useState<WaiterCall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'resolved'>('active');

  // Fetch waiter calls
  const fetchWaiterCalls = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch active calls
      const activeResponse = await waiterCallService.getWaiterCalls(restaurantId, {
        status: WaiterCallStatus.ACTIVE,
        venueId,
        limit: 100
      });
      
      // Fetch recently resolved calls (last 50)
      const resolvedResponse = await waiterCallService.getWaiterCalls(restaurantId, {
        status: WaiterCallStatus.RESOLVED,
        venueId,
        limit: 50
      });

      setActiveCalls(activeResponse.data);
      setResolvedCalls(resolvedResponse.data);
    } catch (error) {
      console.error('Error fetching waiter calls:', error);
      toast.error('Failed to fetch waiter calls');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, venueId]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchWaiterCalls();
    const interval = setInterval(fetchWaiterCalls, 30000);
    return () => clearInterval(interval);
  }, [fetchWaiterCalls]);

  // Format duration since call was created
  const formatDuration = (createdAt: string): string => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffInSeconds = Math.floor((now.getTime() - created.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds}s`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m`;
    } else {
      const hours = Math.floor(diffInSeconds / 3600);
      const minutes = Math.floor((diffInSeconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  // Get priority color based on duration
  const getPriorityColor = (createdAt: string): string => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffInMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 5) return 'bg-green-500/20 text-green-400';
    if (diffInMinutes < 10) return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-red-500/20 text-red-400';
  };

  // Format reason display
  const formatReason = (reason: WaiterCallReason): string => {
    switch (reason) {
      case WaiterCallReason.NEED_ASSISTANCE:
        return 'Need Assistance';
      case WaiterCallReason.NEED_REFILL:
        return 'Need Refill';
      case WaiterCallReason.NEED_UTENSILS:
        return 'Need Utensils';
      case WaiterCallReason.OTHER:
        return 'Other';
      default:
        return reason;
    }
  };

  // Resolve a waiter call
  const handleResolveCall = async (callId: string) => {
    if (!staffUserId) {
      toast.error('Staff user ID not provided');
      return;
    }

    try {
      await waiterCallService.resolveWaiterCall(callId, staffUserId);
      toast.success('Waiter call resolved');
      fetchWaiterCalls(); // Refresh the list
    } catch (error: any) {
      console.error('Error resolving waiter call:', error);
      toast.error(error.message || 'Failed to resolve waiter call');
    }
  };

  // Cancel a waiter call
  const handleCancelCall = async (callId: string) => {
    try {
      await waiterCallService.cancelWaiterCall(callId);
      toast.success('Waiter call cancelled');
      fetchWaiterCalls(); // Refresh the list
    } catch (error: any) {
      console.error('Error cancelling waiter call:', error);
      toast.error(error.message || 'Failed to cancel waiter call');
    }
  };

  const renderCallCard = (call: WaiterCall, isActive: boolean = true) => (
    <Card key={call._id} className="bg-[#262837] border-[#2D303E] text-white mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
            Table {call.tableNumber}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isActive && (
              <Badge className={`${getPriorityColor(call.createdAt)} border-0`}>
                <Clock className="w-3 h-3 mr-1" />
                {formatDuration(call.createdAt)}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300 font-medium">{formatReason(call.reason)}</span>
          </div>
          
          {call.additionalInfo && (
            <div className="text-gray-300 text-sm bg-[#1A1B2E] p-3 rounded-lg">
              <strong>Additional Info:</strong> {call.additionalInfo}
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <User className="w-4 h-4" />
            <span>{call.isGuest ? 'Guest Customer' : 'Registered Customer'}</span>
            <span>•</span>
            <span>{new Date(call.createdAt).toLocaleTimeString()}</span>
          </div>

          {isActive && (
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => handleResolveCall(call._id)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Resolve
              </Button>
              <Button
                onClick={() => handleCancelCall(call._id)}
                variant="outline"
                className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}

          {!isActive && call.resolvedAt && (
            <div className="text-sm text-green-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Resolved at {new Date(call.resolvedAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-[#16141F] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bell className="w-8 h-8 text-purple-500" />
            Waiter Calls
          </h1>
          <Button
            onClick={fetchWaiterCalls}
            variant="outline"
            className="border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white"
          >
            Refresh
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <Button
            onClick={() => setActiveTab('active')}
            variant={activeTab === 'active' ? 'default' : 'outline'}
            className={activeTab === 'active' 
              ? 'bg-purple-600 hover:bg-purple-700' 
              : 'border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white'
            }
          >
            Active Calls ({activeCalls.length})
          </Button>
          <Button
            onClick={() => setActiveTab('resolved')}
            variant={activeTab === 'resolved' ? 'default' : 'outline'}
            className={activeTab === 'resolved' 
              ? 'bg-purple-600 hover:bg-purple-700' 
              : 'border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white'
            }
          >
            Recent Resolved ({resolvedCalls.length})
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <div>
            {activeTab === 'active' ? (
              <>
                {activeCalls.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-400 mb-2">No Active Calls</h3>
                    <p className="text-gray-500">All customers are currently being served</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeCalls
                      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                      .map(call => renderCallCard(call, true))}
                  </div>
                )}
              </>
            ) : (
              <>
                {resolvedCalls.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-400 mb-2">No Recent Resolved Calls</h3>
                    <p className="text-gray-500">No calls have been resolved recently</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {resolvedCalls
                      .sort((a, b) => new Date(b.resolvedAt || b.updatedAt).getTime() - new Date(a.resolvedAt || a.updatedAt).getTime())
                      .map(call => renderCallCard(call, false))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WaiterCallDisplay;