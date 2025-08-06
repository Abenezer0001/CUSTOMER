import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { XCircle, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const PaymentCancel: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  
  useEffect(() => {
    // Show toast notification that payment was cancelled
    toast.error('Payment was cancelled. Your order was not processed.');
    
    // Clear the pending order ID from localStorage
    localStorage.removeItem('pending_order_id');
    
    console.log('PaymentCancel - Auth status:', { isAuthenticated, isLoading });
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    // Only redirect after auth context has loaded
    if (!isLoading) {
      // Check if we have table context and preserve it for redirect
      const tableId = searchParams.get('table') || localStorage.getItem('currentTableId');
      const returnFromStripe = searchParams.get('return_from_stripe');
      const deviceId = searchParams.get('device_id');
      
      console.log('PaymentCancel - preserving session context:', { 
        tableId, 
        returnFromStripe, 
        deviceId,
        isAuthenticated 
      });
      
      // Store device ID if provided
      if (deviceId) {
        localStorage.setItem('device_id', deviceId);
      }
      
      // Add a small delay to allow user to see the message
      const redirectTimer = setTimeout(() => {
        if (tableId) {
          // Preserve all session parameters
          const params = new URLSearchParams();
          params.set('table', tableId);
          if (returnFromStripe) params.set('return_from_stripe', 'true');
          if (deviceId) params.set('device_id', deviceId);
          
          navigate(`/my-orders?${params.toString()}`);
        } else {
          navigate('/my-orders');
        }
      }, 2000); // Give 2 seconds for user to see the message
      
      return () => clearTimeout(redirectTimer);
    }
  }, [isLoading, navigate, searchParams]);

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
          onClick={() => navigate('/my-orders')}
          className="bg-delft-blue hover:bg-delft-blue/90 text-white"
        >
          Back to My Orders
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