
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useOrders } from '@/context/OrdersContext';
import { useTableInfo } from '@/context/TableContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const Checkout: React.FC = () => {
  const { items, subtotal, clearCart } = useCart();
  const { addOrder } = useOrders();
  const { tableNumber } = useTableInfo();
  const navigate = useNavigate();
  
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const tax = subtotal * 0.1;
  const total = subtotal + tax;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cardNumber || !expiryDate || !cvc) {
      toast.error('Please fill in all payment details');
      return;
    }
    
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      const newOrder = {
        id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        items: [...items],
        subtotal,
        tax,
        total,
        status: 'preparing' as const,
        timestamp: new Date(),
        tableNumber
      };
      
      addOrder(newOrder);
      clearCart();
      navigate('/order-confirmation', { state: { orderId: newOrder.id } });
      
      setIsProcessing(false);
    }, 2000);
  };

  return (
    <div className="px-4 py-4 mt-16">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)} 
        className="mb-6 pl-0"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      
      <h1 className="text-2xl font-semibold mb-6">Checkout</h1>
      
      <div className="mb-8 bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="font-medium mb-4">Order Summary</h2>
        
        {items.map((item) => (
          <div key={item.id} className="flex justify-between py-2 text-sm">
            <div>
              <span>{item.quantity} x {item.name}</span>
              {item.modifiers && item.modifiers.length > 0 && (
                <div className="text-xs text-gray-500 ml-4">
                  {item.cookingPreference && <div>• {item.cookingPreference}</div>}
                  {item.modifiers.map(mod => (
                    <div key={mod.id}>• {mod.name}</div>
                  ))}
                </div>
              )}
            </div>
            <span>${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        
        <div className="border-t my-3"></div>
        
        <div className="flex justify-between text-sm py-2">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between text-sm py-2">
          <span>Tax (10%)</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between font-medium py-2">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-8">
        <h2 className="font-medium mb-4">Payment</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="cardNumber" className="block text-sm font-medium mb-1">
              Card Number
            </label>
            <Input
              id="cardNumber"
              placeholder="4242 4242 4242 4242"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              maxLength={19}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label htmlFor="expiryDate" className="block text-sm font-medium mb-1">
                Expiry Date
              </label>
              <Input
                id="expiryDate"
                placeholder="MM/YY"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                maxLength={5}
              />
            </div>
            
            <div>
              <label htmlFor="cvc" className="block text-sm font-medium mb-1">
                CVC
              </label>
              <Input
                id="cvc"
                placeholder="123"
                value={cvc}
                onChange={(e) => setCvc(e.target.value)}
                maxLength={3}
              />
            </div>
          </div>
          
          <Button 
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="animate-spin mr-2">⭕</span> Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" /> Pay ${total.toFixed(2)}
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
