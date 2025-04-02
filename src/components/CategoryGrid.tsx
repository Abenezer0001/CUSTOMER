
import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface Category {
  id: string;
  name: string;
  image: string;
  subCategories: string[];
}

interface CategoryGridProps {
  categories: Category[];
}

const CategoryGrid: React.FC<CategoryGridProps> = ({ categories }) => {
  const navigate = useNavigate();

  // Animation variants for container
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  // Animation variants for items
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    },
    hover: {
      scale: 1.05,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    }
  };

  return (
    <motion.div 
      className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4 py-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {categories.map((category) => (
        <motion.div
          key={category.id}
          className="relative overflow-hidden rounded-xl h-40 cursor-pointer"
          variants={itemVariants}
          whileHover="hover"
          onClick={() => navigate(`/category/${category.id}`)}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70 z-10"></div>
          <motion.img
            src={category.image}
            alt={category.name}
            className="w-full h-full object-cover"
            initial={{ scale: 1 }}
            whileHover={{ scale: 1.1, transition: { duration: 0.5 } }}
          />
          <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
            <h3 className="text-xl font-bold text-white">
              {category.name}
            </h3>
            <p className="text-xs text-white/80 mt-1">
              {category.subCategories.length} subcategories
            </p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default CategoryGrid;
