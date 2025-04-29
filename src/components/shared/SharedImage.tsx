import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface SharedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  fallbackSearchTerm?: string;
  aspectRatio?: 'video' | 'square' | 'wide';
}

export const SharedImage: React.FC<SharedImageProps> = ({
  src,
  alt,
  className,
  fallbackSrc,
  fallbackSearchTerm,
  aspectRatio = 'video',
  ...props
}) => {
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getFallbackImage = () => {
    if (fallbackSrc) return fallbackSrc;
    if (fallbackSearchTerm) {
      const dimensions = aspectRatio === 'square' ? '400x400' : 
                        aspectRatio === 'wide' ? '800x400' : '400x300';
      return `https://source.unsplash.com/random/${dimensions}/?${encodeURIComponent(fallbackSearchTerm)}`;
    }
    return '/placeholder.jpg';
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className={cn(
      'relative overflow-hidden',
      aspectRatio === 'video' && 'aspect-video',
      aspectRatio === 'square' && 'aspect-square',
      aspectRatio === 'wide' && 'aspect-[2/1]',
      className
    )}>
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <img
        src={error ? getFallbackImage() : src}
        alt={alt}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onError={() => setError(true)}
        onLoad={handleLoad}
        {...props}
      />
    </div>
  );
};

export default SharedImage;

