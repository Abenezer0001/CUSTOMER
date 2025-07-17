import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Bell, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTableInfo } from '@/context/TableContext';
import { waiterCallService, WaiterCallReason } from '@/api/waiterCallService';
import TableHeader from '@/components/TableHeader';

const CallWaiter: React.FC = () => {
  const [selectedReason, setSelectedReason] = useState<WaiterCallReason>(WaiterCallReason.NEED_ASSISTANCE);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { tableNumber, restaurantName, tableId } = useTableInfo();
  
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
    </div>
    </div>
  );
};

export default CallWaiter;
