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
  
  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    
    try {
      const success = await googleLogin();
      
      if (success) {
        navigate('/');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleGuestContinue = () => {
    toast.info('Continuing as guest');
    navigate('/');
  };

  return (
    <div className="container mx-auto px-4 py-8 mt-16">
      <Link to="/" className="inline-flex items-center mb-6 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2" size={16} />
        Back to main menu
      </Link>
      
      <Card className="max-w-md mx-auto border-marian-blue/20 bg-background">
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
              className="w-full mb-3 text-sm bg-background border-border"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
            >
              <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6,20H24v8h11.3c-1.1,5.2-5.5,8-11.3,8c-6.6,0-12-5.4-12-12s5.4-12,12-12c3.1,0,5.8,1.2,8,3.1 l6.2-6.2C33.8,4.5,29.1,2,24,2C12.9,2,4,11,4,22s8.9,20,20,20s20-9,20-20C44,21.3,43.9,20.6,43.6,20z"></path>
                <path fill="#FF3D00" d="M6.3,13.2l7.2,5.3C15.3,13.9,19.4,11,24,11c3.1,0,5.8,1.2,8,3.1l6.2-6.2C33.8,4.5,29.1,2,24,2 C16.1,2,9.2,6.6,6.3,13.2z"></path>
                <path fill="#4CAF50" d="M24,44c5.1,0,9.8-2.4,12.9-6.4l-6.7-5.4c-2,1.8-4.6,2.8-7.2,2.8c-5.8,0-10.6-3.8-12.3-9h-7v5.5 C6.7,38.6,14.5,44,24,44z"></path>
                <path fill="#1976D2" d="M12,24c0-1.3,0.2-2.6,0.6-3.8h-7V26h7C12.2,25.4,12,24.7,12,24z"></path>
              </svg>
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
