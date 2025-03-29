
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, User } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';

const Login: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 mt-16">
      <Link to="/" className="inline-flex items-center mb-6 text-gray-600 hover:text-gray-900">
        <ArrowLeft className="mr-2" size={16} />
        Back to main menu
      </Link>
      
      <Card className="max-w-md mx-auto border-emerald-100">
        <CardHeader className="space-y-1 text-center pb-0">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <User className="h-6 w-6 text-emerald-600" />
          </div>
          <h1 className="text-xl font-semibold">Welcome Back</h1>
          <p className="text-sm text-gray-500">Log in to access your loyalty points and order history</p>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm">Email</Label>
            <Input id="email" type="email" placeholder="your.email@example.com" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="password" className="text-sm">Password</Label>
              <Button variant="link" className="text-xs p-0 h-auto text-emerald-600">
                Forgot password?
              </Button>
            </div>
            <Input id="password" type="password" placeholder="••••••••" />
          </div>
          
          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
            Log In
          </Button>
        </CardContent>
        
        <CardFooter className="flex flex-col p-4 pt-0">
          <div className="flex items-center gap-2 my-3 w-full">
            <div className="h-px flex-1 bg-gray-200"></div>
            <span className="text-xs text-gray-400">OR</span>
            <div className="h-px flex-1 bg-gray-200"></div>
          </div>
          
          <Button variant="outline" className="w-full mb-3 text-sm">
            Continue as Guest
          </Button>
          
          <p className="text-center text-gray-600 text-xs">
            Don't have an account?{' '}
            <Link to="/signup" className="text-emerald-600 hover:underline font-medium">
              Sign up
            </Link>
          </p>
          
          <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-xs">
            <p className="font-medium text-emerald-800 mb-1">Join our Loyalty Program</p>
            <p className="text-gray-600">Create an account to earn points with every order and redeem exclusive rewards!</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
