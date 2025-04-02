
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import SplashScreen from '@/components/SplashScreen';
import HeroSlider from '@/components/home/HeroSlider';
import CategoryGrid from '@/components/CategoryGrid';

const Index: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  
  // Get categories data
  const { data: categories = [] } = useQuery({
    queryKey: ['categories-data'],
    queryFn: async () => {
      const response = await fetch('/src/data/categories-data.json');
      return response.json();
    }
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
            <section className="mb-6">
              <HeroSlider />
            </section>
            
            {/* Category Heading */}
            <div className="px-4 mb-2">
              <h2 className="text-2xl font-bold text-foreground">Categories</h2>
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
