import { useState, useRef, useEffect, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { handleImageError as fallbackImageError } from '@/lib/imageUtils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: (error: React.SyntheticEvent<HTMLImageElement>) => void;
  rootMargin?: string;
  threshold?: number;
  priority?: boolean;
  sizes?: string;
  srcSet?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  'data-testid'?: string;
  loading?: 'lazy' | 'eager';
  aspectRatio?: number;
}

/**
 * LazyImage component with IntersectionObserver-based lazy loading
 * Features:
 * - Intersection Observer for optimal performance
 * - Skeleton loading placeholder
 * - Progressive image loading with smooth transition
 * - WebP format detection and fallback
 * - Error handling with fallback images
 * - Responsive image support
 * - Customizable loading thresholds
 */
export function LazyImage({
  src,
  alt,
  className = '',
  width,
  height,
  placeholder,
  onLoad,
  onError,
  rootMargin = '50px',
  threshold = 0.1,
  priority = false,
  sizes,
  srcSet,
  objectFit = 'cover',
  'data-testid': testId,
  loading = 'lazy',
  aspectRatio,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Create optimized image URLs with WebP support
  const createOptimizedSrc = useCallback((originalSrc: string): string => {
    if (!originalSrc || typeof window === 'undefined') return originalSrc;
    
    // Check if browser supports WebP
    const supportsWebP = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      return canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
    })();

    // If it's already a WebP or doesn't support WebP, return original
    if (originalSrc.includes('.webp') || !supportsWebP) {
      return originalSrc;
    }

    // For external URLs or if we can't optimize, return original
    if (originalSrc.startsWith('http') && !originalSrc.includes(window.location.hostname)) {
      return originalSrc;
    }

    return originalSrc;
  }, []);

  // IntersectionObserver setup
  useEffect(() => {
    if (priority || !containerRef.current) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [priority, rootMargin, threshold]);

  // Load image when in view
  useEffect(() => {
    if (isInView && src && !imgSrc) {
      setImgSrc(createOptimizedSrc(src));
    }
  }, [isInView, src, imgSrc, createOptimizedSrc]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true);
    
    // Try fallback to original format if WebP failed
    const currentSrc = event.currentTarget.src;
    if (currentSrc.includes('.webp')) {
      const fallbackSrc = src;
      if (fallbackSrc !== currentSrc) {
        setImgSrc(fallbackSrc);
        setHasError(false);
        return;
      }
    }
    
    // Use the existing error handler or fallback
    if (onError) {
      onError(event);
    } else {
      fallbackImageError(event, placeholder);
    }
  }, [onError, placeholder, src]);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: width || '100%',
    height: height || (aspectRatio ? 'auto' : '100%'),
    ...(aspectRatio && { aspectRatio: aspectRatio.toString() }),
  };

  const imageStyle: React.CSSProperties = {
    objectFit,
    transition: 'opacity 0.3s ease-in-out',
    opacity: isLoaded ? 1 : 0,
  };

  return (
    <div ref={containerRef} style={containerStyle} className={`lazy-image-container ${className}`}>
      {/* Skeleton placeholder */}
      {!isLoaded && !hasError && (
        <Skeleton 
          className="absolute inset-0 w-full h-full" 
          style={{ 
            borderRadius: 'inherit',
            aspectRatio: aspectRatio?.toString()
          }} 
        />
      )}

      {/* Main image */}
      {isInView && (
        <img
          ref={imgRef}
          src={imgSrc}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          srcSet={srcSet}
          loading={loading}
          onLoad={handleLoad}
          onError={handleError}
          style={imageStyle}
          className={`w-full h-full ${className}`}
          data-testid={testId}
        />
      )}

      {/* Loading overlay for smooth transition */}
      {isInView && !isLoaded && !hasError && (
        <div className="absolute inset-0 bg-muted/20 animate-pulse" />
      )}
    </div>
  );
}

/**
 * Specialized PropertyImage component for property cards and galleries
 */
interface PropertyImageProps extends Omit<LazyImageProps, 'aspectRatio'> {
  images?: string[];
  fallbackAspectRatio?: number;
}

export function PropertyImage({ 
  images, 
  src, 
  fallbackAspectRatio = 16/9, 
  ...props 
}: PropertyImageProps) {
  // Use the first valid image from the array, or the provided src
  const imageSrc = images && images.length > 0 
    ? images.find(img => img && img.trim() !== '') || src
    : src;

  return (
    <LazyImage
      {...props}
      src={imageSrc || ''}
      aspectRatio={fallbackAspectRatio}
      objectFit="cover"
    />
  );
}

/**
 * Gallery Image component with progressive loading for image galleries
 */
interface GalleryImageProps extends LazyImageProps {
  thumbnailSrc?: string;
  isActive?: boolean;
}

export function GalleryImage({ 
  thumbnailSrc, 
  isActive = false, 
  priority = false,
  ...props 
}: GalleryImageProps) {
  return (
    <LazyImage
      {...props}
      priority={priority || isActive}
      rootMargin="100px"
      className={`gallery-image ${props.className || ''}`}
    />
  );
}