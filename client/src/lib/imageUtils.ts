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