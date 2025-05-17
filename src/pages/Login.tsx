import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const success = await login(email, password);
      
      if (success) {
        navigate('/');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleGoogleLogin = () => {
    // With the new implementation, googleLogin redirects to Google OAuth
    // No need to handle success/failure here as the user will be redirected
    googleLogin();
  };
  
  const handleGuestContinue = () => {
    toast.info('Continuing as guest');
    navigate('/');
  };

  return (
    <div className="container min-h-screen flex items-center justify-center px-6">
      <Card className="w-full border-marian-blue/20 bg-[#1F1D2B]">
        <CardHeader className="space-y-1 text-center pb-0">
          <div className="w-14 h-14 bg-marian-blue/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <User className="h-6 w-6 text-marian-blue" />
          </div>
          <h1 className="text-xl font-semibold">Welcome Back</h1>
          <p className="text-sm text-muted-foreground">Log in to access your loyalty points and order history</p>
        </CardHeader>
        
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4 pt-4">
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
                  className="text-xs p-0 h-auto text-marian-blue"
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
              className="w-full bg-marian-blue hover:bg-marian-blue/90"
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
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-background text-muted-foreground">Or continue with</span>
              </div>
            </div>
            
            <Button 
              type="button" 
              variant="outline" 
              className="w-full mb-3 text-sm bg-[#332A46] border-none text-white hover:bg-[#423859]"
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
              className="w-full mb-3 text-sm bg-background border-border hover:bg-muted"
              onClick={handleGuestContinue}
            >
              Continue as Guest
            </Button>
          </CardContent>
        </form>
        
        <CardFooter className="flex flex-col p-4 pt-0">
          <p className="text-center text-muted-foreground text-xs">
            Don't have an account?{' '}
            <Link to="/signup" className="text-marian-blue hover:underline font-medium">
              Sign up
            </Link>
          </p>
          
          <div className="mt-4 p-3 bg-delft-blue/5 rounded-lg border border-delft-blue/10 text-xs">
            <p className="font-medium text-delft-blue mb-1">Join our Loyalty Program</p>
            <p className="text-muted-foreground">Create an account to earn points with every order and redeem exclusive rewards!</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
