import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { ClipboardList, Clock, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

// Define the Order type
interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  date: string;
  items: OrderItem[];
  status: 'preparing' | 'ready' | 'delivered' | 'cancelled';
  total: number;
}

// Dummy orders data
const dummyOrders: Order[] = [
  {
    id: 'ORD-1234',
    date: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
    items: [
      { id: '1', name: 'Margherita Pizza', quantity: 1, price: 14.99 },
      { id: '4', name: 'Truffle French Fries', quantity: 1, price: 8.99 },
      { id: '8', name: 'Fresh Berry Smoothie', quantity: 2, price: 7.99 }
    ],
    status: 'preparing',
    total: 39.96
  },
  {
    id: 'ORD-1233',
    date: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    items: [
      { id: '3', name: 'Grilled Salmon', quantity: 1, price: 24.99 },
      { id: '10', name: 'Truffle Fries', quantity: 1, price: 8.99 }
    ],
    status: 'ready',
    total: 33.98
  },
  {
    id: 'ORD-1228',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    items: [
      { id: '6', name: 'Tiramisu', quantity: 2, price: 8.99 },
      { id: '9', name: 'Signature Cocktail', quantity: 2, price: 12.99 }
    ],
    status: 'delivered',
    total: 43.96
  }
];

// Format date to relative time
const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
};

// Status badge component
const StatusBadge: React.FC<{ status: Order['status'] }> = ({ status }) => {
  switch (status) {
    case 'preparing':
      return <Badge className="bg-amber-500 hover:bg-amber-600">Preparing</Badge>;
    case 'ready':
      return <Badge className="bg-marian-blue hover:bg-marian-blue/90">Ready</Badge>;
    case 'delivered':
      return <Badge className="bg-green-600 hover:bg-green-700">Delivered</Badge>;
    case 'cancelled':
      return <Badge className="bg-destructive hover:bg-destructive/90">Cancelled</Badge>;
    default:
      return null;
  }
};

const MyOrders: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    // Still show dummy orders instead of redirecting to login
    // This is to fulfill the requirement
  }

    return (
    <div className="container px-4 py-8 mt-16">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Orders</h1>
        <Button variant="outline" className="border-marian-blue text-marian-blue hover:bg-marian-blue/10">
          <ClipboardList size={16} className="mr-2" />
          Order History
        </Button>
      </div>

      {dummyOrders.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No orders yet</h3>
          <p className="text-muted-foreground mb-6">
            When you place an order, it will appear here.
          </p>
          <Button asChild className="bg-marian-blue hover:bg-marian-blue/90">
            <Link to="/">Browse Menu</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {dummyOrders.map((order) => (
            <div key={order.id} className="border border-border rounded-xl overflow-hidden bg-background">
              {/* Order header */}
              <div className="bg-muted/30 p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{order.id}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <Clock size={14} className="mr-1" />
                    <span>{formatRelativeTime(order.date)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">${order.total.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
              
              {/* Order items */}
              <div className="divide-y divide-border">
                {order.items.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-medium">
                        {item.quantity}
                      </div>
                      <span className="ml-3">{item.name}</span>
                    </div>
                    <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              {/* Order footer */}
              <div className="p-4 border-t border-border flex justify-between items-center">
                {order.status === 'preparing' && (
                  <div className="flex items-center text-muted-foreground">
                    <Clock size={16} className="mr-1" />
                    <span>Estimated ready in 10-15 min</span>
                  </div>
                )}
                {order.status === 'ready' && (
                  <div className="flex items-center text-marian-blue">
                    <CheckCircle2 size={16} className="mr-1" />
                    <span>Ready for pickup!</span>
                  </div>
                )}
                {order.status === 'delivered' && (
                  <div className="flex items-center text-muted-foreground">
                    <CheckCircle2 size={16} className="mr-1" />
                    <span>Completed</span>
              </div>
                )}
                <Button variant="ghost" className="text-marian-blue hover:bg-marian-blue/10">
                  Details
                  <ChevronRight size={16} className="ml-1" />
                </Button>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};

export default MyOrders;
