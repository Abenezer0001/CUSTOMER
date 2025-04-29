import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Slide {
  id: string;
  imageUrl: string;
  imageSearchTerm: string;
  title: string;
  description: string;
  link: string;
}

export const HeroSlider = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Initialize Embla with autoplay
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: false })
  ]);

  useEffect(() => {
    const loadSlides = async () => {
      try {
        const response = await fetch('/src/data/slider-data.json');
        const data = await response.json();
        setSlides(data);
      } catch (error) {
        console.error('Error loading slides:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSlides();
  }, []);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentSlide(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  const handleImageError = (id: string) => {
    setImageErrors(prev => ({ ...prev, [id]: true }));
  };

  const getFallbackImage = (slide: Slide) => {
    return `https://source.unsplash.com/random/1200x600/?${slide.imageSearchTerm}`;
  };

  if (isLoading || slides.length === 0) {
    return (
      <div className="w-full h-[400px] bg-muted animate-pulse rounded-lg" />
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-background group">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex h-[400px] -ml-4">
          {slides.map((slide) => (
            <div
              key={slide.id}
              className="relative flex-[0_0_100%] min-w-0 pl-4"
            >
              <div className="relative w-full h-full overflow-hidden rounded-lg">
                <img
                  src={imageErrors[slide.id] ? getFallbackImage(slide) : slide.imageUrl}
                  alt={slide.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  onError={() => handleImageError(slide.id)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                  <h2 className="text-3xl font-bold mb-3 tracking-tight">{slide.title}</h2>
                  <p className="text-lg mb-4 text-gray-200 max-w-xl">{slide.description}</p>
                  <Link to={slide.link}>
                    <Button size="lg" className="bg-marian-blue hover:bg-marian-blue/90 text-white">
                      Explore Now
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              index === currentSlide
                ? "bg-white w-6"
                : "bg-white/50 hover:bg-white/75"
            )}
            onClick={() => scrollTo(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full h-10 w-10 transition-all duration-200 opacity-0 group-hover:opacity-100"
        onClick={scrollPrev}
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full h-10 w-10 transition-all duration-200 opacity-0 group-hover:opacity-100"
        onClick={scrollNext}
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default HeroSlider;