import { toast } from 'sonner';
import { OrderStatus, Rating, RatingStats } from '@/types';

// This is a mock WebSocket service for demo purposes
// In a real app, this would connect to a real WebSocket server

type MessageHandler = (data: any) => void;
type StatusUpdateHandler = (orderId: string, status: OrderStatus) => void;
type RatingUpdateHandler = (menuItemId: string, rating: Rating) => void;
type RatingStatsUpdateHandler = (menuItemId: string, stats: RatingStats) => void;
type ConnectionHandler = () => void;

export class WebSocketService {
  private static instance: WebSocketService;
  private connected: boolean = false;
  private messageHandlers: MessageHandler[] = [];
  private statusUpdateHandlers: StatusUpdateHandler[] = [];
  private ratingUpdateHandlers: RatingUpdateHandler[] = [];
  private ratingStatsUpdateHandlers: RatingStatsUpdateHandler[] = [];
  private connectionHandlers: ConnectionHandler[] = [];
  private disconnectionHandlers: ConnectionHandler[] = [];
  private reconnectInterval: number = 5000; // 5 seconds
  private reconnectTimer: NodeJS.Timeout | null = null;
  private mockSocket: any = null;
  
  // Singleton pattern
  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }
  
  // Connect to WebSocket server
  public connect(tableNumber: string): void {
    if (this.connected) return;
    
    // Simulate connection process
    console.log(`Connecting to WebSocket server for table ${tableNumber}...`);
    
    // In a real app, this would be a real WebSocket connection
    setTimeout(() => {
      this.connected = true;
      console.log('WebSocket connected successfully');
      
      // Notify connection handlers
      this.connectionHandlers.forEach(handler => handler());
      
      // Set up mock socket behavior - simulates server sending updates
      this.setupMockSocket(tableNumber);
      
    }, 1000);
  }
  
  // Disconnect from WebSocket server
  public disconnect(): void {
    if (!this.connected) return;
    
    console.log('Disconnecting from WebSocket...');
    
    // Clear mock behaviors
    if (this.mockSocket) {
      clearInterval(this.mockSocket);
      this.mockSocket = null;
    }
    
    // Clear reconnect timer if active
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // Mark as disconnected
    this.connected = false;
    
    // Notify disconnection handlers
    this.disconnectionHandlers.forEach(handler => handler());
    
    console.log('WebSocket disconnected');
  }
  
  // Check if connected
  public isConnected(): boolean {
    return this.connected;
  }
  
  // Add message handler
  public onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }
  
  // Add status update handler
  public onStatusUpdate(handler: StatusUpdateHandler): void {
    this.statusUpdateHandlers.push(handler);
  }
  
  // Add rating update handler
  public onRatingUpdate(handler: RatingUpdateHandler): void {
    this.ratingUpdateHandlers.push(handler);
  }
  
  // Add rating stats update handler
  public onRatingStatsUpdate(handler: RatingStatsUpdateHandler): void {
    this.ratingStatsUpdateHandlers.push(handler);
  }
  
  // Add connection handler
  public onConnect(handler: ConnectionHandler): void {
    this.connectionHandlers.push(handler);
  }
  
  // Add disconnection handler
  public onDisconnect(handler: ConnectionHandler): void {
    this.disconnectionHandlers.push(handler);
  }
  
  // Remove message handler
  public removeMessageHandler(handler: MessageHandler): void {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
  }
  
  // Remove status update handler
  public removeStatusUpdateHandler(handler: StatusUpdateHandler): void {
    this.statusUpdateHandlers = this.statusUpdateHandlers.filter(h => h !== handler);
  }
  
  // Remove rating update handler
  public removeRatingUpdateHandler(handler: RatingUpdateHandler): void {
    this.ratingUpdateHandlers = this.ratingUpdateHandlers.filter(h => h !== handler);
  }
  
  // Remove rating stats update handler
  public removeRatingStatsUpdateHandler(handler: RatingStatsUpdateHandler): void {
    this.ratingStatsUpdateHandlers = this.ratingStatsUpdateHandlers.filter(h => h !== handler);
  }
  
  // Remove connection handler
  public removeConnectionHandler(handler: ConnectionHandler): void {
    this.connectionHandlers = this.connectionHandlers.filter(h => h !== handler);
  }
  
  // Remove disconnection handler
  public removeDisconnectionHandler(handler: ConnectionHandler): void {
    this.disconnectionHandlers = this.disconnectionHandlers.filter(h => h !== handler);
  }
  
  // Send message to server (mock implementation)
  public sendMessage(message: any): void {
    if (!this.connected) {
      console.error('Cannot send message: WebSocket not connected');
      return;
    }
    
    console.log('Sending message:', message);
    
    // In a real app, this would send a message to the server
    // For demo, we'll just simulate a response
    setTimeout(() => {
      const response = {
        type: 'ack',
        message: 'Message received',
        data: message
      };
      
      // Notify message handlers
      this.messageHandlers.forEach(handler => handler(response));
    }, 500);
  }
  
  // Set up mock socket behavior
  private setupMockSocket(tableNumber: string): void {
    // Create a list of fake orders for simulation
    const fakeOrders = [
      { id: 'order-' + (Date.now() - 600000), tableNumber }, // 10 minutes ago
      { id: 'order-' + (Date.now() - 300000), tableNumber }, // 5 minutes ago
      { id: 'order-' + Date.now(), tableNumber } // Now
    ];
    
    // Simulate receiving status updates and rating updates randomly
    this.mockSocket = setInterval(() => {
      // Skip sometimes to make it more realistic
      if (Math.random() > 0.3) return;
      
      const updateTypes = ['status_update', 'rating_update', 'rating_stats_update'];
      const randomType = updateTypes[Math.floor(Math.random() * updateTypes.length)];
      
      let updateMessage: any;
      
      if (randomType === 'status_update') {
        // Pick a random order and status
        const randomOrder = fakeOrders[Math.floor(Math.random() * fakeOrders.length)];
        const statuses: OrderStatus[] = ['preparing', 'ready', 'delivered', 'completed'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        updateMessage = {
          type: 'status_update',
          orderId: randomOrder.id,
          status: randomStatus
        };
      } else if (randomType === 'rating_update') {
        // Simulate new rating received
        const mockRating: Rating = {
          _id: 'rating-' + Date.now(),
          userId: 'user-' + Math.random(),
          menuItemId: 'item-' + Math.floor(Math.random() * 10),
          restaurantId: 'restaurant-1',
          rating: Math.floor(Math.random() * 5) + 1,
          comment: 'Mock review comment',
          isVerifiedPurchase: Math.random() > 0.5,
          helpfulCount: Math.floor(Math.random() * 10),
          unhelpfulCount: Math.floor(Math.random() * 3),
          helpfulVotes: [],
          unhelpfulVotes: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: {
            _id: 'user-' + Math.random(),
            firstName: 'Mock',
            lastName: 'User'
          }
        };
        
        updateMessage = {
          type: 'rating_update',
          menuItemId: mockRating.menuItemId,
          rating: mockRating
        };
      } else {
        // Simulate rating stats update
        const mockStats: RatingStats = {
          averageRating: Math.random() * 4 + 1,
          totalReviews: Math.floor(Math.random() * 100) + 1,
          ratingDistribution: {
            1: Math.floor(Math.random() * 10),
            2: Math.floor(Math.random() * 10),
            3: Math.floor(Math.random() * 15),
            4: Math.floor(Math.random() * 20),
            5: Math.floor(Math.random() * 25)
          }
        };
        
        updateMessage = {
          type: 'rating_stats_update',
          menuItemId: 'item-' + Math.floor(Math.random() * 10),
          stats: mockStats
        };
      }
      
      console.log('Received WebSocket message:', updateMessage);
      
      // Notify message handlers
      this.messageHandlers.forEach(handler => handler(updateMessage));
      
      // Notify status update handlers
      if (updateMessage.type === 'status_update') {
        this.statusUpdateHandlers.forEach(handler => 
          handler(updateMessage.orderId, updateMessage.status)
        );
        
        // Show toast notification
        if (updateMessage.status === 'ready') {
          toast.success(`Order ${updateMessage.orderId.slice(-4)} is ready!`);
        } else if (updateMessage.status === 'delivered') {
          toast.success(`Order ${updateMessage.orderId.slice(-4)} has been delivered!`);
        }
      }
      
      // Handle rating updates
      if (updateMessage.type === 'rating_update') {
        this.ratingUpdateHandlers.forEach(handler => 
          handler(updateMessage.menuItemId, updateMessage.rating)
        );
        
        // Show toast notification for new ratings
        toast.success(`New rating received for ${updateMessage.rating.menuItemName || 'menu item'}!`);
      }
      
      // Handle rating stats updates
      if (updateMessage.type === 'rating_stats_update') {
        this.ratingStatsUpdateHandlers.forEach(handler => 
          handler(updateMessage.menuItemId, updateMessage.stats)
        );
      }
    }, 10000); // Every 10 seconds, randomly update
  }
}

export default WebSocketService.getInstance(); 