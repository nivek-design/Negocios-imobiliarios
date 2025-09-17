import { memo, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Bed, Bath, Square, MapPin } from "lucide-react";
import { Link } from "wouter";
import { useI18n } from "@/contexts/I18nContext";
import { getPropertyMainImage, generateImageSizes, generateImageSrcSet, optimizeImageUrl } from "@/lib/imageUtils";
import { PropertyImage } from "@/components/ui/lazy-image";
import { useRenderMetrics } from "@/hooks/usePerformance";
import type { Property } from "@shared/schema";

interface PropertyCardProps {
  property: Property;
  className?: string;
}

function PropertyCard({ property, className = "" }: PropertyCardProps) {
  const { t } = useI18n();
  const getRenderInfo = useRenderMetrics(`PropertyCard-${property.id}`);

  // Memoize expensive calculations
  const formattedPrice = useMemo(() => {
    const num = parseFloat(property.price);
    if (property.status === 'for_rent') {
      return `$${num.toLocaleString()}/mo`;
    }
    return `$${num.toLocaleString()}`;
  }, [property.price, property.status]);

  const statusBadge = useMemo(() => {
    switch (property.status) {
      case 'for_sale':
        return <Badge className="bg-secondary text-secondary-foreground">{t('status.forSale')}</Badge>;
      case 'for_rent':
        return <Badge className="bg-accent text-accent-foreground">{t('status.forRent')}</Badge>;
      case 'sold':
        return <Badge className="bg-muted text-muted-foreground">{t('status.sold')}</Badge>;
      case 'rented':
        return <Badge className="bg-muted text-muted-foreground">{t('status.rented')}</Badge>;
      default:
        return null;
    }
  }, [property.status, t]);

  // Memoize image processing
  const imageData = useMemo(() => {
    const mainImage = getPropertyMainImage(property.images);
    return {
      optimized: optimizeImageUrl(mainImage, { width: 400, height: 250, quality: 85 }),
      sizes: generateImageSizes(400),
      srcSet: generateImageSrcSet(mainImage, [300, 400, 600, 800]),
      mainImage
    };
  }, [property.images]);

  // Memoize click handlers
  const handleFavoriteClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: Implement favorite functionality
    console.log(`Toggle favorite for property ${property.id}`);
  }, [property.id]);

  return (
    <div className={`property-card bg-card rounded-lg shadow-lg overflow-hidden border border-border ${className}`}>
      <div className="relative h-64 overflow-hidden">
        <PropertyImage
          src={imageData.optimized}
          images={property.images}
          alt={property.title}
          width="100%"
          height={256}
          className="property-image w-full h-full object-cover"
          sizes={imageData.sizes}
          srcSet={imageData.srcSet}
          fallbackAspectRatio={16/10}
          data-testid={`img-property-${property.id}`}
          rootMargin="50px"
          loading="lazy"
        />
        <div className="absolute top-4 left-4">
          {statusBadge}
        </div>
        <div className="absolute top-4 right-4">
          <Button 
            variant="secondary" 
            size="sm"
            className="bg-white/80 hover:bg-white text-foreground p-2 rounded-full"
            data-testid={`button-favorite-${property.id}`}
            onClick={handleFavoriteClick}
          >
            <Heart className="w-4 h-4" />
          </Button>
        </div>
        <div className="absolute bottom-4 left-4">
          <Badge className="bg-primary text-primary-foreground text-lg font-bold px-3 py-1">
            {formattedPrice}
          </Badge>
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-xl font-semibold text-foreground mb-2" data-testid={`text-title-${property.id}`}>
          {property.title}
        </h3>
        <p className="text-muted-foreground mb-4 flex items-center" data-testid={`text-location-${property.id}`}>
          <MapPin className="w-4 h-4 mr-2" />
          {property.city}, {property.state}
        </p>
        <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground mb-4">
          <span className="flex items-center" data-testid={`text-bedrooms-${property.id}`}>
            <Bed className="w-4 h-4 mr-1" /> {property.bedrooms} {t('property.beds')}
          </span>
          <span className="flex items-center" data-testid={`text-bathrooms-${property.id}`}>
            <Bath className="w-4 h-4 mr-1" /> {property.bathrooms} {t('property.baths')}
          </span>
          <span className="flex items-center" data-testid={`text-sqft-${property.id}`}>
            <Square className="w-4 h-4 mr-1" /> {property.squareFeet} m²
          </span>
          {property.garageSpaces && property.garageSpaces > 0 && (
            <span className="flex items-center" data-testid={`text-garage-${property.id}`}>
              🚗 {property.garageSpaces} vagas
            </span>
          )}
          {property.yearBuilt && (
            <span className="flex items-center" data-testid={`text-year-${property.id}`}>
              📅 {property.yearBuilt}
            </span>
          )}
          {property.lotArea && (
            <span className="flex items-center" data-testid={`text-lot-area-${property.id}`}>
              🏞️ {property.lotArea} m² terreno
            </span>
          )}
        </div>
        <Button asChild className="w-full" data-testid={`button-view-details-${property.id}`}>
          <Link href={`/property/${property.id}`}>
            {t('property.viewDetails')}
          </Link>
        </Button>
      </div>
    </div>
  );
}

// Export memoized component for performance
export default memo(PropertyCard);
