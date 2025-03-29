
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from 'embla-carousel-autoplay';

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
  
  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const response = await fetch('/src/data/slider-data.json');
        if (!response.ok) {
          throw new Error('Failed to fetch slider data');
        }
        const data = await response.json();
        setSlides(data);
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
      <div className="w-full h-56 bg-emerald-100 animate-pulse rounded-xl">
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-emerald-500">Loading...</span>
        </div>
      </div>
    );
  }
  
  if (error && slides.length === 0) {
    return (
      <div className="w-full p-4 bg-red-50 text-red-500 rounded-xl">
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
              className="relative h-48 sm:h-56 md:h-64 w-full cursor-pointer"
              onClick={() => handleSlideClick(slide.link)}
            >
              <img
                src={slide.imageUrl}
                alt={slide.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent flex flex-col justify-center p-6">
                <h2 className="text-white text-lg sm:text-xl md:text-2xl font-semibold mb-2">{slide.title}</h2>
                <p className="text-white/90 text-sm sm:text-base mb-4 max-w-xs">{slide.description}</p>
                {slide.buttonText && (
                  <Button 
                    variant="default"
                    size="sm" 
                    className="w-fit bg-amber-400 hover:bg-amber-500 text-black text-sm"
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
      
      <CarouselPrevious className="absolute left-2 -translate-y-1/2 top-1/2 h-8 w-8 bg-black/30 hover:bg-black/50 border-none text-white" />
      <CarouselNext className="absolute right-2 -translate-y-1/2 top-1/2 h-8 w-8 bg-black/30 hover:bg-black/50 border-none text-white" />
    </Carousel>
  );
};
