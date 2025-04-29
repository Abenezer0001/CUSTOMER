// This script will simulate a basic environment for testing OrderService

// Mock localStorage for Node.js environment
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

// Assign localStorage to global
global.localStorage = localStorageMock;

// Mock the toast notification
global.toast = {
  success: (msg) => console.log(`SUCCESS TOAST: ${msg}`),
  error: (msg) => console.log(`ERROR TOAST: ${msg}`)
};

// Types for our tests
const OrderStatus = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  READY: 'ready',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Helper to log results in a formatted way
const logResult = (title, data) => {
  console.log('\n====================');
  console.log(title);
  console.log('====================');
  console.log(JSON.stringify(data, null, 2));
};

// Simulate API delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// OrderService implementation
const OrderService = {
  // Create a new order
  createOrder: async (items, tableNumber) => {
    await delay(300); // Shorter delay for testing
    
    // Calculate order details
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.15; // Assuming 15% tax
    const total = subtotal + tax;
    
    // Create order object
    const order = {
      id: 'order-' + Date.now(),
      items: [...items],
      subtotal,
      tax,
      total,
      status: 'preparing',
      timestamp: new Date(),
      tableNumber
    };
    
    // Save to localStorage
    const existingOrdersString = localStorage.getItem('orders');
    const existingOrders = existingOrdersString ? JSON.parse(existingOrdersString) : [];
    
    localStorage.setItem('orders', JSON.stringify([order, ...existingOrders]));
    
    toast.success('Order placed successfully!');
    
    return order;
  },
  
  // Get all orders
  getOrders: async () => {
    await delay(200); // Shorter delay for testing
    
    const ordersString = localStorage.getItem('orders');
    return ordersString ? JSON.parse(ordersString) : [];
  },
  
  // Get order by ID
  getOrderById: async (orderId) => {
    await delay(200); // Shorter delay for testing
    
    const ordersString = localStorage.getItem('orders');
    const orders = ordersString ? JSON.parse(ordersString) : [];
    
    const order = orders.find(order => order.id === orderId);
    return order || null;
  },
  
  // Update order status
  updateOrderStatus: async (orderId, status) => {
    await delay(200); // Shorter delay for testing
    
    // Get orders from localStorage
    const ordersString = localStorage.getItem('orders');
    const orders = ordersString ? JSON.parse(ordersString) : [];
    
    // Find and update the order
    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        return { ...order, status };
      }
      return order;
    });
    
    // Save updated orders
    localStorage.setItem('orders', JSON.stringify(updatedOrders));
    
    // Return the updated order
    const updatedOrder = updatedOrders.find(order => order.id === orderId);
    return updatedOrder || null;
  },
  
  // Cancel an order
  cancelOrder: async (orderId) => {
    await delay(200); // Shorter delay for testing
    
    // Get orders from localStorage
    const ordersString = localStorage.getItem('orders');
    const orders = ordersString ? JSON.parse(ordersString) : [];
    
    // Remove the order
    const updatedOrders = orders.filter(order => order.id !== orderId);
    
    // Check if any order was removed
    if (updatedOrders.length === orders.length) {
      toast.error('Order not found');
      return false;
    }
    
    // Save updated orders
    localStorage.setItem('orders', JSON.stringify(updatedOrders));
    toast.success('Order cancelled successfully');
    
    return true;
  },
  
  // Get active orders (preparing or ready status)
  getActiveOrders: async () => {
    await delay(200); // Shorter delay for testing
    
    const ordersString = localStorage.getItem('orders');
    const orders = ordersString ? JSON.parse(ordersString) : [];
    
    return orders.filter(order => 
      order.status === 'preparing' || order.status === 'ready'
    );
  },
  
  // Get completed orders (delivered or completed status)
  getCompletedOrders: async () => {
    await delay(200); // Shorter delay for testing
    
    const ordersString = localStorage.getItem('orders');
    const orders = ordersString ? JSON.parse(ordersString) : [];
    
    return orders.filter(order => 
      order.status === 'delivered' || order.status === 'completed'
    );
  }
};

// Run tests
const runTests = async () => {
  try {
    console.log('Starting OrderService tests...');
    
    // Clear localStorage first to start fresh
    localStorage.clear();
    
    // TEST 1: Create an order
    console.log('\nTEST 1: Creating a new order...');
    const cartItems = [
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
    const moreCartItems = [
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