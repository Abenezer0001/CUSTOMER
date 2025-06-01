import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrdersContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, LogOut, Gift, History, User, Award, Edit, RefreshCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useTableInfo } from '@/context/TableContext';
import { AuthService } from '@/services/AuthService';
import customerAuthService from '@/api/customerAuthService';

const Account: React.FC = () => {
  const { user, logout, addLoyaltyPoints, isAuthenticated, isLoading } = useAuth();
  // Ensure orders is always an array even if it's null/undefined
  const { orders = [] } = useOrders();
  const [activeTab, setActiveTab] = useState("profile");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  const { tableId } = useTableInfo();
  
  const { pathname } = window.location;
  
  // Check for auth cookies directly
  const hasAuthCookie = () => {
    const cookies = document.cookie.split(';');
    return cookies.some(cookie => 
      cookie.trim().startsWith('auth_token=') || 
      cookie.trim().startsWith('access_token=')
    );
  };

  // Handle navigation in useEffect to avoid side effects during render
  useEffect(() => {
    // If we're loading, don't do anything yet
    if (isLoading) return;
    
    const attemptAuthWithCookies = async () => {
      // First attempt a token refresh if we have cookies but aren't authenticated
      if (!isAuthenticated && hasAuthCookie()) {
        console.log('Auth cookie found but not authenticated in state - attempting token refresh first');
        try {
          // Try customer auth service first (for Google sign-in users)
          let userData = null;
          try {
            const customerResponse = await customerAuthService.getCurrentUser();
            if (customerResponse && customerResponse.success && customerResponse.user) {
              userData = customerResponse.user;
              console.log('Successfully retrieved user data from customer service');
              
              // Update auth state directly - this should trigger a re-render with isAuthenticated=true
              window.dispatchEvent(new CustomEvent('auth-state-changed', { 
                detail: { isAuthenticated: true, user: userData } 
              }));
              return; // Exit early as we've successfully authenticated
            }
          } catch (customerError) {
            console.log('Customer auth failed, trying regular AuthService');
            // Fallback to regular AuthService
            try {
            await AuthService.refreshToken();
            userData = await AuthService.getCurrentUser();
          if (userData) {
                console.log('Successfully retrieved user data from AuthService');
            window.dispatchEvent(new CustomEvent('auth-state-changed', { 
              detail: { isAuthenticated: true, user: userData } 
            }));
                return;
              }
            } catch (authError) {
              console.log('AuthService also failed:', authError);
            }
          }
        } catch (refreshError) {
          console.error('Error during token refresh:', refreshError);
        }
      }
      
      // If we get here and still not authenticated, check if we should redirect
      if (!isAuthenticated && !hasAuthCookie()) {
        console.log('No authentication found, redirecting to login from account page');
          // Store the current path to redirect back after login
          navigate('/login', { state: { from: pathname }, replace: true });
      }
    };
    
    attemptAuthWithCookies();
  }, [isAuthenticated, isLoading, pathname, navigate]);
  
  // Show loading state while checking authentication
  if (isLoading) {
    return <div className="container mx-auto px-4 py-6 mt-16 mb-20">Loading...</div>;
  }
  
  // If not authenticated and no auth cookie, don't render anything (will be redirected by the effect)
  if (!isAuthenticated && !hasAuthCookie()) {
    return null;
  }
  
  // If we have an auth cookie but no user data yet, show loading
  if (!user && hasAuthCookie()) {
    return <div className="container mx-auto px-4 py-6 mt-16 mb-20">Loading user data...</div>;
  }
  
  // Create a safe user object with defaults to prevent null reference errors
  const safeUser = user || {
    name: 'Guest User',
    email: 'No email available',
    loyaltyPoints: 0,
    orders: [],
    createdAt: new Date().toISOString(),
    firstName: '',
    lastName: ''
  };
  
  // Ensure we display the full name if firstName and lastName are available
  if (safeUser.firstName && safeUser.lastName && !safeUser.name) {
    safeUser.name = `${safeUser.firstName} ${safeUser.lastName}`;
  }
  
  // Get initials for avatar fallback
  const getInitials = () => {
    // First try to use name if it contains a space (likely first and last name)
    if (safeUser.name && safeUser.name.includes(' ')) {
      const nameParts = safeUser.name.split(' ');
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    } 
    // Otherwise use first 2 chars of name or email
    else if (safeUser.name) {
      return safeUser.name.substring(0, 2).toUpperCase();
    } 
    else if (safeUser.email) {
      return safeUser.email.substring(0, 2).toUpperCase();
    }
    return 'GU'; // Guest User fallback
  };
  
  const handleLogout = async () => {
    try {
      // Call the logout function from auth context
      await logout();
      
      // Clear any table-related data from localStorage
      localStorage.removeItem('tableInfo');
      
      // Redirect to login page
      toast.success('Logged out successfully');
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error during logout:', error);
      toast.error('There was an issue logging out');
      
      // Still redirect to login even on error
      navigate('/login', { replace: true });
    }
  };
  
  // Function to manually refresh orders without redirecting to login
  const handleRefreshOrders = async () => {
    setIsRefreshing(true);
    try {
      console.log('Manually refreshing orders...');
      
      const orderApiUrl = import.meta.env.VITE_ORDER_API_URL || 'http://localhost:3001/api/orders';
      const response = await fetch(`${orderApiUrl}/my-orders`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Orders refresh result:', data);
        if (Array.isArray(data) && data.length > 0) {
          window.dispatchEvent(new CustomEvent('orders-updated', { 
            detail: { orders: data } 
          }));
          toast.success(`Found ${data.length} orders`);
        } else {
          toast.success('Orders refreshed - no orders found');
        }
      } else {
        throw new Error(`Failed to refresh orders: ${response.status}`);
      }
    } catch (error) {
      console.error('Error refreshing orders:', error);
      toast.error('Failed to refresh orders');
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Mock function to redeem points (in a real app, this would call an API)
  const handleRedeemPoints = (points: number, reward: string) => {
    if (safeUser.loyaltyPoints >= points) {
      toast.success(`Redeemed ${reward} for ${points} points!`);
      // In a real app, this would call an API to update user's loyalty points
    } else {
      toast.error(`Not enough loyalty points to redeem ${reward}`);
    }
  };
  
  // Function to determine loyalty tier
  const getLoyaltyTier = (points: number) => {
    if (points >= 1000) {
      return { name: 'Platinum', color: 'bg-gray-700 text-gray-50' };
    } else if (points >= 500) {
      return { name: 'Gold', color: 'bg-amber-500 text-amber-50' };
    } else if (points >= 200) {
      return { name: 'Silver', color: 'bg-slate-400 text-slate-50' };
    }
    return { name: 'Bronze', color: 'bg-amber-700 text-amber-50' };
  };
  
  const userTier = getLoyaltyTier(safeUser.loyaltyPoints);
  
  // Add some test loyalty points (would remove in production)
  const handleAddTestPoints = () => {
    if (addLoyaltyPoints) {
      addLoyaltyPoints(50);
      toast.success('50 loyalty points added!');
    }
  };
  const handleGoBack = () =>{
    const storedTableId = localStorage.getItem('currentTableId');
    const effectiveTableId = tableId || storedTableId || '';
    navigate(`/?table=${effectiveTableId}`);
  }
  return (
    <div className="container mx-auto px-4 py-6 mt-16 mb-20">
      <div className="flex justify-between items-center mb-6">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleGoBack}
          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="mr-2" size={16} />
          Back to menu
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleLogout}
          className="text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <LogOut className="h-4 w-4 mr-1" />
          Logout
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left column - User info */}
        <div className="w-full md:w-1/3">
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <Avatar className="h-16 w-16 mb-2">
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-700 dark:text-emerald-100 text-lg">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                
                <Badge className={`${userTier.color} mt-1`}>
                  {userTier.name} Member
                </Badge>
              </div>
              
              <CardTitle>{safeUser.name}</CardTitle>
              <CardDescription>{safeUser.email}</CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Loyalty Points</span>
                  <span className="font-medium">{safeUser.loyaltyPoints}</span>
                </div>
                
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 dark:from-emerald-600 dark:to-emerald-400" 
                    style={{ 
                      width: `${Math.min(100, (safeUser.loyaltyPoints / 10))}%` 
                    }}
                  />
                </div>
                
                {/* For development only */}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full text-xs"
                  onClick={handleAddTestPoints}
                >
                  Add Test Points (Development Only)
                </Button>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Member since:</span>
                  <span className="float-right">
                    {safeUser.createdAt ? format(new Date(safeUser.createdAt), 'MMM dd, yyyy') : 'N/A'}
                  </span>
                </div>
                
                <div className="text-sm">
                  <span className="text-muted-foreground">Total orders:</span>
                  <span className="float-right">{safeUser.orders ? safeUser.orders.length : 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Award className="h-4 w-4 mr-2 text-emerald-600" />
                Available Rewards
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium">Free Appetizer</h4>
                  <p className="text-xs text-muted-foreground">Any appetizer up to $12</p>
                </div>
                <Button
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleRedeemPoints(200, 'Free Appetizer')}
                  disabled={safeUser.loyaltyPoints < 200}
                >
                  200 pts
                </Button>
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium">10% Off Your Order</h4>
                  <p className="text-xs text-muted-foreground">Valid for one order</p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleRedeemPoints(350, '10% Off Your Order')}
                  disabled={safeUser.loyaltyPoints < 350}
                >
                  350 pts
                </Button>
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium">Free Dessert</h4>
                  <p className="text-xs text-muted-foreground">Any dessert on the menu</p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleRedeemPoints(450, 'Free Dessert')}
                  disabled={safeUser.loyaltyPoints < 450}
                >
                  450 pts
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right column - Tabs for Profile and Orders */}
        <div className="w-full md:w-2/3">
          <Card>
            <CardHeader className="pb-2">
              <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="profile" className="flex items-center justify-center">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </TabsTrigger>
                  <TabsTrigger value="orders" className="flex items-center justify-center">
                    <History className="h-4 w-4 mr-2" />
                    Order History
                  </TabsTrigger>
                </TabsList>
                
                <div>
                  <TabsContent value="profile" className="m-0">
                    <CardTitle className="text-xl mb-1">My Profile</CardTitle>
                    <CardDescription>Manage your account information</CardDescription>
                  </TabsContent>
                  
                  <TabsContent value="orders" className="m-0">
                    <div className="flex items-center justify-between">
                      <div>
                    <CardTitle className="text-xl mb-1">Order History</CardTitle>
                    <CardDescription>Review your past orders</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshOrders}
                        disabled={isRefreshing}
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? 'Refreshing' : 'Refresh'}
                      </Button>
                    </div>
                  </TabsContent>
                </div>
              
                <CardContent className="pt-6">
                  <TabsContent value="profile" className="m-0">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Full Name</label>
                        <div className="flex items-center justify-between mt-1">
                          <span>{safeUser.name}</span>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <label className="text-sm font-medium">Email Address</label>
                        <div className="flex items-center justify-between mt-1">
                          <span>{safeUser.email}</span>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <label className="text-sm font-medium">Password</label>
                        <div className="flex items-center justify-between mt-1">
                          <span>••••••••</span>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <label className="text-sm font-medium">Communication Preferences</label>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center">
                            <input type="checkbox" id="emailNotif" className="mr-2" defaultChecked />
                            <label htmlFor="emailNotif" className="text-sm">Email notifications</label>
                          </div>
                          <div className="flex items-center">
                            <input type="checkbox" id="smsNotif" className="mr-2" />
                            <label htmlFor="smsNotif" className="text-sm">SMS notifications</label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="orders" className="m-0">
                    {/* Debug info for development */}
                    <div className="mb-4 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                      <p>Debug: {orders.length} orders found</p>
                      <button 
                        onClick={handleRefreshOrders}
                        className="mt-1 px-2 py-1 bg-blue-500 text-white rounded text-xs"
                        disabled={isRefreshing}
                      >
                        {isRefreshing ? 'Refreshing...' : 'Refresh Orders'}
                      </button>
                    </div>
                    
                    {orders.length > 0 ? (
                      <div className="space-y-4">
                        {orders.map((order) => (
                          <Card key={order.id} className="overflow-hidden">
                            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 flex justify-between items-center">
                              <div>
                                <span className="text-sm font-medium">
                                  Order #{order.id ? order.id.substring(0, 8) : 'Unknown'}
                                </span>
                                <span className="text-xs text-muted-foreground block">
                                  {order.timestamp ? format(new Date(order.timestamp), 'MMM dd, yyyy - hh:mm a') : 'N/A'}
                                </span>
                              </div>
                              <Badge variant={
                                String(order.status).toLowerCase() === 'completed' ? 'default' :
                                String(order.status).toLowerCase() === 'delivered' ? 'secondary' :
                                String(order.status).toLowerCase() === 'ready' ? 'outline' : 'secondary'
                              }>
                                {order.status ? `${order.status.charAt(0).toUpperCase()}${order.status.slice(1)}` : 'Pending'}
                              </Badge>
                            </div>
                            <CardContent className="p-4">
                              <div className="space-y-2">
                                {order.items && order.items.length > 0 ? order.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-sm">
                                    <span>
                                      {item.quantity}x {item.name}
                                      {item.modifiers && item.modifiers.length > 0 && (
                                        <span className="text-xs text-muted-foreground block pl-4">
                                          {item.modifiers.map(mod => mod.name).join(', ')}
                                        </span>
                                      )}
                                    </span>
                                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                                  </div>
                                )) : (
                                  <div className="text-sm text-muted-foreground">No items found</div>
                                )}
                              </div>
                              <Separator className="my-3" />
                              <div className="flex justify-between font-medium">
                                <span>Total</span>
                                <span>${(order.total || 0).toFixed(2)}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <History className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                        <h3 className="text-lg font-medium mb-2">No orders yet</h3>
                        <p className="text-muted-foreground text-sm mb-4">You haven't placed any orders yet</p>
                        <Button onClick={() => navigate('/menu')}>Browse Menu</Button>
                      </div>
                    )}
                  </TabsContent>
                </CardContent>
              </Tabs>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Account;
