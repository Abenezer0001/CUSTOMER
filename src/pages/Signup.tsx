import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Gift, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const Signup: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { signup, googleLogin } = useAuth();
  const navigate = useNavigate();
  
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
      // Pass the parameters in the correct order: firstName, lastName, email, password
      const success = await signup(firstName, lastName, email, password);
      
      if (success) {
        navigate('/');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleGoogleSignup = async () => {
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

  return (
    <div className="container mx-auto px-4 py-8 mt-16">
      <Link to="/" className="inline-flex items-center mb-6 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2" size={18} />
        Back to menu
      </Link>
      
      <Card className="max-w-md mx-auto border-marian-blue/20 bg-background">
        <CardHeader className="space-y-1 text-center pb-0">
          <div className="w-16 h-16 bg-marian-blue/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <Gift className="h-8 w-8 text-marian-blue" />
          </div>
          <h1 className="text-2xl font-bold">Create an Account</h1>
          <p className="text-muted-foreground text-sm">Join our loyalty program and earn points with every order</p>
        </CardHeader>
        
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input 
                  id="firstName" 
                  placeholder="John" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-background border-border"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input 
                  id="lastName" 
                  placeholder="Doe" 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-background border-border"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="your.email@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background border-border"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background border-border"
                required
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="terms" 
                checked={agreeTerms}
                onCheckedChange={(checked) => setAgreeTerms(checked === true)}
                className="border-border data-[state=checked]:bg-marian-blue data-[state=checked]:border-marian-blue"
              />
              <Label htmlFor="terms" className="text-sm text-muted-foreground">
                I agree to the{' '}
                <Link to="/terms" className="text-marian-blue hover:underline">
                  Terms of Service
                </Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-marian-blue hover:underline">
                  Privacy Policy
                </Link>
              </Label>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-marian-blue hover:bg-marian-blue/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Sign Up'
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
              className="w-full bg-background border-border"
              onClick={handleGoogleSignup}
              disabled={isSubmitting}
            >
              <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6,20H24v8h11.3c-1.1,5.2-5.5,8-11.3,8c-6.6,0-12-5.4-12-12s5.4-12,12-12c3.1,0,5.8,1.2,8,3.1 l6.2-6.2C33.8,4.5,29.1,2,24,2C12.9,2,4,11,4,22s8.9,20,20,20s20-9,20-20C44,21.3,43.9,20.6,43.6,20z"></path>
                <path fill="#FF3D00" d="M6.3,13.2l7.2,5.3C15.3,13.9,19.4,11,24,11c3.1,0,5.8,1.2,8,3.1l6.2-6.2C33.8,4.5,29.1,2,24,2 C16.1,2,9.2,6.6,6.3,13.2z"></path>
                <path fill="#4CAF50" d="M24,44c5.1,0,9.8-2.4,12.9-6.4l-6.7-5.4c-2,1.8-4.6,2.8-7.2,2.8c-5.8,0-10.6-3.8-12.3-9h-7v5.5 C6.7,38.6,14.5,44,24,44z"></path>
                <path fill="#1976D2" d="M12,24c0-1.3,0.2-2.6,0.6-3.8h-7V26h7C12.2,25.4,12,24.7,12,24z"></path>
              </svg>
              Sign up with Google
            </Button>
          </CardContent>
        </form>
        
        <CardFooter className="flex flex-col pt-0">
          <p className="text-center text-muted-foreground text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-marian-blue hover:underline font-medium">
              Log in
            </Link>
          </p>
          
          <div className="mt-6 p-4 bg-delft-blue/5 rounded-lg border border-delft-blue/10">
            <div className="flex items-start">
              <div className="bg-marian-blue/20 rounded-full p-2 mr-3 text-marian-blue">
                <Gift size={16} />
              </div>
              <div>
                <h4 className="font-medium">Loyalty Program Benefits</h4>
                <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                  <li className="flex items-center">
                    <span className="bg-marian-blue rounded-full h-1.5 w-1.5 mr-2"></span>
                    Earn 1 point for every $1 spent
                  </li>
                  <li className="flex items-center">
                    <span className="bg-marian-blue rounded-full h-1.5 w-1.5 mr-2"></span>
                    Get $10 off when you reach 100 points
                  </li>
                  <li className="flex items-center">
                    <span className="bg-marian-blue rounded-full h-1.5 w-1.5 mr-2"></span>
                    Exclusive offers and early access
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Signup;
