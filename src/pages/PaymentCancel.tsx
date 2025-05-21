import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { XCircle, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

const PaymentCancel: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    // Show toast notification that payment was cancelled
    toast.error('Payment was cancelled. Your order was not processed.');
    
    // Clear the pending order ID from localStorage
    localStorage.removeItem('pending_order_id');
  }, []);

  return (
    <div className="min-h-screen bg-raisin-black text-white flex flex-col items-center justify-center p-4">
      <div className="w-20 h-20 bg-destructive/20 rounded-full flex items-center justify-center mb-6">
        <XCircle className="h-10 w-10 text-destructive" />
      </div>
      
      <h1 className="text-2xl font-semibold mb-2 text-center">Payment Cancelled</h1>
      
      <p className="text-gray-400 text-center mb-8 max-w-md">
        Your payment was cancelled and your order has not been processed. You can try again or continue shopping.
      </p>
      
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Button 
          onClick={() => navigate('/checkout')}
          className="bg-delft-blue hover:bg-delft-blue/90 text-white"
        >
          Try Again
        </Button>
        
        <Button 
          variant="outline"
          onClick={() => navigate('/')}
          className="border-delft-blue text-delft-blue hover:bg-delft-blue/10"
        >
          <ShoppingCart className="h-4 w-4 mr-2" /> Continue Shopping
        </Button>
      </div>
    </div>
  );
};

export default PaymentCancel;