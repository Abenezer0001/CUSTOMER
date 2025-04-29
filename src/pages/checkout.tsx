import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useOrderActions } from '../hooks/useOrderActions';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';

const CheckoutPage: NextPage = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { placeOrder, loading, orderError } = useOrderActions();
  const router = useRouter();
  const [tableNumber, setTableNumber] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Redirect to menu if cart is empty
  React.useEffect(() => {
    if (items.length === 0) {
      router.push('/menu');
    }
  }, [items, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await placeOrder(tableNumber, specialInstructions);
      // Redirect happens in the placeOrder function
    } catch (error) {
      // Error is handled in the hook and displayed below
      console.error('Error placing order:', error);
    }
  };

  return (
    <>
      <Head>
        <title>Checkout | InSeat Menu</title>
        <meta name="description" content="Complete your order" />
      </Head>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Checkout</h1>
        
        {orderError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {orderError}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          
          {items.length === 0 ? (
            <p className="text-gray-500">Your cart is empty</p>
          ) : (
            <>
              <div className="divide-y">
                {items.map((item) => (
                  <div key={item.id} className="py-3 flex justify-between">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        Quantity: {item.quantity}
                      </p>
                      {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                        <div className="text-sm text-gray-500">
                          <p>Modifiers:</p>
                          <ul className="list-disc list-inside ml-2">
                            {item.selectedModifiers.map((mod, idx) => (
                              <li key={idx}>{mod.name}: +${mod.price.toFixed(2)}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <p className="font-medium">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-gray-200 mt-4 pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <p>Total</p>
                  <p>${totalPrice.toFixed(2)}</p>
                </div>
              </div>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Order Details</h2>
          
          <div className="mb-4">
            <label htmlFor="tableNumber" className="block text-gray-700 mb-2">
              Table Number
            </label>
            <input
              id="tableNumber"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="Enter your table number"
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="specialInstructions" className="block text-gray-700 mb-2">
              Special Instructions
            </label>
            <textarea
              id="specialInstructions"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Any special instructions for your order?"
              rows={3}
            />
          </div>
          
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => router.push('/cart')}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Back to Cart
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-2 text-white bg-blue-600 rounded-md ${
                loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              {loading ? 'Processing...' : 'Place Order'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default CheckoutPage; 