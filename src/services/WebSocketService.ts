import { toast } from 'sonner';
import { OrderStatus } from '@/types';

// This is a mock WebSocket service for demo purposes
// In a real app, this would connect to a real WebSocket server

type MessageHandler = (data: any) => void;
type StatusUpdateHandler = (orderId: string, status: OrderStatus) => void;
type ConnectionHandler = () => void;

export class WebSocketService {
  private static instance: WebSocketService;
  private connected: boolean = false;
  private messageHandlers: MessageHandler[] = [];
  private statusUpdateHandlers: StatusUpdateHandler[] = [];
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
    
    // Simulate receiving status updates randomly
    this.mockSocket = setInterval(() => {
      // Skip sometimes to make it more realistic
      if (Math.random() > 0.3) return;
      
      // Pick a random order and status
      const randomOrder = fakeOrders[Math.floor(Math.random() * fakeOrders.length)];
      const statuses: OrderStatus[] = ['preparing', 'ready', 'delivered', 'completed'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      // Create update message
      const updateMessage = {
        type: 'status_update',
        orderId: randomOrder.id,
        status: randomStatus
      };
      
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
    }, 10000); // Every 10 seconds, randomly update
  }
}

export default WebSocketService.getInstance(); 