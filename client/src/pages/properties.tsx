import { useState, useEffect, useMemo, useCallback, memo } from "react";
import Navigation from "@/components/navigation";
import PropertyCard from "@/components/property-card";
import PropertySearch from "@/components/property-search";
import { LazyMap } from "@/components/lazy/lazy-map";
import LocationAutocomplete from "@/components/location-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Grid, MapIcon, Loader2 } from "lucide-react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { VirtualPropertyGrid, VirtualScrollingSkeleton } from "@/components/ui/virtual-scrolling";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useI18n } from "@/contexts/I18nContext";
import { preloadImages } from "@/lib/imageUtils";
import type { Property } from "@shared/schema";

// Memoized PropertyCard for better performance
const MemoizedPropertyCard = memo(PropertyCard);

// Optimized search debouncing hook
function useDebounced<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function Properties() {
  const { t } = useI18n();
  const [location] = useLocation();
  const [filters, setFilters] = useState<any>({});
  const [searchInput, setSearchInput] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<{lat: number; lng: number} | null>(null);
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const queryClient = useQueryClient();
  const propertiesPerPage = 20; // Increased for better infinite scroll performance

  // Debounced search to reduce API calls
  const debouncedSearchInput = useDebounced(searchInput, 300);
  const debouncedFilters = useDebounced(filters, 300);

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

  // Sync search input with filters with optimized debouncing
  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearchInput }));
  }, [debouncedSearchInput]);

  const buildQueryParams = useCallback((pageParam: number = 0) => {
    const params = new URLSearchParams();
    
    Object.entries(debouncedFilters).forEach(([key, value]) => {
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
    params.set('offset', (pageParam * propertiesPerPage).toString());
    
    if (sortBy) {
      params.set('sortBy', sortBy);
    }
    
    return params.toString();
  }, [debouncedFilters, sortBy, propertiesPerPage]);

  // Infinite query for properties with automatic pagination
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["/api/properties", debouncedFilters, sortBy],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetch(`/api/properties?${buildQueryParams(pageParam)}`);
      if (!response.ok) throw new Error('Failed to fetch properties');
      const data = await response.json();
      
      // Prefetch property images for better UX
      if (data && data.length > 0) {
        const imageUrls = data
          .flatMap((property: Property) => property.images || [])
          .filter(Boolean)
          .slice(0, 10); // Prefetch first 10 images
        
        preloadImages(imageUrls);
      }
      
      return {
        data,
        nextPage: data.length === propertiesPerPage ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Flatten paginated data
  const properties = useMemo(() => {
    return infiniteData?.pages?.flatMap(page => page.data) || [];
  }, [infiniteData]);

  // Infinite scroll trigger
  const { ref: infiniteScrollRef } = useInfiniteScroll(
    () => {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    {
      hasNextPage,
      isFetchingNextPage,
      rootMargin: '200px',
    }
  );

  const handleFilterChange = useCallback((newFilters: any) => {
    setFilters(newFilters);
    // Reset infinite query when filters change
    queryClient.removeQueries({ queryKey: ["/api/properties"] });
  }, [queryClient]);

  const handleSortChange = useCallback((value: string) => {
    setSortBy(value);
    // Reset infinite query when sorting changes
    queryClient.removeQueries({ queryKey: ["/api/properties"] });
  }, [queryClient]);

  const handleLocationSelect = useCallback((location: { lat: number; lng: number; address: string }) => {
    setSelectedLocation({ lat: location.lat, lng: location.lng });
    setFilters(prev => ({ 
      ...prev, 
      search: location.address,
      latitude: location.lat,
      longitude: location.lng,
      radius: 50 // Default 50km radius
    }));
  }, []);

  const handleSearchClick = useCallback(() => {
    setFilters(prev => ({ 
      ...prev, 
      search: searchInput,
      ...(selectedLocation && {
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        radius: 50
      })
    }));
  }, [searchInput, selectedLocation]);

  // Memoize render functions for better performance
  const renderProperty = useCallback((property: Property, index: number) => (
    <MemoizedPropertyCard key={property.id} property={property} />
  ), []);

  const memoizedPropertySearch = useMemo(() => (
    <PropertySearch 
      onFilterChange={handleFilterChange}
      initialFilters={filters}
    />
  ), [handleFilterChange, filters]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Location Search Bar */}
      <section className="py-6 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold mb-4">Conectando você ao seu novo lar.</h2>
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
              onLocationSelect={handleLocationSelect}
              placeholder="Digite uma cidade, bairro ou endereço..."
              className="flex-1 h-12 text-lg bg-white text-black"
            />
            <Button 
              size="lg" 
              variant="secondary"
              className="h-12 px-8"
              data-testid="button-search-location"
              onClick={handleSearchClick}
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
              {memoizedPropertySearch}
            </div>

            {/* Search Results */}
            <div className="lg:w-3/4">
              <div className="mb-6 flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-foreground" data-testid="text-search-results">
                  {t('search.results')}
                </h1>
                <div className="flex items-center space-x-4">
                  <span className="text-muted-foreground" data-testid="text-results-count">
                    {properties.length}{hasNextPage ? '+' : ''} {t('search.propertiesFound')}
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
                <div className="space-y-6">
                  {isLoading && properties.length === 0 ? (
                    <VirtualScrollingSkeleton 
                      itemHeight={400}
                      containerHeight={1200}
                      itemsCount={12}
                    />
                  ) : properties.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {properties.map((property) => (
                          <MemoizedPropertyCard key={property.id} property={property} />
                        ))}
                      </div>

                      {/* Infinite scroll trigger */}
                      <div ref={infiniteScrollRef} className="flex justify-center py-8">
                        {isFetchingNextPage && (
                          <div className="flex items-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-muted-foreground">Carregando mais propriedades...</span>
                          </div>
                        )}
                        {!hasNextPage && properties.length > propertiesPerPage && (
                          <p className="text-muted-foreground text-sm">
                            Todas as propriedades foram carregadas
                          </p>
                        )}
                      </div>
                    </>
                  ) : !isLoading ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground text-lg" data-testid="text-no-properties">
                        {t('common.noResults')}.
                      </p>
                      <p className="text-muted-foreground mt-2">
                        {t('common.tryAdjustFilters')}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="w-full">
                  {isLoading && properties.length === 0 ? (
                    <Skeleton className="w-full h-96 rounded-lg" />
                  ) : properties.length > 0 ? (
                    <LazyMap
                      properties={properties}
                      height="600px"
                      className="shadow-lg rounded-lg"
                      showPropertyDetails={true}
                      fallbackHeight="h-96"
                    />
                  ) : !isLoading ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground text-lg" data-testid="text-no-properties">
                        {t('common.noResults')}.
                      </p>
                      <p className="text-muted-foreground mt-2">
                        {t('common.tryAdjustFilters')}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Error handling */}
              {isError && (
                <div className="text-center py-12">
                  <p className="text-destructive text-lg mb-4">
                    Erro ao carregar propriedades
                  </p>
                  <Button onClick={() => refetch()} variant="outline">
                    Tentar novamente
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
