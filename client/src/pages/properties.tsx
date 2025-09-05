import { useState, useEffect } from "react";
import Navigation from "@/components/navigation";
import PropertyCard from "@/components/property-card";
import PropertySearch from "@/components/property-search";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import type { Property } from "@shared/schema";

export default function Properties() {
  const [location] = useLocation();
  const [filters, setFilters] = useState<any>({});
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
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
  }, [location]);

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "" && value !== []) {
        if (Array.isArray(value) && value.length > 0) {
          value.forEach(v => params.append(key, v));
        } else if (!Array.isArray(value)) {
          params.set(key, value as string);
        }
      }
    });
    
    params.set('limit', propertiesPerPage.toString());
    params.set('offset', ((currentPage - 1) * propertiesPerPage).toString());
    
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
    // TODO: Implement sorting logic
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
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
                  Search Results
                </h1>
                <div className="flex items-center space-x-4">
                  <span className="text-muted-foreground" data-testid="text-results-count">
                    {properties.length} properties found
                  </span>
                  <Select value={sortBy} onValueChange={handleSortChange}>
                    <SelectTrigger className="w-48" data-testid="select-sort">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Sort by: Newest</SelectItem>
                      <SelectItem value="price-low">Sort by: Price (Low to High)</SelectItem>
                      <SelectItem value="price-high">Sort by: Price (High to Low)</SelectItem>
                      <SelectItem value="sqft">Sort by: Square Feet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

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
                      No properties found matching your criteria.
                    </p>
                    <p className="text-muted-foreground mt-2">
                      Try adjusting your filters or search terms.
                    </p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {properties.length >= propertiesPerPage && (
                <div className="mt-8 flex justify-center">
                  <nav className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      data-testid="button-previous"
                    >
                      Previous
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
                      Next
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
