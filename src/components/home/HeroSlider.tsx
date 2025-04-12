import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Slide {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  link: string;
}

export const HeroSlider = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

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

  useEffect(() => {
    if (slides.length > 0) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [slides.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const previousSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const handleImageError = (id: string) => {
    setImageErrors(prev => ({ ...prev, [id]: true }));
  };

  // Function to get a fallback image if the original fails
  const getFallbackImage = (slide: Slide) => {
    const category = slide.title.toLowerCase().includes('drink') 
      ? 'drinks' 
      : slide.title.toLowerCase().includes('dessert')
        ? 'dessert'
        : 'food';
    return `https://source.foodish-api.vercel.app/images/${category}/${category}${Math.floor(Math.random() * 10) + 1}.jpg`;
  };

  if (isLoading || slides.length === 0) {
    return (
      <div className="w-full h-[250px] bg-muted animate-pulse rounded-lg"></div>
    );
  }

  return (
    <div className="relative w-full h-[250px] overflow-hidden rounded-lg">
      <div
        className="flex transition-transform duration-500 ease-out h-full"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide) => (
          <div
            key={slide.id}
            className="w-full h-full flex-shrink-0 relative"
          >
            <img
              src={imageErrors[slide.id] ? getFallbackImage(slide) : slide.imageUrl}
              alt={slide.title}
              className="w-full h-full object-cover"
              onError={() => handleImageError(slide.id)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6 text-white">
              <h2 className="text-2xl font-bold mb-2">{slide.title}</h2>
              <p className="text-sm mb-3">{slide.description}</p>
              <Link to={slide.link}>
                <Button size="sm" className="bg-marian-blue hover:bg-marian-blue/90 text-white rounded-full px-4 py-1 text-xs h-8">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full h-8 w-8"
        onClick={previousSlide}
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full h-8 w-8"
        onClick={nextSlide}
        aria-label="Next slide"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              currentSlide === index
                ? "bg-white w-4"
                : "bg-white/50 hover:bg-white/75"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroSlider;