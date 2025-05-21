import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useOrders } from '@/context/OrdersContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Loader2 } from 'lucide-react';
import { checkStripeSessionStatus } from '@/api/stripeService';
import { toast } from 'sonner';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { getOrderById } = useOrders();
  const [searchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [orderId, setOrderId] = useState<string | null>(null);
  
  useEffect(() => {
    const verifyPayment = async () => {
      setLoading(true);
      
      try {
        // Get session ID from URL
        const sessionId = searchParams.get('session_id');
        
        if (!sessionId) {
          toast.error('Payment session not found');
          navigate('/');
          return;
        }
        
        // Check payment status using our new Stripe service
        const paymentStatus = await checkStripeSessionStatus(sessionId);
        
        if (paymentStatus.status === 'paid') {
          // Payment successful
          if (paymentStatus.orderId) {
            setOrderId(paymentStatus.orderId);
            
            // Navigate to order confirmation
            setTimeout(() => {
              navigate('/order-confirmation', { state: { orderId: paymentStatus.orderId } });
            }, 1500);
          } else {
            // If no order ID in payment status response, try from localStorage
            const pendingOrderId = localStorage.getItem('pending_order_id');
            if (pendingOrderId) {
              setOrderId(pendingOrderId);
              
              // Navigate to order confirmation
              setTimeout(() => {
                navigate('/order-confirmation', { state: { orderId: pendingOrderId } });
                localStorage.removeItem('pending_order_id');
              }, 1500);
            } else {
              // No order ID available, navigate to My Orders
              toast.success('Payment successful! View your orders.');
              setTimeout(() => {
                navigate('/my-orders');
              }, 1500);
            }
          }
        } else {
          // Payment not successful
          toast.error('Payment was not completed. Please try again.');
          navigate('/checkout');
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        toast.error('Failed to verify payment. Please check your order status.');
        navigate('/my-orders');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [navigate, searchParams, token, getOrderById]);

  return (
    <div className="min-h-screen bg-raisin-black text-white flex flex-col items-center justify-center p-4">
      {loading ? (
        <>
          <Loader2 className="h-16 w-16 animate-spin text-delft-blue mb-6" />
          <h1 className="text-2xl font-semibold mb-2 text-center">Processing Payment</h1>
          <p className="text-gray-400 text-center">
            Please wait while we verify your payment...
          </p>
        </>
      ) : (
        <>
          <div className="w-20 h-20 bg-delft-blue/20 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="h-10 w-10 text-delft-blue" />
          </div>
          
          <h1 className="text-2xl font-semibold mb-2 text-center">Payment Successful!</h1>
          
          <p className="text-gray-400 text-center mb-8 max-w-md">
            Thank you for your order. You'll be redirected to your order details in a moment.
          </p>
          
          <div className="flex items-center text-delft-blue mt-4 mb-8">
            <Clock className="h-5 w-5 mr-2" />
            <span>Redirecting to order details...</span>
          </div>
          
          <Button 
            onClick={() => navigate('/my-orders')}
            className="bg-delft-blue hover:bg-delft-blue/90"
          >
            View My Orders
          </Button>
        </>
      )}
    </div>
  );
};

export default PaymentSuccess;