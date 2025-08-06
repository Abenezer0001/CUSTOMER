import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Gift, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const Signup: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { signup, googleLogin, customerSignup, customerGoogleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check for table ID in URL
  const getTableId = () => {
    const queryParams = new URLSearchParams(location.search);
    return queryParams.get('table');
  };
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName || !lastName || !email || !password) {
      toast.error('Please fill all required fields');
      return;
    }
    
    if (!agreeTerms) {
      toast.error('You must agree to the Terms of Service and Privacy Policy');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Get table ID from multiple sources for reliability
      const tableIdFromUrl = getTableId();
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
      const effectiveTableId = tableIdFromUrl || tableIdFromState || currentTableId || (tableInfo?.id) || '';
      
      console.log('Signup with table context:', {
        tableIdFromUrl,
        tableIdFromState,
        currentTableId,
        tableInfoFromStorage: tableInfo?.id,
        effectiveTableId
      });
      
      // Store table ID in all possible locations for maximum compatibility
      if (effectiveTableId) {
        localStorage.setItem('currentTableId', effectiveTableId);
        localStorage.setItem('tableInfo', JSON.stringify({ id: effectiveTableId }));
        console.log('Stored table ID in localStorage before signup:', effectiveTableId);
      }
      
      // Try customer signup first (new customer authentication system)
      const success = await customerSignup(firstName, lastName, email, password);
      
      if (success) {
        toast.success('Account created successfully!');
        
        // Check if we have a return URL from the state
        const returnUrl = locationState?.returnUrl;
        
        if (returnUrl && returnUrl !== '/signup' && returnUrl !== '/login') {
          console.log(`Redirecting to return URL: ${returnUrl}`);
          navigate(returnUrl);
        } else if (effectiveTableId) {
          // If we have a table ID, redirect to the localhost:8080 with table parameter
          console.log(`Redirecting to localhost:8080 with table ID: ${effectiveTableId}`);
          window.location.href = `http://localhost:8080/?table=${effectiveTableId}`;
        } else {
          // Default home page
          navigate('/', { replace: true });
        }
        return;
      }
      
      // Fall back to regular signup if customer signup fails
      // This maintains backward compatibility
      const regularSuccess = await signup(firstName, lastName, email, password);
      
      if (regularSuccess) {
        toast.success('Account created successfully!');
        
        // Similar redirection logic for regular signup
        const returnUrl = locationState?.returnUrl;
        
        if (returnUrl && returnUrl !== '/signup' && returnUrl !== '/login') {
          navigate(returnUrl);
        } else if (effectiveTableId) {
          window.location.href = `http://localhost:8080/?table=${effectiveTableId}`;
        } else {
          navigate('/', { replace: true });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleGoogleSignup = async () => {
    setIsSubmitting(true);
    
    try {
      // Try customer Google login first (new customer authentication system)
      try {
        // Google login redirects, so we don't need to check return value
        customerGoogleLogin();
        // No need to navigate as Google OAuth will redirect
        return;
      } catch (error) {
        console.error('Customer Google signup failed, falling back to regular Google login', error);
        // Fall back to regular Google login if customer Google login fails
        // googleLogin may return a boolean or redirect
        googleLogin();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
            <Gift className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white">Create an Account</h1>
          <p className="text-purple-200">Join our loyalty program and earn points with every order</p>
        </div>
        
        <form onSubmit={handleSignup}>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first-name" className="text-sm">First Name</Label>
                <Input 
                  id="first-name" 
                  placeholder="John" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name" className="text-sm">Last Name</Label>
                <Input 
                  id="last-name" 
                  placeholder="Doe" 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="bg-background border-border"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="your.email@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background border-border"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="bg-background border-border"
              />
            </div>
            
            <div className="flex items-start space-x-2 pt-2">
              <Checkbox 
                id="terms" 
                checked={agreeTerms}
                onCheckedChange={(checked) => setAgreeTerms(checked === true)}
                className="mt-1 border-border data-[state=checked]:bg-purple-600"
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="terms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I agree to the{' '}
                  <Link to="/terms" className="text-purple-400 hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-purple-400 hover:underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : 'Create Account'}
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
              className="w-full text-sm bg-white/5 border-purple-500/20 text-white hover:bg-white/10 hover:border-purple-500/30"
              onClick={handleGoogleSignup}
              disabled={isSubmitting}
            >
              <img 
                src="/google_g_logo.svg" 
                alt="Google logo" 
                className="mr-2 h-5 w-5" 
                onError={(e) => {
                  e.currentTarget.src = "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg";
                }}
              />
              Sign up with Google
            </Button>
          </div>
        </form>
        
        <div className="flex flex-col items-center space-y-4 mt-6">
          <p className="text-center text-purple-200 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-purple-400 hover:text-white font-semibold hover:underline">
              Log in
            </Link>
          </p>
          
          <Link 
            to="/" 
            className="inline-flex items-center text-sm text-purple-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to menu
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
