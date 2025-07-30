import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Bell, Check, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTableInfo } from '@/context/TableContext';
import { waiterCallService, WaiterCallReason, WaiterCall, WaiterCallStatus } from '@/api/waiterCallService';
import TableHeader from '@/components/TableHeader';

const CallWaiter: React.FC = () => {
  const [selectedReason, setSelectedReason] = useState<WaiterCallReason>(WaiterCallReason.NEED_ASSISTANCE);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const { tableNumber, restaurantName, tableId } = useTableInfo();

  // Load waiter call history on component mount
  useEffect(() => {
    if (tableId) {
      loadWaiterCallHistory();
    }
  }, [tableId]);

  // Load waiter call history
  const loadWaiterCallHistory = async () => {
    try {
      setLoadingHistory(true);
      const deviceId = localStorage.getItem('deviceId');
      if (deviceId) {
        const history = await waiterCallService.getWaiterCallsByTable(tableId);
        setWaiterCalls(history.filter(call => call.deviceId === deviceId));
      }
    } catch (error) {
      console.error('Error loading waiter call history:', error);
      // Don't show error toast for history loading - it's not critical
    } finally {
      setLoadingHistory(false);
    }
  };

  // Cancel waiter call
  const handleCancelCall = async (callId: string) => {
    try {
      await waiterCallService.cancelWaiterCall(callId);
      toast.success('Request cancelled successfully');
      loadWaiterCallHistory(); // Refresh history
    } catch (error: any) {
      console.error('Error cancelling waiter call:', error);
      toast.error(error.message || 'Failed to cancel request');
    }
  };

  // Get status icon
  const getStatusIcon = (status: WaiterCallStatus) => {
    switch (status) {
      case WaiterCallStatus.ACTIVE:
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case WaiterCallStatus.RESOLVED:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case WaiterCallStatus.CANCELLED:
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    return formatTime(dateString);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tableId) {
      toast.error('Table information not found. Please scan the QR code again.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create device ID for guest users
      const deviceId = localStorage.getItem('deviceId') || `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (!localStorage.getItem('deviceId')) {
        localStorage.setItem('deviceId', deviceId);
      }

      await waiterCallService.createWaiterCall({
        tableId,
        reason: selectedReason,
        additionalInfo: additionalInfo.trim() || undefined,
        deviceId,
        isGuest: true
      });

      setSubmitted(true);
      toast.success('Your request has been sent to the staff');
      
      // Refresh waiter call history
      loadWaiterCallHistory();
      
      // Reset after 10 seconds
      setTimeout(() => {
        setSubmitted(false);
        setSelectedReason(WaiterCallReason.NEED_ASSISTANCE);
        setAdditionalInfo('');
      }, 10000);
    } catch (error: any) {
      console.error('Error creating waiter call:', error);
      toast.error(error.message || 'Failed to send request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#16141F] text-white">
      {/* Use the same TableHeader as the menu page */}
      <TableHeader 
        venueName={restaurantName || 'Screen 3'}
        className="bg-[#16141F] text-white"
      />
      
      <div className="px-4 py-8 mt-16">
      <h1 className="text-2xl font-semibold mb-6">Call Waiter</h1>
      
      {submitted ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-purple-600/20 rounded-full mx-auto flex items-center justify-center mb-4">
            <Check className="h-8 w-8 text-purple-600" />
          </div>
          
          <h2 className="text-xl font-medium mb-2">Request Sent!</h2>
          
          <p className="text-gray-400 mb-4">
            A waiter will come to table {tableNumber} shortly.
          </p>
          
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => setSubmitted(false)}
          >
            Send Another Request
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="bg-[#262837] border border-[#2D303E] rounded-lg p-4 mb-6">
            <h2 className="font-medium mb-4">Select a reason</h2>
            
            <RadioGroup 
              defaultValue={WaiterCallReason.NEED_ASSISTANCE} 
              value={selectedReason}
              onValueChange={(value) => setSelectedReason(value as WaiterCallReason)}
            >
              <div className="flex items-center space-x-2 mb-3">
                <RadioGroupItem value={WaiterCallReason.NEED_ASSISTANCE} id="assistance" className="text-purple-600 border-purple-600" />
                <Label htmlFor="assistance" className="text-white">Need Assistance</Label>
              </div>
              <div className="flex items-center space-x-2 mb-3">
                <RadioGroupItem value={WaiterCallReason.NEED_REFILL} id="refill" className="text-purple-600 border-purple-600" />
                <Label htmlFor="refill" className="text-white">Need a Refill</Label>
              </div>
              <div className="flex items-center space-x-2 mb-3">
                <RadioGroupItem value={WaiterCallReason.NEED_UTENSILS} id="utensils" className="text-purple-600 border-purple-600" />
                <Label htmlFor="utensils" className="text-white">Need Utensils</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={WaiterCallReason.OTHER} id="other" className="text-purple-600 border-purple-600" />
                <Label htmlFor="other" className="text-white">Other</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="mb-6">
            <label htmlFor="additionalInfo" className="block font-medium mb-2">
              Additional Information (Optional)
            </label>
            <Textarea 
              id="additionalInfo" 
              placeholder="Provide more details about your request..."
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              rows={4}
              className="border-[#2D303E] bg-[#262837] text-white focus-visible:ring-purple-600"
            />
          </div>
          
          <Button 
            type="submit"
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="animate-spin mr-2">⭕</span>
            ) : (
              <Bell className="mr-2 h-4 w-4" />
            )}
            {isSubmitting ? 'Sending...' : 'Call Waiter'}
          </Button>
        </form>
      )}

      {/* Waiter Call History */}
      <div className="mt-8">
        <h2 className="text-lg font-medium mb-4">Previous Requests</h2>
        
        {loadingHistory ? (
          <div className="bg-[#262837] border border-[#2D303E] rounded-lg p-4">
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin mr-2">⭕</div>
              <span className="text-gray-400">Loading request history...</span>
            </div>
          </div>
        ) : waiterCalls.length === 0 ? (
          <div className="bg-[#262837] border border-[#2D303E] rounded-lg p-4">
            <div className="text-center py-4">
              <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-400">No previous requests</p>
              <p className="text-gray-500 text-sm">Your request history will appear here</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {waiterCalls.map((call) => (
              <div key={call._id} className="bg-[#262837] border border-[#2D303E] rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(call.status)}
                      <span className="font-medium text-white">
                        {call.reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <span className="text-sm text-gray-400">
                        {formatRelativeTime(call.createdAt)}
                      </span>
                    </div>
                    
                    {call.additionalInfo && (
                      <p className="text-gray-300 text-sm mb-2">{call.additionalInfo}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Requested at {formatTime(call.createdAt)}</span>
                      {call.resolvedAt && (
                        <span>Resolved at {formatTime(call.resolvedAt)}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      call.status === WaiterCallStatus.ACTIVE 
                        ? 'bg-orange-500/20 text-orange-400' 
                        : call.status === WaiterCallStatus.RESOLVED
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {call.status.charAt(0) + call.status.slice(1).toLowerCase()}
                    </div>
                    
                    {call.status === WaiterCallStatus.ACTIVE && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-xs border-red-500 text-red-400 hover:bg-red-500/10"
                        onClick={() => handleCancelCall(call._id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default CallWaiter;
