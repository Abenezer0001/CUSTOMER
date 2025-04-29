import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            onComplete();
          }, 500);
          return 100;
        }
        return prev + 5;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backgroundBlendMode: 'overlay'
        }}
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="max-w-md text-center px-4"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* <motion.div
            className="w-24 h-24 mx-auto mb-6 flex items-center justify-center bg-white rounded-full"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="currentColor" 
              className="w-16 h-16 text-green-500"
            >
              <path d="M17 2a1 1 0 0 1 1 1v1h1a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h1V3a1 1 0 0 1 2 0v1h10V3a1 1 0 0 1 1-1zM4.5 13h15a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 21.5v-7A1.5 1.5 0 0 1 4.5 13z"/>
            </svg>
          </motion.div> */}
          
          <motion.h1
            className="text-5xl font-bold mb-4 text-white"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            IN<span className="text-green-500">SEAT</span>
          </motion.h1>
          
          <motion.p
            className="text-gray-300 mb-8"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            Get 20% off on your first order!
          </motion.p>
          
          <motion.div 
            className="w-full bg-gray-700 rounded-full h-2.5 mb-4"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "100%", opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <motion.div 
              className="bg-green-500 h-2.5 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 2 }}
            ></motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;
