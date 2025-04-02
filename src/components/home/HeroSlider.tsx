import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        // Try to fetch from API first
        const apiUrl = 'http://0.0.0.0:3000/api/promotions';
        const apiResponse = await fetch(apiUrl, { signal: AbortSignal.timeout(3000) });

        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          setSlides(apiData);
          return;
        }

        // API failed, fall back to JSON file
        const response = await fetch('/src/data/slider-data.json');
        if (!response.ok) throw new Error('Failed to fetch slider data');
        const data = await response.json();
        setSlides(data);
        toast.info('Using local promotion data');
      } catch (error) {
        console.error('Error loading slider data:', error);
        // Fallback data in case of error
        setSlides([{
          id: 'fallback1',
          imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
          title: 'Welcome to Our Restaurant',
          description: 'Discover our delicious menu',
          buttonText: 'Browse Menu',
          link: '/menu'
        }]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSlides();
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-64 md:h-[400px] bg-gradient-to-r from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-800/30 animate-pulse rounded-xl">
        <div className="w-full h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      </div>
    );
  }

  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  return (
    <Carousel 
      className="w-full relative rounded-xl overflow-hidden shadow-xl"
      plugins={[plugin.current]}
      onSlideChanged={setCurrentSlide}
      opts={{
        loop: true,
        align: "start",
      }}
    >
      <CarouselContent>
        {slides.map((slide, index) => (
          <CarouselItem key={slide.id}>
            <div 
              className="relative h-64 md:h-[400px] w-full cursor-pointer group"
              onClick={() => slide.link && navigate(slide.link)}
            >
              <img
                src={slide.imageUrl}
                alt={slide.title}
                className="w-full h-full object-cover transform transition-transform duration-700 scale-100 group-hover:scale-105"
                loading={index === 0 ? "eager" : "lazy"}
              />
              <div className={cn(
                "absolute inset-0 flex flex-col justify-end p-6 md:p-10",
                "bg-gradient-to-t from-black/90 via-black/50 to-transparent",
                "transition-opacity duration-300"
              )}>
                <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 tracking-tight">{slide.title}</h2>
                <p className="text-white/90 text-sm md:text-lg mb-4 max-w-xl">{slide.description}</p>
                {slide.buttonText && (
                  <Button 
                    variant="default"
                    size="lg"
                    className="w-fit bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {slide.buttonText}
                  </Button>
                )}
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>

      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
        {slides.map((_, index) => (
          <div
            key={`dot-${index}`}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              index === currentSlide 
                ? "bg-white w-6" 
                : "bg-white/50 hover:bg-white/75"
            )}
          />
        ))}
      </div>

      <CarouselPrevious className="absolute left-4 -translate-y-1/2 top-1/2 h-10 w-10 bg-black/30 hover:bg-black/50 border-none text-white opacity-0 transition-opacity group-hover:opacity-100" />
      <CarouselNext className="absolute right-4 -translate-y-1/2 top-1/2 h-10 w-10 bg-black/30 hover:bg-black/50 border-none text-white opacity-0 transition-opacity group-hover:opacity-100" />
    </Carousel>
  );
};