
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Gift } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';

const Signup: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 mt-16">
      <Link to="/" className="inline-flex items-center mb-6 text-gray-600 hover:text-gray-900">
        <ArrowLeft className="mr-2" size={18} />
        Back to menu
      </Link>
      
      <Card className="max-w-md mx-auto border-emerald-100">
        <CardHeader className="space-y-1 text-center pb-0">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Gift className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold">Create an Account</h1>
          <p className="text-gray-600 text-sm">Join our loyalty program and earn points with every order</p>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" placeholder="John" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" placeholder="Doe" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="your.email@example.com" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox id="terms" />
            <Label htmlFor="terms" className="text-sm">
              I agree to the{' '}
              <Link to="/terms" className="text-emerald-600 hover:underline">
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-emerald-600 hover:underline">
                Privacy Policy
              </Link>
            </Label>
          </div>
          
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
            Sign Up
          </Button>
        </CardContent>
        
        <CardFooter className="flex flex-col pt-0">
          <p className="text-center text-gray-600 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-600 hover:underline font-medium">
              Log in
            </Link>
          </p>
          
          <div className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
            <div className="flex items-start">
              <div className="bg-emerald-100 rounded-full p-2 mr-3 text-emerald-600">
                <Gift size={16} />
              </div>
              <div>
                <h4 className="font-medium">Loyalty Program Benefits</h4>
                <ul className="text-sm text-gray-600 mt-1 space-y-1">
                  <li className="flex items-center">
                    <span className="bg-emerald-200 rounded-full h-1.5 w-1.5 mr-2"></span>
                    Earn 1 point for every $1 spent
                  </li>
                  <li className="flex items-center">
                    <span className="bg-emerald-200 rounded-full h-1.5 w-1.5 mr-2"></span>
                    Get $10 off when you reach 100 points
                  </li>
                  <li className="flex items-center">
                    <span className="bg-emerald-200 rounded-full h-1.5 w-1.5 mr-2"></span>
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
