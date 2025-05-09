import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  color?: string;
  centered?: boolean;
}

export function Loader({
  size = 24,
  color,
  className,
  centered = false,
  ...props
}: LoaderProps) {
  return (
    <div 
      className={cn(
        'flex items-center justify-center',
        centered && 'w-full h-full min-h-[200px]',
        className
      )} 
      {...props}
    >
      <Loader2 
        size={size} 
        className={cn(
          'animate-spin',
          color
        )} 
      />
    </div>
  );
} 