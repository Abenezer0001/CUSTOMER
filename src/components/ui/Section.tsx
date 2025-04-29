import React, { forwardRef } from 'react';
import { motion, Variants } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { cn } from '@/lib/utils';

/**
 * Props for the Section component
 */
export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  containerClassName?: string;
  innerClassName?: string;
  fullWidth?: boolean;
  as?: React.ElementType;
  variant?: string;
  bgImage?: string;
  bgPattern?: string | boolean; // Allow string or boolean
  patternOpacity?: number;
}

/**
 * Background pattern options
 */
const patterns = {
  grid: "data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.05'%3E%3Cpath d='M36 34v6h6v-6h-6zm6 6v6h-6v-6h6zm-6-12v6h6v-6h-6zm-12 12v6h6v-6h-6zm0-6h6v6h-6v-6zm12 0h6v6h6v6h-6v6h6v6h-12v-12h-6v12h-12v-12h6v-6h-6v-12h12v12h1v.167A3.001 3.001 0 0 0 36 34z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E",
  dots: "data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.05' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E",
  waves: "data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M21.184 20c.357-.13.72-.264 1.088-.402l1.768-.661C33.64 15.347 39.647 14 50 14c10.271 0 15.362 1.222 24.629 4.928.955.383 1.869.74 2.75 1.072h6.225c-2.51-.73-5.139-1.691-8.233-2.928C65.888 13.278 60.562 12 50 12c-10.626 0-16.855 1.397-26.66 5.063l-1.767.662c-2.475.923-4.66 1.674-6.724 2.275h6.335zm0-20C13.258 2.892 8.077 4 0 4V2c5.744 0 9.951-.574 14.85-2h6.334zM77.38 0C85.239 2.966 90.502 4 100 4V2c-6.842 0-11.386-.542-16.396-2h-6.225zM0 14c8.44 0 13.718-1.21 22.272-4.402l1.768-.661C33.64 5.347 39.647 4 50 4c10.271 0 15.362 1.222 24.629 4.928C84.112 12.722 89.438 14 100 14v-2c-10.271 0-15.362-1.222-24.629-4.928C65.888 3.278 60.562 2 50 2 39.374 2 33.145 3.397 23.34 7.063l-1.767.662C13.223 10.84 8.163 12 0 12v2z' fill='%239C92AC' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E",
  circuit: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 304 304' width='304' height='304'%3E%3Cpath fill='%23000000' fill-opacity='0.05' d='M44.1 224a5 5 0 1 1 0 2H0v-2h44.1zm160 48a5 5 0 1 1 0 2H82v-2h122.1zm57.8-46a5 5 0 1 1 0-2H304v2h-42.1zm0 16a5 5 0 1 1 0-2H304v2h-42.1zm6.2-114a5 5 0 1 1 0 2h-86.2a5 5 0 1 1 0-2h86.2zm-256-48a5 5 0 1 1 0 2H0v-2h12.1zm185.8 34a5 5 0 1 1 0-2h86.2a5 5 0 1 1 0 2h-86.2zM258 12.1a5 5 0 1 1-2 0V0h2v12.1z'/%3E%3C/svg%3E"
};

/**
 * Animation variants for the Section component
 */
const sectionVariants: Record<string, Variants> = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.6,
        ease: "easeInOut"
      } 
    }
  },
  fadeInUp: {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.8,
        ease: "easeOut"
      } 
    }
  }
};

/**
 * Section component for creating consistent page sections with animation
 */
const Section = forwardRef<HTMLElement, SectionProps>(
  (
    {
      children,
      className = '',
      containerClassName = '',
      innerClassName = '',
      id,
      as = 'section',
      fullWidth = false,
      bgImage,
      bgPattern = false,
      patternOpacity = 0.05,
      variant = 'fadeIn',
      ...props
    },
    ref
  ) => {
    // Set up intersection observer
    const [sectionRef, inView] = useInView({
      triggerOnce: true,
      threshold: 0.1,
    });

    // Select the appropriate animation variant
    const animationVariant = sectionVariants[variant] || sectionVariants.fadeIn;

    // Create the main container classes
    const sectionClasses = cn(
      'relative w-full overflow-hidden',
      className
    );

    // Create the inner container classes
    const containerClasses = cn(
      fullWidth ? 'w-full' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
      containerClassName
    );

    // Inner content classes
    const innerClasses = cn(
      'relative z-10',
      innerClassName
    );

    // Determine which element to render based on props
    const Element = as as React.ElementType;

    // Determine which pattern to use based on bgPattern prop
    // If bgPattern is true, use 'grid' pattern
    // If bgPattern is a string, use that pattern if it exists in patterns
    let patternImage: string | null = null;
    
    if (bgPattern) {
      if (typeof bgPattern === 'string') {
        patternImage = patterns[bgPattern as keyof typeof patterns] || patterns.grid;
      } else {
        patternImage = patterns.grid;
      }
    }

    // Render standard section
    return (
      <Element
        ref={ref}
        id={id}
        className={sectionClasses}
        {...props}
      >
        {bgImage && (
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${bgImage})`,
              opacity: 0.15
            }}
          />
        )}
        {bgPattern && patternImage && (
          <div 
            className="absolute inset-0 z-0 pointer-events-none"
            style={{ 
              backgroundImage: `url(${patternImage})`,
              opacity: patternOpacity
            }}
          />
        )}
        <div className={containerClasses}>
          <motion.div
            ref={sectionRef}
            className={innerClasses}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={animationVariant}
          >
            {children}
          </motion.div>
        </div>
      </Element>
    );
  }
);

Section.displayName = 'Section';

export default Section;