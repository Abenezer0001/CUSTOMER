import { OrderService } from './OrderService';
import { CartItem, OrderStatus } from '@/types';

// Helper to log results in a formatted way
const logResult = (title: string, data: any) => {
  console.log('\n====================');
  console.log(title);
  console.log('====================');
  console.log(JSON.stringify(data, null, 2));
};

// Function to run all tests
const runTests = async () => {
  try {
    console.log('Starting OrderService tests...');
    
    // Clear localStorage first to start fresh
    localStorage.clear();
    
    // TEST 1: Create an order
    console.log('\nTEST 1: Creating a new order...');
    const cartItems: CartItem[] = [
      {
        id: 'cart-item-1',
        menuItemId: '1',
        name: 'Dal Makhani',
        price: 30.00,
        quantity: 2,
        image: '/placeholder.svg',
        modifiers: [
          { id: 'mod1', name: 'Extra Spicy', price: 1.00 }
        ]
      },
      {
        id: 'cart-item-2',
        menuItemId: '2',
        name: 'Classic Cheeseburger',
        price: 12.99,
        quantity: 1,
        image: '/placeholder.svg'
      }
    ];
    
    const tableNumber = "12";
    const createdOrder = await OrderService.createOrder(cartItems, tableNumber);
    logResult('Created Order', createdOrder);
    
    // TEST 2: Get all orders
    console.log('\nTEST 2: Getting all orders...');
    const allOrders = await OrderService.getOrders();
    logResult('All Orders', allOrders);
    
    // TEST 3: Get order by ID
    console.log('\nTEST 3: Getting order by ID...');
    const orderId = createdOrder.id;
    const retrievedOrder = await OrderService.getOrderById(orderId);
    logResult('Retrieved Order', retrievedOrder);
    
    // TEST 4: Update order status
    console.log('\nTEST 4: Updating order status...');
    const updatedOrder = await OrderService.updateOrderStatus(orderId, OrderStatus.READY);
    logResult('Updated Order', updatedOrder);
    
    // TEST 5: Get active orders
    console.log('\nTEST 5: Getting active orders...');
    const activeOrders = await OrderService.getActiveOrders();
    logResult('Active Orders', activeOrders);
    
    // TEST 6: Create another order
    console.log('\nTEST 6: Creating another order...');
    const moreCartItems: CartItem[] = [
      {
        id: 'cart-item-3',
        menuItemId: '6',
        name: 'Spaghetti Carbonara',
        price: 16.99,
        quantity: 1,
        image: '/placeholder.svg'
      }
    ];
    
    const anotherOrder = await OrderService.createOrder(moreCartItems, tableNumber);
    logResult('Another Order', anotherOrder);
    
    // TEST 7: Complete an order
    console.log('\nTEST 7: Completing an order...');
    const completedOrder = await OrderService.updateOrderStatus(orderId, OrderStatus.COMPLETED);
    logResult('Completed Order', completedOrder);
    
    // TEST 8: Get completed orders
    console.log('\nTEST 8: Getting completed orders...');
    const completedOrders = await OrderService.getCompletedOrders();
    logResult('Completed Orders', completedOrders);
    
    // TEST 9: Cancel an order
    console.log('\nTEST 9: Cancelling an order...');
    const cancelResult = await OrderService.cancelOrder(anotherOrder.id);
    logResult('Cancel Result', cancelResult);
    
    // TEST 10: Verify orders after cancellation
    console.log('\nTEST 10: Getting all orders after cancellation...');
    const remainingOrders = await OrderService.getOrders();
    logResult('Remaining Orders', remainingOrders);
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error during tests:', error);
  }
};

// Run the tests
runTests(); 