import { useState, useCallback, useMemo } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPropertyImageUrl, optimizeImageUrl, generateImageSizes, preloadImages } from "@/lib/imageUtils";
import { GalleryImage } from "@/components/ui/lazy-image";

interface ImageGalleryProps {
  images: string[];
  title: string;
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
}

export default function ImageGallery({ images, title, isOpen, onClose, initialIndex = 0 }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Memoize optimized images for performance
  const optimizedImages = useMemo(() => {
    return images.map(img => ({
      full: optimizeImageUrl(img, { width: 1200, height: 800, quality: 90 }),
      thumbnail: optimizeImageUrl(img, { width: 100, height: 100, quality: 70 })
    }));
  }, [images]);

  // Preload adjacent images for smooth navigation
  const preloadAdjacentImages = useCallback((index: number) => {
    const imagesToPreload = [];
    const prevIndex = index === 0 ? images.length - 1 : index - 1;
    const nextIndex = index === images.length - 1 ? 0 : index + 1;
    
    if (optimizedImages[prevIndex]) imagesToPreload.push(optimizedImages[prevIndex].full);
    if (optimizedImages[nextIndex]) imagesToPreload.push(optimizedImages[nextIndex].full);
    
    preloadImages(imagesToPreload, true);
  }, [images.length, optimizedImages]);

  if (!isOpen || !images || images.length === 0) {
    return null;
  }

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => {
      const newIndex = prev === 0 ? images.length - 1 : prev - 1;
      preloadAdjacentImages(newIndex);
      return newIndex;
    });
  }, [images.length, preloadAdjacentImages]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const newIndex = prev === images.length - 1 ? 0 : prev + 1;
      preloadAdjacentImages(newIndex);
      return newIndex;
    });
  }, [images.length, preloadAdjacentImages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowLeft') {
      goToPrevious();
    } else if (e.key === 'ArrowRight') {
      goToNext();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      data-testid="image-gallery-modal"
    >
      <div className="relative max-w-7xl max-h-screen w-full h-full p-4">
        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white"
          onClick={onClose}
          data-testid="button-close-gallery"
        >
          <X className="w-6 h-6" />
        </Button>

        {/* Navigation buttons */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white"
              onClick={goToPrevious}
              data-testid="button-previous-image"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white"
              onClick={goToNext}
              data-testid="button-next-image"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </>
        )}

        {/* Main image */}
        <div className="flex items-center justify-center h-full">
          <GalleryImage
            src={optimizedImages[currentIndex]?.full || getPropertyImageUrl(images[currentIndex])}
            alt={`${title} - Image ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain"
            width="100%"
            height="100%"
            priority={true}
            isActive={true}
            sizes={generateImageSizes(1200)}
            data-testid={`gallery-image-${currentIndex}`}
          />
        </div>

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        )}

        {/* Thumbnail navigation */}
        {images.length > 1 && (
          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex space-x-2 max-w-full overflow-x-auto px-4">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  preloadAdjacentImages(index);
                }}
                className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all duration-200 ${
                  index === currentIndex ? 'border-white' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
                data-testid={`thumbnail-${index}`}
              >
                <GalleryImage
                  src={optimizedImages[index]?.thumbnail || getPropertyImageUrl(image)}
                  alt={`${title} - Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  width={64}
                  height={64}
                  priority={Math.abs(index - currentIndex) <= 2} // Preload nearby thumbnails
                  aspectRatio={1}
                  rootMargin="100px"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}