import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, AlertCircle } from 'lucide-react';

interface ClosedOverlayProps {
  type: 'business' | 'restaurant' | 'venue';
  name?: string;
  message?: string;
  nextOpenTime?: string;
}

const ClosedOverlay: React.FC<ClosedOverlayProps> = ({ 
  type, 
  name, 
  message, 
  nextOpenTime 
}) => {
  return (
    <div className="fixed inset-0 z-[9999] w-full h-screen bg-black">
      {/* Full-screen closed image covering everything including bottom nav */}
      <div className="w-full h-full relative">
        <img
          src="https://res.cloudinary.com/dnizoc474/image/upload/v1753933312/closed_1_iyhk5r.png"
          alt="Restaurant Closed"
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            // Fallback to a solid background if image fails to load
            target.parentElement!.classList.add('bg-gray-900');
            target.style.display = 'none';
          }}
        />
        
        {/* Optional minimal overlay text at bottom for mobile */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-4 text-center">
        
          {name && (
            <p className="text-sm opacity-90 mb-1">{name}</p>
          )}
          {nextOpenTime && (
            <div className="flex items-center justify-center gap-2 text-xs opacity-80">
              <Clock className="h-3 w-3" />
              <span>Opens: {nextOpenTime}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClosedOverlay;