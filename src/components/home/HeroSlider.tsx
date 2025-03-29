
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from 'embla-carousel-autoplay';
import { toast } from 'sonner';

type SlideData = {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  buttonText?: string;
  link?: string;
};

export const HeroSlider: React.FC = () => {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { theme } = useTheme();
  
  useEffect(() => {
    const fetchSlides = async () => {
      try {
        // Try to fetch from API first
        const apiUrl = 'http://localhost:3000/api/promotions';
        const apiResponse = await fetch(apiUrl, { signal: AbortSignal.timeout(3000) });
        
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          setSlides(apiData);
          setIsLoading(false);
          return;
        }
        
        // API failed, fall back to JSON file
        const response = await fetch('/src/data/slider-data.json');
        if (!response.ok) {
          throw new Error('Failed to fetch slider data');
        }
        const data = await response.json();
        setSlides(data);
        toast.info('Using local promotion data');
      } catch (error) {
        console.error('Error loading slider data:', error);
        setError('Could not load promotional content');
        // Fallback data in case of error
        setSlides([
          {
            id: 'fallback1',
            imageUrl: '/lovable-uploads/6f5e2fa0-aae5-4b1d-b109-d17950f3202f.png',
            title: 'Special Offers',
            description: 'Check out our latest promotions',
            buttonText: 'View Menu',
            link: '/menu'
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSlides();
  }, []);
  
  if (isLoading) {
    return (
      <div className="w-full h-56 bg-emerald-100 dark:bg-emerald-900/30 animate-pulse rounded-xl">
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-emerald-500 dark:text-emerald-400">Loading...</span>
        </div>
      </div>
    );
  }
  
  if (error && slides.length === 0) {
    return (
      <div className="w-full p-4 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-xl">
        {error}
      </div>
    );
  }
  
  const handleSlideClick = (link?: string) => {
    if (link) {
      navigate(link);
    }
  };
  
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );
  
  return (
    <Carousel 
      className="w-full relative rounded-xl overflow-hidden"
      plugins={[plugin.current]}
      opts={{
        loop: true,
        align: "start",
      }}
    >
      <CarouselContent>
        {slides.map((slide) => (
          <CarouselItem key={slide.id}>
            <div 
              className="relative h-48 sm:h-56 md:h-64 w-full cursor-pointer transform transition-transform hover:scale-[1.01] duration-300"
              onClick={() => handleSlideClick(slide.link)}
            >
              <img
                src={slide.imageUrl}
                alt={slide.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className={cn(
                "absolute inset-0 flex flex-col justify-center p-6",
                theme === 'dark' 
                  ? "bg-gradient-to-r from-black/90 via-black/70 to-transparent" 
                  : "bg-gradient-to-r from-black/70 via-black/40 to-transparent"
              )}>
                <h2 className="text-white text-lg sm:text-xl md:text-2xl font-bold mb-2 tracking-tight">{slide.title}</h2>
                <p className="text-white/90 text-sm sm:text-base mb-4 max-w-xs">{slide.description}</p>
                {slide.buttonText && (
                  <Button 
                    variant="default"
                    size="sm" 
                    className="w-fit bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-black dark:text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {slide.buttonText}
                  </Button>
                )}
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1 z-10">
        {slides.map((_, index) => (
          <div
            key={`dot-${index}`}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              index === 0 ? "bg-white" : "bg-white/50"
            )}
          />
        ))}
      </div>
      
      <CarouselPrevious className="absolute left-2 -translate-y-1/2 top-1/2 h-8 w-8 bg-black/30 hover:bg-black/50 dark:bg-white/10 dark:hover:bg-white/20 border-none text-white" />
      <CarouselNext className="absolute right-2 -translate-y-1/2 top-1/2 h-8 w-8 bg-black/30 hover:bg-black/50 dark:bg-white/10 dark:hover:bg-white/20 border-none text-white" />
    </Carousel>
  );
};
