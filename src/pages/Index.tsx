
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import SplashScreen from '@/components/SplashScreen';
import HeroSlider from '@/components/home/HeroSlider';
import CategoryGrid from '@/components/CategoryGrid';
import { api } from '@/services/api';

const Index: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  
  // Get categories data using the API service
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories
  });
  
  useEffect(() => {
    // Check if we've shown the splash screen before
    const hasSeen = sessionStorage.getItem('hasSeenSplash');
    if (hasSeen) {
      setShowSplash(false);
    } else {
      // Set a session storage flag so we don't show it again in this session
      setTimeout(() => {
        sessionStorage.setItem('hasSeenSplash', 'true');
      }, 3000);
    }
  }, []);
  
  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/menu?search=${encodeURIComponent(searchQuery)}`);
    }
  };
  
  return (
    <>
      {showSplash ? (
        <SplashScreen onComplete={handleSplashComplete} />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            className="pt-14 pb-24"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Hero Slider */}
            <section className="mb-4">
              <HeroSlider />
            </section>
            
            {/* Search Bar */}
            <section className="px-4 mb-6">
              <form onSubmit={handleSearch} className="relative">
                <Input
                  type="text"
                  placeholder="Search for food, drinks, desserts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 py-6 h-12 rounded-full bg-muted/50 focus-visible:ring-marian-blue"
                />
                <button 
                  type="submit" 
                  className="absolute inset-y-0 left-0 pl-3 flex items-center"
                  aria-label="Search"
                >
                  <Search className="h-5 w-5 text-muted-foreground" />
                </button>
              </form>
            </section>
            
            {/* Category Heading */}
            <div className="px-4 mb-2">
              <h2 className="text-xl font-bold text-foreground">Categories</h2>
              <p className="text-sm text-muted-foreground">Browse all food and drink categories</p>
            </div>
            
            {/* Categories Grid */}
            <CategoryGrid categories={categories} />
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
};

export default Index;
