import { useState } from 'react';
import { useOrders } from '../context/OrderContext';
import { useCart } from '../context/CartContext';
import { useRouter } from 'next/router';

interface OrderActionsState {
  isPlacingOrder: boolean;
  orderError: string | null;
  orderSuccess: boolean;
}

export const useOrderActions = () => {
  const [state, setState] = useState<OrderActionsState>({
    isPlacingOrder: false,
    orderError: null,
    orderSuccess: false
  });
  
  const { createOrder, cancelOrder, loading } = useOrders();
  const { items, totalPrice, clearCart } = useCart();
  const router = useRouter();

  /**
   * Place a new order with the current cart items
   */
  const placeOrder = async (tableNumber?: string, specialInstructions?: string) => {
    // Reset state
    setState({
      isPlacingOrder: true,
      orderError: null,
      orderSuccess: false
    });

    try {
      if (items.length === 0) {
        throw new Error('Your cart is empty');
      }

      // Call the createOrder function from OrderContext
      const newOrder = await createOrder(
        items,
        totalPrice,
        tableNumber,
        specialInstructions
      );

      // Clear the cart
      clearCart();

      // Update state to reflect success
      setState({
        isPlacingOrder: false,
        orderError: null,
        orderSuccess: true
      });

      // Redirect to order confirmation page
      router.push(`/orders/${newOrder.id}`);

      return newOrder;
    } catch (error) {
      // Handle errors
      const errorMessage = error instanceof Error ? error.message : 'Failed to place order';
      
      setState({
        isPlacingOrder: false,
        orderError: errorMessage,
        orderSuccess: false
      });

      throw error;
    }
  };

  /**
   * Cancel an existing order
   */
  const handleCancelOrder = async (orderId: string) => {
    setState({
      ...state,
      isPlacingOrder: true,
      orderError: null
    });

    try {
      await cancelOrder(orderId);
      
      setState({
        ...state,
        isPlacingOrder: false,
        orderSuccess: true
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel order';
      
      setState({
        ...state,
        isPlacingOrder: false,
        orderError: errorMessage
      });

      return false;
    }
  };

  /**
   * Reset the order state
   */
  const resetOrderState = () => {
    setState({
      isPlacingOrder: false,
      orderError: null,
      orderSuccess: false
    });
  };

  return {
    ...state,
    loading: state.isPlacingOrder || loading,
    placeOrder,
    cancelOrder: handleCancelOrder,
    resetOrderState
  };
};

export default useOrderActions; 