
import React from 'react';
import { useTableInfo } from '@/context/TableContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

export const TableHeader: React.FC = () => {
  const { restaurantName, tableNumber } = useTableInfo();
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[url('/lovable-uploads/4432ca65-2bc4-42ab-878b-8467ce1abbe6.png')] bg-cover bg-center">
      <div className="flex justify-between items-center px-4 py-3 bg-black/40 backdrop-blur-sm text-white">
        <div>
          <h1 className="text-xl font-bold">{restaurantName || 'InSeat'}</h1>
        </div>
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full">
                <User size={20} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-4">
                <h3 className="font-medium">Join our Loyalty Program</h3>
                <p className="text-sm text-muted-foreground">Sign up to earn points and get exclusive discounts on your favorite meals!</p>
                <div className="grid gap-2">
                  <Button size="sm" className="w-full">Log In</Button>
                  <Button size="sm" variant="outline" className="w-full">Sign Up</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <div>
            <span className="text-sm">TABLE</span>
            <p className="text-2xl font-bold">{tableNumber || 'L001'}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
