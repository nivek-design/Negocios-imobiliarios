import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Bed, Bath, Square, MapPin } from "lucide-react";
import { Link } from "wouter";
import { useI18n } from "@/contexts/I18nContext";
import type { Property } from "@shared/schema";

interface PropertyCardProps {
  property: Property;
  className?: string;
}

export default function PropertyCard({ property, className = "" }: PropertyCardProps) {
  const { t } = useI18n();
  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (property.status === 'for_rent') {
      return `$${num.toLocaleString()}/mo`;
    }
    return `$${num.toLocaleString()}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
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
  };

  const mainImage = property.images?.[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600';

  return (
    <div className={`property-card bg-card rounded-lg shadow-lg overflow-hidden border border-border ${className}`}>
      <div className="relative h-64 overflow-hidden">
        <img 
          src={mainImage} 
          alt={property.title}
          className="property-image w-full h-full object-cover"
          data-testid={`img-property-${property.id}`}
        />
        <div className="absolute top-4 left-4">
          {getStatusBadge(property.status)}
        </div>
        <div className="absolute top-4 right-4">
          <Button 
            variant="secondary" 
            size="sm"
            className="bg-white/80 hover:bg-white text-foreground p-2 rounded-full"
            data-testid={`button-favorite-${property.id}`}
          >
            <Heart className="w-4 h-4" />
          </Button>
        </div>
        <div className="absolute bottom-4 left-4">
          <Badge className="bg-primary text-primary-foreground text-lg font-bold px-3 py-1">
            {formatPrice(property.price)}
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
        <div className="flex justify-between text-sm text-muted-foreground mb-4">
          <span className="flex items-center" data-testid={`text-bedrooms-${property.id}`}>
            <Bed className="w-4 h-4 mr-1" /> {property.bedrooms} {t('property.beds')}
          </span>
          <span className="flex items-center" data-testid={`text-bathrooms-${property.id}`}>
            <Bath className="w-4 h-4 mr-1" /> {property.bathrooms} {t('property.baths')}
          </span>
          <span className="flex items-center" data-testid={`text-sqft-${property.id}`}>
            <Square className="w-4 h-4 mr-1" /> {property.squareFeet} {t('property.sqft')}
          </span>
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
