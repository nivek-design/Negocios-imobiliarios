import { useParams } from "wouter";
import { useEffect, useState } from "react";
import Navigation from "@/components/navigation";
import InquiryForm from "@/components/inquiry-form";
import FavoriteButton from "@/components/favorite-button";
import ImageGallery from "@/components/image-gallery";
import Map from "@/components/map";
import NeighborhoodInfo from "@/components/neighborhood-info";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Bed, Bath, Square, MapPin, Home, Eye, Heart } from "lucide-react";
import { Link } from "wouter";
import { useI18n } from "@/contexts/I18nContext";
import { getPropertyMainImage, handleImageError } from "@/lib/imageUtils";
import type { Property } from "@shared/schema";

export default function PropertyDetail() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);

  const { data: property, isLoading, error } = useQuery<Property>({
    queryKey: ["/api/properties", id],
    queryFn: async () => {
      const response = await fetch(`/api/properties/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Property not found');
        }
        throw new Error('Failed to fetch property');
      }
      return response.json();
    },
    enabled: !!id,
  });

  // Record property view when component mounts
  useEffect(() => {
    if (id) {
      // Record view (don't await - fire and forget)
      fetch(`/api/properties/${id}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }).catch(() => {
        // Silently fail - view tracking is not critical
      });
    }
  }, [id]);

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (property?.status === 'for_rent') {
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

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-foreground mb-4" data-testid="text-error-title">
              {t('property.propertyNotFound')}
            </h1>
            <p className="text-muted-foreground mb-8">
              {t('property.notFoundMessage')}
            </p>
            <Button asChild data-testid="button-back-to-properties">
              <Link href="/properties">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('property.backToProperties')}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="ghost" asChild className="mb-6" data-testid="button-back">
          <Link href="/properties">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Properties
          </Link>
        </Button>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <Skeleton className="w-full h-64 rounded-lg mb-4" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="w-full h-20 rounded" />
                <Skeleton className="w-full h-20 rounded" />
                <Skeleton className="w-full h-20 rounded" />
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <Skeleton className="h-8 w-3/4 mb-2" />
                <Skeleton className="h-10 w-1/2 mb-2" />
                <Skeleton className="h-5 w-2/3" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
              </div>
              <Skeleton className="h-32 rounded-lg" />
            </div>
          </div>
        ) : property ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div>
              <div className="relative">
                <img 
                  src={getPropertyMainImage(property.images)} 
                  alt={property.title}
                  onError={handleImageError}
                  className="w-full h-64 md:h-96 object-cover rounded-lg mb-4 cursor-pointer hover:opacity-90 transition-opacity"
                  data-testid="img-property-main"
                  onClick={() => {
                    if (property.images && property.images.length > 0) {
                      setGalleryStartIndex(0);
                      setIsGalleryOpen(true);
                    }
                  }}
                />
                <div className="absolute top-4 left-4">
                  {getStatusBadge(property.status)}
                </div>
                <div className="absolute top-4 right-4 flex space-x-2">
                  <FavoriteButton 
                    propertyId={property.id} 
                    className="bg-white/80 hover:bg-white"
                  />
                </div>
              </div>
              
              {property.images && property.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {property.images.slice(1, 5).map((image, index) => (
                    <img 
                      key={index}
                      src={image}
                      alt={`${property.title} ${index + 2}`}
                      onError={handleImageError}
                      className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                      data-testid={`img-gallery-${index + 1}`}
                      onClick={() => {
                        setGalleryStartIndex(index + 1);
                        setIsGalleryOpen(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* Property Details */}
            <div>
              <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2" data-testid="text-property-title">
                  {property.title}
                </h1>
                <p className="text-primary text-3xl font-bold mb-2" data-testid="text-property-price">
                  {formatPrice(property.price)}
                </p>
                <p className="text-muted-foreground flex items-center" data-testid="text-property-address">
                  <MapPin className="w-4 h-4 mr-2" />
                  {property.address}, {property.city}, {property.state} {property.zipCode}
                </p>
              </div>
              
              {/* Property Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Bed className="w-6 h-6 text-primary mb-2 mx-auto" />
                  <p className="text-xl font-bold text-foreground" data-testid="text-bedrooms">
                    {property.bedrooms}
                  </p>
                  <p className="text-sm text-muted-foreground">{t('property.bedrooms')}</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Bath className="w-6 h-6 text-primary mb-2 mx-auto" />
                  <p className="text-xl font-bold text-foreground" data-testid="text-bathrooms">
                    {property.bathrooms}
                  </p>
                  <p className="text-sm text-muted-foreground">{t('property.bathrooms')}</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Square className="w-6 h-6 text-primary mb-2 mx-auto" />
                  <p className="text-xl font-bold text-foreground" data-testid="text-square-feet">
                    {property.squareFeet}
                  </p>
                  <p className="text-sm text-muted-foreground">{t('property.sqft')}</p>
                </div>
              </div>
              
              {/* Description */}
              {property.description && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-foreground mb-3">{t('property.description')}</h2>
                  <p className="text-muted-foreground" data-testid="text-description">
                    {property.description}
                  </p>
                </div>
              )}
              
              {/* Features */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground mb-3">{t('property.propertyDetails')}</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="text-foreground capitalize" data-testid="text-property-type">
                      {property.propertyType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="text-foreground capitalize" data-testid="text-property-status">
                      {property.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Contact Form */}
              <InquiryForm 
                propertyId={property.id} 
                propertyTitle={property.title}
              />
            </div>
          </div>
        ) : null}

        {/* Map and Location Section */}
        {property?.latitude && property?.longitude && (
          <div className="mt-12 space-y-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">Localização e Mapa</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <Map
                  properties={[property]}
                  center={{
                    lat: parseFloat(property.latitude),
                    lng: parseFloat(property.longitude),
                  }}
                  zoom={15}
                  height="400px"
                  className="shadow-lg"
                />
              </div>
              
              <div>
                <NeighborhoodInfo
                  latitude={parseFloat(property.latitude)}
                  longitude={parseFloat(property.longitude)}
                  className="h-full"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Gallery Modal */}
      {property && (
        <ImageGallery
          images={property.images || []}
          title={property.title}
          isOpen={isGalleryOpen}
          onClose={() => setIsGalleryOpen(false)}
          initialIndex={galleryStartIndex}
        />
      )}
    </div>
  );
}
