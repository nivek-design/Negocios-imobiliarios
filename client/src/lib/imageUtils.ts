import propertyPlaceholder from '@/assets/images/property-placeholder.png';

/**
 * Utility function to get property image URL with fallback to placeholder
 * @param imageUrl - The property image URL
 * @param fallbackUrl - Optional custom fallback URL
 * @returns A valid image URL
 */
export function getPropertyImageUrl(imageUrl?: string | null, fallbackUrl?: string): string {
  if (imageUrl && imageUrl.trim() !== '') {
    return imageUrl;
  }
  return fallbackUrl || propertyPlaceholder;
}

/**
 * Utility function to get the first valid image from a property's images array
 * @param images - Array of image URLs
 * @param fallbackUrl - Optional custom fallback URL
 * @returns A valid image URL
 */
export function getPropertyMainImage(images?: string[] | null, fallbackUrl?: string): string {
  if (images && images.length > 0) {
    const firstValidImage = images.find(img => img && img.trim() !== '');
    if (firstValidImage) {
      return firstValidImage;
    }
  }
  return fallbackUrl || propertyPlaceholder;
}

/**
 * Utility function to handle image load errors by setting a placeholder
 * @param event - The image error event
 * @param fallbackUrl - Optional custom fallback URL
 */
export function handleImageError(event: React.SyntheticEvent<HTMLImageElement>, fallbackUrl?: string): void {
  const img = event.currentTarget;
  img.src = fallbackUrl || propertyPlaceholder;
  img.onerror = null; // Prevent infinite loop if placeholder also fails
}

/**
 * Generate responsive image sizes for different breakpoints
 * @param baseWidth - Base width of the image
 * @returns Sizes string for responsive images
 */
export function generateImageSizes(baseWidth: number = 300): string {
  return `
    (max-width: 640px) ${baseWidth}px,
    (max-width: 768px) ${Math.round(baseWidth * 1.2)}px,
    (max-width: 1024px) ${Math.round(baseWidth * 1.5)}px,
    (max-width: 1280px) ${Math.round(baseWidth * 1.8)}px,
    ${Math.round(baseWidth * 2)}px
  `.replace(/\s+/g, ' ').trim();
}

/**
 * Generate srcSet for responsive images with different densities
 * @param imageUrl - Base image URL
 * @param widths - Array of widths to generate
 * @returns SrcSet string for responsive images
 */
export function generateImageSrcSet(imageUrl: string, widths: number[] = [300, 600, 900, 1200]): string {
  if (!imageUrl || imageUrl === propertyPlaceholder) {
    return '';
  }

  // For external URLs or if we can't optimize, return empty srcSet
  if (imageUrl.startsWith('http') && typeof window !== 'undefined' && !imageUrl.includes(window.location.hostname)) {
    return '';
  }

  // Generate srcSet for different widths
  return widths
    .map(width => {
      // For now, return the same URL with width parameter
      // In a real app, you'd have an image service that resizes images
      const separator = imageUrl.includes('?') ? '&' : '?';
      return `${imageUrl}${separator}w=${width} ${width}w`;
    })
    .join(', ');
}

/**
 * Preload critical images for better performance
 * @param imageUrls - Array of image URLs to preload
 * @param priority - Whether to preload with high priority
 */
export function preloadImages(imageUrls: string[], priority: boolean = false): void {
  if (typeof window === 'undefined') return;

  imageUrls.forEach(url => {
    if (!url || url.trim() === '') return;

    const link = document.createElement('link');
    link.rel = priority ? 'preload' : 'prefetch';
    link.as = 'image';
    link.href = url;
    
    if (priority) {
      link.setAttribute('importance', 'high');
    }

    // Avoid duplicate preloads
    const existingLink = document.querySelector(`link[href="${url}"]`);
    if (!existingLink) {
      document.head.appendChild(link);
    }
  });
}

/**
 * Check if browser supports WebP format
 * @returns Promise that resolves to boolean indicating WebP support
 */
export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
}

/**
 * Optimize image URL for better performance
 * @param imageUrl - Original image URL
 * @param options - Optimization options
 * @returns Optimized image URL
 */
export function optimizeImageUrl(
  imageUrl: string, 
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
  } = {}
): string {
  if (!imageUrl || imageUrl === propertyPlaceholder) {
    return imageUrl;
  }

  // For external URLs, return as-is
  if (imageUrl.startsWith('http') && typeof window !== 'undefined' && !imageUrl.includes(window.location.hostname)) {
    return imageUrl;
  }

  const { width, height, quality = 80, format } = options;
  const params = new URLSearchParams();

  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  if (quality !== 80) params.set('q', quality.toString());
  if (format) params.set('f', format);

  const separator = imageUrl.includes('?') ? '&' : '?';
  const queryString = params.toString();
  
  return queryString ? `${imageUrl}${separator}${queryString}` : imageUrl;
}

/**
 * Create blur placeholder for progressive image loading
 * @param imageUrl - Original image URL
 * @returns Data URL for blur placeholder
 */
export function createBlurPlaceholder(imageUrl: string): string {
  // Simple base64 blur placeholder - in production, you might generate this server-side
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjRjNGNEY2Ii8+CjwvcmVnPgo=';
}