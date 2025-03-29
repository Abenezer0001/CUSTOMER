
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrdersContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, LogOut, Gift, History, User, Award, Edit } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';

const Account: React.FC = () => {
  const { user, logout, addLoyaltyPoints } = useAuth();
  const { orders } = useOrders();
  const [activeTab, setActiveTab] = useState("profile");
  const navigate = useNavigate();
  
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 mt-16 text-center">
        <h2 className="text-xl font-medium mb-4">User not found</h2>
        <p className="text-muted-foreground mb-6">Please log in to view your account</p>
        <Button onClick={() => navigate('/login')}>Go to Login</Button>
      </div>
    );
  }
  
  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };
  
  const handleLogout = () => {
    logout();
    navigate('/');
  };
  
  // Mock function to redeem points (in a real app, this would call an API)
  const handleRedeemPoints = (points: number, reward: string) => {
    if (user.loyaltyPoints >= points) {
      toast.success(`Redeemed ${reward} for ${points} points!`);
      // In a real app, this would call an API to update user's loyalty points
    } else {
      toast.error(`Not enough loyalty points to redeem ${reward}`);
    }
  };
  
  // Function to determine loyalty tier
  const getLoyaltyTier = (points: number) => {
    if (points >= 1000) return { name: 'Platinum', color: 'bg-zinc-300 text-zinc-900' };
    if (points >= 500) return { name: 'Gold', color: 'bg-amber-400 text-amber-950' };
    if (points >= 200) return { name: 'Silver', color: 'bg-gray-400 text-gray-900' };
    return { name: 'Bronze', color: 'bg-amber-700 text-amber-50' };
  };
  
  const userTier = getLoyaltyTier(user.loyaltyPoints);
  
  // Add some test loyalty points (would remove in production)
  const handleAddTestPoints = () => {
    addLoyaltyPoints(50);
    toast.success('Added 50 test loyalty points!');
  };
  
  return (
    <div className="container mx-auto px-4 py-6 mt-16 mb-20">
      <div className="flex justify-between items-center mb-6">
        <Link to="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
          <ArrowLeft className="mr-2" size={16} />
          Back to menu
        </Link>
        
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
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                
                <Badge className={`${userTier.color} mt-1`}>
                  {userTier.name} Member
                </Badge>
              </div>
              
              <CardTitle>{user.name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Loyalty Points</span>
                  <span className="font-medium">{user.loyaltyPoints}</span>
                </div>
                
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 dark:from-emerald-600 dark:to-emerald-400" 
                    style={{ 
                      width: `${Math.min(100, (user.loyaltyPoints / 10))}%` 
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
                    {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                  </span>
                </div>
                
                <div className="text-sm">
                  <span className="text-muted-foreground">Total orders:</span>
                  <span className="float-right">{user.orders.length}</span>
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
                  disabled={user.loyaltyPoints < 200}
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
                  disabled={user.loyaltyPoints < 350}
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
                  disabled={user.loyaltyPoints < 450}
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
                    <CardTitle className="text-xl mb-1">Order History</CardTitle>
                    <CardDescription>Review your past orders</CardDescription>
                  </TabsContent>
                </div>
              
                <CardContent className="pt-6">
                  <TabsContent value="profile" className="m-0">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Full Name</label>
                        <div className="flex items-center justify-between mt-1">
                          <span>{user.name}</span>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <label className="text-sm font-medium">Email Address</label>
                        <div className="flex items-center justify-between mt-1">
                          <span>{user.email}</span>
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
                    {orders.length > 0 ? (
                      <div className="space-y-4">
                        {orders.map((order) => (
                          <Card key={order.id} className="overflow-hidden">
                            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 flex justify-between items-center">
                              <div>
                                <span className="text-sm font-medium">
                                  Order #{order.id.substring(0, 8)}
                                </span>
                                <span className="text-xs text-muted-foreground block">
                                  {format(new Date(order.timestamp), 'MMM dd, yyyy - hh:mm a')}
                                </span>
                              </div>
                              <Badge variant={
                                order.status === 'completed' ? 'default' :
                                order.status === 'delivered' ? 'secondary' :
                                order.status === 'ready' ? 'outline' : 'secondary'
                              }>
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </Badge>
                            </div>
                            <CardContent className="p-4">
                              <div className="space-y-2">
                                {order.items.map((item, idx) => (
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
                                ))}
                              </div>
                              <Separator className="my-3" />
                              <div className="flex justify-between font-medium">
                                <span>Total</span>
                                <span>${order.total.toFixed(2)}</span>
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
