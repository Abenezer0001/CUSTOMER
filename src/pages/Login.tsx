import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, User } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, googleLogin, customerLogin, customerGoogleLogin, guestLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Get table ID from location state or localStorage
      const locationState = location.state as { returnUrl?: string; tableId?: string } | null;
      const tableIdFromState = locationState?.tableId;
      const currentTableId = localStorage.getItem('currentTableId');
      const tableInfoStr = localStorage.getItem('tableInfo');
      let tableInfo;
      
      try {
        if (tableInfoStr) {
          tableInfo = JSON.parse(tableInfoStr);
        }
      } catch (e) {
        console.error('Error parsing tableInfo:', e);
      }
      
      // Use the first available table ID
      const effectiveTableId = tableIdFromState || currentTableId || (tableInfo?.id) || '';
      
      console.log('Login with table context:', {
        tableIdFromState,
        currentTableId,
        tableInfoFromStorage: tableInfo?.id,
        effectiveTableId
      });
      
      // Store table ID in all possible locations for maximum compatibility
      if (effectiveTableId) {
        localStorage.setItem('currentTableId', effectiveTableId);
        localStorage.setItem('tableInfo', JSON.stringify({ id: effectiveTableId }));
        console.log('Stored table ID in localStorage before login:', effectiveTableId);
      }
      
      // First try customer-specific login endpoint
      const customerSuccess = await customerLogin(email, password);
      
      if (customerSuccess) {
        // Check if we have a return URL from the state
        const returnUrl = locationState?.returnUrl;
        
        if (returnUrl && returnUrl !== '/login') {
          console.log(`Redirecting to return URL: ${returnUrl}`);
          navigate(returnUrl);
        } else if (effectiveTableId) {
          // If we have a table ID, redirect to the table page
          console.log(`Redirecting to table page with ID: ${effectiveTableId}`);
          navigate(`/?table=${effectiveTableId}`);
        } else {
          // Default success page
          navigate('/login/success');
        }
        return;
      }
      
      // Fall back to regular login if customer login fails
      // This maintains backward compatibility
      const regularSuccess = await login(email, password);
      
      if (regularSuccess) {
        // Similar redirection logic for regular login
        const returnUrl = locationState?.returnUrl;
        
        if (returnUrl && returnUrl !== '/login') {
          navigate(returnUrl);
        } else if (effectiveTableId) {
          navigate(`/?table=${effectiveTableId}`);
        } else {
          navigate('/login/success');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleGoogleLogin = () => {
    googleLogin(); // Directly call the regular Google login
  };
  
  const handleGuestContinue = async () => {
    setIsSubmitting(true);
    try {
      // Get table ID from local storage (if previously scanned)
      const tableId = localStorage.getItem('tableId');
      
      // Call guestLogin function to create a guest token
      const success = await guestLogin(tableId || undefined);
      
      if (success) {
        toast.success('Continuing as guest');
        navigate('/');
      } else {
        toast.error('Failed to create guest session');
      }
    } catch (error) {
      console.error('Error creating guest session:', error);
      toast.error('Failed to create guest session');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
            <User className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white">Welcome Back</h1>
          <p className="text-purple-200">Log in to access your loyalty points and order history</p>
        </div>
        
        <form onSubmit={handleLogin}>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="your.email@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background border-border"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-sm">Password</Label>
                <Button 
                  variant="link" 
                  className="text-xs p-0 h-auto text-purple-400 hover:text-purple-300"
                  type="button"
                  onClick={() => toast.info('Password reset functionality would be implemented here')}
                >
                  Forgot password?
                </Button>
              </div>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background border-border"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Log In'
              )}
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-purple-500/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#16141F] text-purple-300">Or continue with</span>
              </div>
            </div>
            
            <Button 
              type="button" 
              variant="outline" 
              className="w-full mb-3 text-sm bg-white/5 border-purple-500/20 text-white hover:bg-white/10 hover:border-purple-500/30"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
            >
              <img 
                src="/google_g_logo.svg" 
                alt="Google logo" 
                className="mr-2 h-5 w-5" 
                onError={(e) => {
                  // Fallback to a reliable CDN if local file is not available
                  e.currentTarget.src = "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg";
                }}
              />
              Sign in with Google
            </Button>
            
            <Button 
              type="button"
              variant="outline" 
              className="w-full mb-3 text-sm bg-purple-600/10 border-purple-500/30 text-purple-200 hover:bg-purple-600/20 hover:border-purple-500/50"
              onClick={handleGuestContinue}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating guest session...
                </>
              ) : (
                'Continue as Guest'
              )}
            </Button>
          </div>
        </form>
        
        <div className="flex flex-col items-center space-y-4 mt-6">
          <p className="text-center text-purple-200 text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-purple-400 hover:text-white font-semibold hover:underline">
              Sign up now
            </Link>
          </p>
          
          <div className="w-full p-4 bg-purple-600/10 backdrop-blur-sm rounded-xl border border-purple-500/20 text-sm">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                  <path d="M12 2v4"></path>
                  <path d="m16 6 3 3"></path>
                  <path d="M18 12h4"></path>
                  <path d="m6 20.7 3.5-3.5c.2-.2.4-.2.6-.2.2 0 .4.1.6.2l2.6 2.6c.2.2.5.2.7 0l2.6-2.6c.2-.2.4-.2.6-.2.2 0 .4.1.6.2l3.5 3.5"></path>
                  <path d="m8 16.3-3.5-3.5c-.2-.2-.4-.2-.6-.2-.2 0-.4.1-.6.2l-2.6 2.6c-.2.2-.5.2-.7 0l-2.6-2.6c-.2-.2-.4-.2-.6-.2-.2 0-.4.1-.6.2l-3.5 3.5"></path>
                  <path d="M2 12h4"></path>
                  <path d="m6 6-3-3"></path>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-purple-200">Join our Loyalty Program</p>
                <p className="text-purple-300/90 text-xs mt-1">Earn points with every order and unlock exclusive rewards!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
