
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { MenuItem } from '@/types';
import { MenuItemCard } from '@/components/MenuItemCard';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const HeroSection: React.FC = () => {
  return (
    <section className="relative bg-secondary overflow-hidden">
      <div className="container px-4 mx-auto py-20 md:py-32">
        <div className="max-w-2xl animate-slide-up">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium mb-6 leading-tight">
            Elevate Your <span className="text-primary">Dining Experience</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 md:pr-12">
            Discover a curated selection of exquisite dishes from our premium menu,
            delivered with elegance and precision to your doorstep.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg" className="rounded-full px-8">
              <Link to="/menu">Explore Menu</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-8 border-foreground/20">
              <Link to="/about">Our Story</Link>
            </Button>
          </div>
        </div>
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-background to-transparent hidden lg:block"></div>
    </section>
  );
};

const FeaturedSection: React.FC = () => {
  const { data: featuredItems, isLoading } = useQuery({
    queryKey: ['featuredItems'],
    queryFn: api.getFeaturedItems,
  });

  if (isLoading) {
    return (
      <section className="container px-4 mx-auto py-16">
        <h2 className="text-3xl font-medium mb-10 text-center">Featured Dishes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="bg-secondary animate-pulse rounded-xl h-80"></div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="container px-4 mx-auto py-16">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-3xl font-medium">Featured Dishes</h2>
        <Button asChild variant="ghost" className="hidden md:flex">
          <Link to="/menu" className="flex items-center gap-2">
            View All <ArrowRight size={16} />
          </Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {featuredItems?.slice(0, 3).map((item: MenuItem) => (
          <MenuItemCard key={item.id} item={item} className="animate-fade-in" />
        ))}
      </div>
      
      <div className="mt-8 text-center md:hidden">
        <Button asChild variant="outline">
          <Link to="/menu">View All Menu</Link>
        </Button>
      </div>
    </section>
  );
};

const PopularSection: React.FC = () => {
  const { data: popularItems, isLoading } = useQuery({
    queryKey: ['popularItems'],
    queryFn: api.getPopularItems,
  });

  if (isLoading) {
    return (
      <section className="bg-secondary/50">
        <div className="container px-4 mx-auto py-16">
          <h2 className="text-3xl font-medium mb-10 text-center">Most Popular</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="bg-secondary animate-pulse rounded-xl h-72"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-secondary/50">
      <div className="container px-4 mx-auto py-16">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-medium">Most Popular</h2>
          <Button asChild variant="ghost" className="hidden md:flex">
            <Link to="/menu" className="flex items-center gap-2">
              View All <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {popularItems?.slice(0, 4).map((item: MenuItem) => (
            <MenuItemCard key={item.id} item={item} className="animate-fade-in" />
          ))}
        </div>
        
        <div className="mt-8 text-center md:hidden">
          <Button asChild variant="outline">
            <Link to="/menu">View All Menu</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

const CTASection: React.FC = () => {
  return (
    <section className="container px-4 mx-auto py-16 md:py-24">
      <div className="bg-primary text-primary-foreground rounded-2xl p-8 md:p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent opacity-20"></div>
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-medium mb-6">Hungry? We've got you covered.</h2>
          <p className="text-primary-foreground/80 mb-8 text-lg">
            From quick bites to gourmet experiences, we bring the best restaurants to your doorstep.
            Order now and enjoy a seamless dining experience.
          </p>
          <Button asChild size="lg" variant="secondary" className="rounded-full px-8">
            <Link to="/menu">Order Now</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

const Index: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="animate-fade-in">
      <HeroSection />
      <FeaturedSection />
      <PopularSection />
      <CTASection />
    </div>
  );
};

export default Index;
