import React from 'react';
import Image, { ImageProps } from 'next/image';

interface OptimizedImageProps extends Omit<ImageProps, 'src' | 'alt'> {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  quality?: number;
  className?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  objectPosition?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  priority = false,
  quality = 80,
  className = '',
  objectFit = 'cover',
  objectPosition = 'center',
  ...props
}) => {
  const isExternal = src.startsWith('http');
  const imageSrc = isExternal ? src : src;

  // Generate srcSet for responsive images
  const generateSrcSet = (src: string, widths: number[], quality: number) => {
    if (!isExternal) return undefined;
    
    return widths
      .map((w) => {
        const url = new URL(src);
        url.searchParams.set('w', w.toString());
        url.searchParams.set('q', quality.toString());
        return `${url.toString()} ${w}w`;
      })
      .join(', ');
  };

  // Define responsive image sizes
  const sizes = `
    (max-width: 640px) 100vw,
    (max-width: 768px) 85vw,
    (max-width: 1200px) 75vw,
    65vw
  `;

  // Generate srcSet for modern image formats if supported
  const srcSetWebP = generateSrcSet(
    imageSrc.replace(/\.(jpe?g|png)$/i, '.webp'),
    [320, 480, 640, 750, 828, 1080, 1200, 1920],
    quality
  );

  const srcSetAvif = generateSrcSet(
    imageSrc.replace(/\.(jpe?g|png)$/i, '.avif'),
    [320, 480, 640, 750, 828, 1080, 1200, 1920],
    quality
  );

  return (
    <div 
      className={`relative ${className}`} 
      style={{ 
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Modern formats with fallback */}
      <picture>
        {srcSetAvif && (
          <source
            type="image/avif"
            srcSet={srcSetAvif}
            sizes={sizes}
          />
        )}
        {srcSetWebP && (
          <source
            type="image/webp"
            srcSet={srcSetWebP}
            sizes={sizes}
          />
        )}
        <Image
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          quality={quality}
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
          className="w-full h-full"
          style={{
            objectFit,
            objectPosition,
            transition: 'opacity 0.3s ease-in-out',
          }}
          onLoad={(e) => {
            // Add loaded class for fade-in effect
            const target = e.target as HTMLImageElement;
            target.style.opacity = '1';
          }}
          onError={(e) => {
            // Handle image loading errors
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = '/images/placeholder.jpg'; // Fallback image
          }}
          {...props}
        />
      </picture>
      
      {/* Loading placeholder */}
      {!priority && (
        <div 
          className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse"
          style={{ zIndex: -1 }}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default React.memo(OptimizedImage);
