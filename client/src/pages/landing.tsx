import Navigation from "@/components/navigation";
import HeroSection from "@/components/hero-section";
import PropertyCard from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import type { Property } from "@shared/schema";

export default function Landing() {
  const { data: featuredProperties, isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties/featured"],
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <HeroSection />
      
      {/* Featured Properties Section */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="text-featured-title">
              Featured Properties
            </h2>
            <p className="text-xl text-muted-foreground" data-testid="text-featured-subtitle">
              Discover our hand-picked selection of premium homes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card rounded-lg shadow-lg overflow-hidden border border-border">
                  <Skeleton className="h-64 w-full" />
                  <div className="p-6 space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ))
            ) : featuredProperties && featuredProperties.length > 0 ? (
              featuredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground text-lg" data-testid="text-no-featured">
                  No featured properties available at the moment.
                </p>
              </div>
            )}
          </div>

          <div className="text-center mt-12">
            <Button asChild size="lg" data-testid="button-view-all">
              <Link href="/properties">
                View All Properties
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-xl font-bold">Premier Properties</span>
              </div>
              <p className="text-gray-300 mb-4">
                Your trusted partner in finding the perfect home. We specialize in luxury real estate 
                and exceptional customer service.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-300">
                <li><Link href="/properties" className="hover:text-white transition-colors">Browse Properties</Link></li>
                <li><a href="/api/login" className="hover:text-white transition-colors">Agent Login</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Info</h3>
              <div className="space-y-3 text-gray-300">
                <p>(555) 123-4567</p>
                <p>info@premierproperties.com</p>
                <p>
                  123 Business Ave<br />
                  Suite 100<br />
                  San Francisco, CA 94102
                </p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-600 mt-12 pt-8 text-center text-gray-300">
            <p>&copy; 2024 Premier Properties. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
