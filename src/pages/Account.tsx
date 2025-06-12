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
          try {
            const customerResponse = await customerAuthService.getCurrentUser();
            if (customerResponse && customerResponse.success && customerResponse.user) {
              const userData = customerResponse.user;
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
              const authData = await AuthService.getCurrentUser();
              if (authData && (authData.success || authData.id)) {
                // Handle both wrapped and direct user data formats
                const userData = authData.user || authData;
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
    <div className="container mx-auto px-4 py-8 mt-16 mb-20 max-w-6xl">
      {/* Top navigation bar with gradient background */}
      <div className="flex justify-between items-center mb-8 p-4 bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl shadow-md text-white">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleGoBack}
          className="text-white hover:text-white hover:bg-white/20 transition-all"
        >
          <ArrowLeft className="mr-2" size={18} />
          Back to menu
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleLogout}
          className="text-white hover:text-white hover:bg-white/20 transition-all"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left column - User info with improved styling */}
        <div className="w-full lg:w-1/3 space-y-8">
          {/* User profile card with enhanced visuals */}
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="bg-gradient-to-br from-purple-500 to-purple-800 p-6 text-white">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-20 w-20 border-4 border-white shadow-md">
                  <AvatarFallback className="bg-white text-purple-700 text-xl font-bold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{safeUser.name}</h2>
                  <p className="text-purple-100 text-sm truncate">{safeUser.email}</p>
                </div>
              </div>
              
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 py-1 px-3">
                {userTier.name} Member
              </Badge>
            </div>
            
            <CardContent className="p-6">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-base font-medium">Loyalty Points</span>
                  <span className="text-xl font-bold text-purple-600">{safeUser.loyaltyPoints}</span>
                </div>
                
                <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-700" 
                    style={{ 
                      width: `${Math.min(100, (safeUser.loyaltyPoints / 10))}%` 
                    }}
                  />
                </div>
                
                {/* For development only */}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full text-xs border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
                  onClick={handleAddTestPoints}
                >
                  Add Test Points (Development Only)
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div key="member-since" className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                  <span className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Member since</span>
                  <span className="font-medium">
                    {safeUser.createdAt ? format(new Date(safeUser.createdAt), 'MMM dd, yyyy') : 'N/A'}
                  </span>
                </div>
                
                <div key="total-orders" className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                  <span className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Total orders</span>
                  <span className="font-medium">{safeUser.orders ? safeUser.orders.length : 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Rewards card with improved visual appeal */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-700 text-white p-5">
              <CardTitle className="text-lg flex items-center">
                <Award className="h-5 w-5 mr-2" />
                Available Rewards
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg flex justify-between items-center">
                <div>
                  <h4 className="text-base font-medium text-purple-800 dark:text-purple-300">Free Drink</h4>
                  <p className="text-sm text-purple-600 dark:text-purple-400">Any drink on the menu</p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleRedeemPoints(200, 'Free Drink')}
                  disabled={safeUser.loyaltyPoints < 200}
                  className="bg-white border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800 disabled:opacity-50"
                >
                  200 pts
                </Button>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg flex justify-between items-center">
                <div>
                  <h4 className="text-base font-medium text-purple-800 dark:text-purple-300">10% Off Your Order</h4>
                  <p className="text-sm text-purple-600 dark:text-purple-400">Valid for one order</p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleRedeemPoints(350, '10% Off Your Order')}
                  disabled={safeUser.loyaltyPoints < 350}
                  className="bg-white border-amber-200 text-amber-700 hover:bg-amber-100 hover:text-amber-800 disabled:opacity-50"
                >
                  350 pts
                </Button>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg flex justify-between items-center">
                <div>
                  <h4 className="text-base font-medium text-purple-800 dark:text-purple-300">Free Dessert</h4>
                  <p className="text-sm text-purple-600 dark:text-purple-400">Any dessert on the menu</p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleRedeemPoints(450, 'Free Dessert')}
                  disabled={safeUser.loyaltyPoints < 450}
                  className="bg-white border-amber-200 text-amber-700 hover:bg-amber-100 hover:text-amber-800 disabled:opacity-50"
                >
                  450 pts
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right column - Tabs for Profile and Orders with enhanced styling */}
        <div className="w-full lg:w-2/3">
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="pb-0 pt-0 px-0">
              <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="bg-gray-50 dark:bg-gray-800 px-6 pt-6">
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/80 dark:bg-gray-700/50 p-1 rounded-lg">
                    <TabsTrigger 
                      value="profile" 
                      className="flex items-center justify-center py-3 rounded-md data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </TabsTrigger>
                    <TabsTrigger 
                      value="orders" 
                      className="flex items-center justify-center py-3 rounded-md data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                    >
                      <History className="h-4 w-4 mr-2" />
                      Order History
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="profile">
                  <div className="bg-gray-50 dark:bg-gray-800 px-6 pt-6">
                    <div className="px-1">
                      <div className="flex items-center mb-4">
                        <User className="h-6 w-6 mr-3 text-purple-600" />
                        <div>
                          <CardTitle className="text-2xl font-bold">My Profile</CardTitle>
                          <CardDescription className="text-base">Manage your account information</CardDescription>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</label>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-lg font-medium">{safeUser.name}</span>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email Address</label>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-lg font-medium truncate max-w-[80%]">{safeUser.email}</span>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Password</label>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-lg font-medium">••••••••</span>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 block">Communication Preferences</label>
                        <div className="space-y-3">
                          <div className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors">
                            <input 
                              type="checkbox" 
                              id="emailNotif" 
                              className="mr-3 h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" 
                              defaultChecked 
                            />
                            <label htmlFor="emailNotif" className="text-base cursor-pointer flex-1">Email notifications</label>
                          </div>
                          <div className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors">
                            <input 
                              type="checkbox" 
                              id="smsNotif" 
                              className="mr-3 h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" 
                            />
                            <label htmlFor="smsNotif" className="text-base cursor-pointer flex-1">SMS notifications</label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </TabsContent>
                  
                <TabsContent value="orders">
                  <div className="bg-gray-50 dark:bg-gray-800 px-6 pt-6">
                    <div className="px-1">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <History className="h-6 w-6 mr-3 text-purple-600" />
                          <div>
                            <CardTitle className="text-2xl font-bold">Order History</CardTitle>
                            <CardDescription className="text-base">Review your past orders</CardDescription>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRefreshOrders}
                          disabled={isRefreshing}
                          className="flex items-center gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
                        >
                          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                          {isRefreshing ? 'Refreshing' : 'Refresh'}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <CardContent className="p-6">
                    {/* Debug info for development - styled better */}
                    <div className="mb-6 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800 text-xs">
                      <p className="text-purple-700 dark:text-purple-300 font-medium">Debug: {orders.length} orders found</p>
                      <button 
                        onClick={handleRefreshOrders}
                        className="mt-2 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded text-xs font-medium transition-colors"
                        disabled={isRefreshing}
                      >
                        {isRefreshing ? 'Refreshing...' : 'Refresh Orders'}
                      </button>
                    </div>
                    
                    {orders.length > 0 ? (
                      <div className="space-y-6">
                        {orders.map((order) => (
                          <Card key={order.id} className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
                            <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-5 py-3 flex justify-between items-center text-white">
                              <div>
                                <span className="text-base font-bold">
                                  Order #{order.id ? order.id.substring(0, 8) : 'Unknown'}
                                </span>
                                <span className="text-sm text-purple-100 block">
                                  {order.timestamp ? format(new Date(order.timestamp), 'MMM dd, yyyy - hh:mm a') : 'N/A'}
                                </span>
                              </div>
                              <Badge className={
                                String(order.status).toLowerCase() === 'completed' ? 'bg-white/20 hover:bg-white/30 text-white border-0' :
                                String(order.status).toLowerCase() === 'delivered' ? 'bg-purple-200 text-purple-800 border-0' :
                                String(order.status).toLowerCase() === 'ready' ? 'bg-purple-200 text-purple-800 border-0' : 'bg-white/20 hover:bg-white/30 text-white border-0'
                              }>
                                {order.status ? `${order.status.charAt(0).toUpperCase()}${order.status.slice(1)}` : 'Pending'}
                              </Badge>
                            </div>
                            <CardContent className="p-5">
                              <div className="space-y-3">
                                {order.items && order.items.length > 0 ? order.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-start text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                                    <div className="flex-1">
                                      <span className="font-medium">
                                        {item.quantity}x {item.name}
                                      </span>
                                      {item.modifiers && item.modifiers.length > 0 && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400 block mt-1 pl-4">
                                          {item.modifiers.map(mod => mod.name).join(', ')}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-bold text-purple-700 dark:text-purple-400">${(item.price * item.quantity).toFixed(2)}</span>
                                  </div>
                                )) : (
                                  <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No items found</div>
                                )}
                              </div>
                              <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                <span className="text-base font-medium">Total</span>
                                <span className="text-xl font-bold text-purple-700 dark:text-purple-400">${(order.total || 0).toFixed(2)}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <div className="bg-white dark:bg-gray-700 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                          <History className="h-10 w-10 text-purple-500" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">No orders yet</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-base mb-6">You haven't placed any orders yet</p>
                        <Button 
                          onClick={() => navigate('/menu')} 
                          className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-full font-medium"
                        >
                          Browse Menu
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </TabsContent>
              </Tabs>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Account;
