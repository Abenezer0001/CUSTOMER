import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Bell, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTableInfo } from '@/context/TableContext';

const CallWaiter: React.FC = () => {
  const [selectedReason, setSelectedReason] = useState('assistance');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { tableNumber } = useTableInfo();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      toast.success('Your request has been sent to the staff');
      
      // Reset after 10 seconds
      setTimeout(() => {
        setSubmitted(false);
        setSelectedReason('assistance');
        setAdditionalInfo('');
      }, 10000);
    }, 1500);
  };

  return (
    <div className="px-4 py-8 mt-16">
      <h1 className="text-2xl font-semibold mb-6">Call Waiter</h1>
      
      {submitted ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-marian-blue/20 rounded-full mx-auto flex items-center justify-center mb-4">
            <Check className="h-8 w-8 text-marian-blue" />
          </div>
          
          <h2 className="text-xl font-medium mb-2">Request Sent!</h2>
          
          <p className="text-muted-foreground mb-4">
            A waiter will come to table {tableNumber} shortly.
          </p>
          
          <Button
            className="bg-marian-blue hover:bg-marian-blue/90 text-white"
            onClick={() => setSubmitted(false)}
          >
            Send Another Request
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="bg-background border border-border rounded-lg p-4 mb-6">
            <h2 className="font-medium mb-4">Select a reason</h2>
            
            <RadioGroup 
              defaultValue="assistance" 
              value={selectedReason}
              onValueChange={setSelectedReason}
            >
              <div className="flex items-center space-x-2 mb-3">
                <RadioGroupItem value="assistance" id="assistance" className="text-marian-blue border-marian-blue" />
                <Label htmlFor="assistance">Need Assistance</Label>
              </div>
              <div className="flex items-center space-x-2 mb-3">
                <RadioGroupItem value="refill" id="refill" className="text-marian-blue border-marian-blue" />
                <Label htmlFor="refill">Need a Refill</Label>
              </div>
              <div className="flex items-center space-x-2 mb-3">
                <RadioGroupItem value="utensils" id="utensils" className="text-marian-blue border-marian-blue" />
                <Label htmlFor="utensils">Need Utensils</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other" className="text-marian-blue border-marian-blue" />
                <Label htmlFor="other">Other</Label>
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
              className="border-border focus-visible:ring-marian-blue"
            />
          </div>
          
          <Button 
            type="submit"
            className="w-full h-12 bg-marian-blue hover:bg-marian-blue/90 text-white"
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
  );
};

export default CallWaiter;
