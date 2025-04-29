import React, { useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useOrder } from '../context/OrderContext';
import { useOrderActions } from '../hooks/useOrderActions';
import { Order } from '../types/Order';

const OrderConfirmationPage: NextPage = () => {
  const router = useRouter();
  const { currentOrder } = useOrder();
  const { handleCancelOrder, loading, orderError } = useOrderActions();
  
  // Redirect to menu if no current order
  useEffect(() => {
    if (!currentOrder) {
      router.push('/menu');
    }
  }, [currentOrder, router]);

  if (!currentOrder) {
    return null; // Will redirect via the useEffect
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusClass = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCancelOrderClick = async () => {
    if (currentOrder && currentOrder._id) {
      try {
        await handleCancelOrder(currentOrder._id);
        // Stay on the same page, the order status will update
      } catch (error) {
        console.error('Error cancelling order:', error);
      }
    }
  };

  return (
    <>
      <Head>
        <title>Order Confirmation | InSeat Menu</title>
        <meta name="description" content="Your order confirmation details" />
      </Head>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Order Confirmation</h1>

        {orderError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {orderError}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Order #{currentOrder._id?.substring(0, 8)}</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(currentOrder.status)}`}>
              {currentOrder.status}
            </span>
          </div>

          <div className="mb-6">
            <p className="text-gray-600">
              <span className="font-medium">Order Date:</span> {formatDate(currentOrder.createdAt)}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Table Number:</span> {currentOrder.tableNumber || 'Not specified'}
            </p>
            {currentOrder.specialInstructions && (
              <div className="mt-2">
                <p className="font-medium text-gray-600">Special Instructions:</p>
                <p className="text-gray-600 bg-gray-50 p-2 rounded mt-1">{currentOrder.specialInstructions}</p>
              </div>
            )}
          </div>

          <h3 className="font-semibold text-lg mb-3 border-b pb-2">Order Items</h3>
          <div className="divide-y">
            {currentOrder.items.map((item, index) => (
              <div key={index} className="py-3 flex justify-between">
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
              <p>${currentOrder.totalAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={() => router.push('/menu')}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Back to Menu
          </button>
          
          {currentOrder.status.toLowerCase() === 'pending' && (
            <button
              type="button"
              onClick={handleCancelOrderClick}
              disabled={loading}
              className={`px-6 py-2 text-white bg-red-600 rounded-md ${
                loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-red-700'
              } focus:outline-none focus:ring-2 focus:ring-red-500`}
            >
              {loading ? 'Processing...' : 'Cancel Order'}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default OrderConfirmationPage; 