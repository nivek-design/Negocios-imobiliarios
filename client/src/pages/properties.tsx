import { useState, useEffect } from "react";
import Navigation from "@/components/navigation";
import PropertyCard from "@/components/property-card";
import PropertySearch from "@/components/property-search";
import Map from "@/components/map";
import LocationAutocomplete from "@/components/location-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Grid, MapIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/contexts/I18nContext";
import type { Property } from "@shared/schema";

export default function Properties() {
  const { t } = useI18n();
  const [location] = useLocation();
  const [filters, setFilters] = useState<any>({});
  const [searchInput, setSearchInput] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<{lat: number; lng: number} | null>(null);
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const propertiesPerPage = 12;

  // Parse URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const initialFilters: any = {};
    
    urlParams.forEach((value, key) => {
      if (key === 'propertyType') {
        initialFilters.propertyType = [value];
      } else {
        initialFilters[key] = value;
      }
    });
    
    setFilters(initialFilters);
    setSearchInput(initialFilters.search || "");
  }, [location]);

  // Sync search input with filters with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }));
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        if (Array.isArray(value) && value.length > 0) {
          value.forEach(v => params.append(key, v));
        } else if (!Array.isArray(value)) {
          // Handle boolean values properly
          if (typeof value === 'boolean') {
            params.set(key, value.toString());
          } else {
            params.set(key, value as string);
          }
        }
      }
    });
    
    params.set('limit', propertiesPerPage.toString());
    params.set('offset', ((currentPage - 1) * propertiesPerPage).toString());
    
    if (sortBy) {
      params.set('sortBy', sortBy);
    }
    
    return params.toString();
  };

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties", buildQueryParams()],
    queryFn: async () => {
      const response = await fetch(`/api/properties?${buildQueryParams()}`);
      if (!response.ok) throw new Error('Failed to fetch properties');
      return response.json();
    },
  });

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Location Search Bar */}
      <section className="py-6 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold mb-4">Encontre o Imóvel Perfeito</h2>
            <p className="text-lg opacity-90 mb-6">Use nossa busca avançada para encontrar a propriedade dos seus sonhos</p>
          </div>
          <div className="flex gap-2">
            <LocationAutocomplete
              value={searchInput}
              onChange={(value, location) => {
                setSearchInput(value);
                if (location) {
                  setSelectedLocation(location);
                }
              }}
              onLocationSelect={(location) => {
                setSelectedLocation({ lat: location.lat, lng: location.lng });
                setFilters(prev => ({ 
                  ...prev, 
                  search: searchInput,
                  latitude: location.lat,
                  longitude: location.lng,
                  radius: 50 // Raio padrão de 50km
                }));
              }}
              placeholder="Digite uma cidade, bairro ou endereço..."
              className="flex-1 h-12 text-lg bg-white text-black"
            />
            <Button 
              size="lg" 
              variant="secondary"
              className="h-12 px-8"
              data-testid="button-search-location"
              onClick={() => {
                setFilters(prev => ({ 
                  ...prev, 
                  search: searchInput,
                  ...(selectedLocation && {
                    latitude: selectedLocation.lat,
                    longitude: selectedLocation.lng,
                    radius: 50 // Raio padrão de 50km
                  })
                }));
              }}
            >
              Buscar
            </Button>
          </div>
        </div>
      </section>

      <section className="py-8 bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Search Filters */}
            <div className="lg:w-1/4">
              <PropertySearch 
                onFilterChange={handleFilterChange}
                initialFilters={filters}
              />
            </div>

            {/* Search Results */}
            <div className="lg:w-3/4">
              <div className="mb-6 flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-foreground" data-testid="text-search-results">
                  {t('search.results')}
                </h1>
                <div className="flex items-center space-x-4">
                  <span className="text-muted-foreground" data-testid="text-results-count">
                    {properties.length} {t('search.propertiesFound')}
                  </span>
                  
                  {/* View Mode Toggle */}
                  <div className="flex bg-muted rounded-lg p-1">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="px-3 py-1"
                      data-testid="button-view-grid"
                    >
                      <Grid className="w-4 h-4 mr-1" />
                      Grade
                    </Button>
                    <Button
                      variant={viewMode === 'map' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('map')}
                      className="px-3 py-1"
                      data-testid="button-view-map"
                    >
                      <MapIcon className="w-4 h-4 mr-1" />
                      Mapa
                    </Button>
                  </div>
                  
                  <Select value={sortBy} onValueChange={handleSortChange}>
                    <SelectTrigger className="w-48" data-testid="select-sort">
                      <SelectValue placeholder={t('search.sortBy')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">{t('search.newest')}</SelectItem>
                      <SelectItem value="oldest">{t('search.oldest')}</SelectItem>
                      <SelectItem value="price-low">{t('search.priceLowHigh')}</SelectItem>
                      <SelectItem value="price-high">{t('search.priceHighLow')}</SelectItem>
                      <SelectItem value="size-high">{t('search.sizeLargest')}</SelectItem>
                      <SelectItem value="size-low">{t('search.sizeSmallest')}</SelectItem>
                      <SelectItem value="bedrooms-high">{t('search.bedroomsHigh')}</SelectItem>
                      <SelectItem value="bedrooms-low">{t('search.bedroomsLow')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

{viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {isLoading ? (
                    Array.from({ length: propertiesPerPage }).map((_, i) => (
                      <div key={i} className="bg-card rounded-lg shadow-lg overflow-hidden border border-border">
                        <Skeleton className="h-48 w-full" />
                        <div className="p-4 space-y-3">
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                          <div className="flex justify-between">
                            <Skeleton className="h-4 w-12" />
                            <Skeleton className="h-4 w-12" />
                            <Skeleton className="h-4 w-12" />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : properties.length > 0 ? (
                    properties.map((property) => (
                      <PropertyCard key={property.id} property={property} />
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12">
                      <p className="text-muted-foreground text-lg" data-testid="text-no-properties">
                        {t('common.noResults')}.
                      </p>
                      <p className="text-muted-foreground mt-2">
                        {t('common.tryAdjustFilters')}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full">
                  {isLoading ? (
                    <Skeleton className="w-full h-96 rounded-lg" />
                  ) : properties.length > 0 ? (
                    <Map
                      properties={properties}
                      height="600px"
                      className="shadow-lg rounded-lg"
                      showPropertyDetails={true}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground text-lg" data-testid="text-no-properties">
                        {t('common.noResults')}.
                      </p>
                      <p className="text-muted-foreground mt-2">
                        {t('common.tryAdjustFilters')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Pagination - only show in grid view */}
              {viewMode === 'grid' && properties.length >= propertiesPerPage && (
                <div className="mt-8 flex justify-center">
                  <nav className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      data-testid="button-previous"
                    >
                      {t('common.previous')}
                    </Button>
                    <Button 
                      variant="default"
                      data-testid={`button-page-${currentPage}`}
                    >
                      {currentPage}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={properties.length < propertiesPerPage}
                      data-testid="button-next"
                    >
                      {t('common.next')}
                    </Button>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
