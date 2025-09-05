import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Search } from "lucide-react";
import { useLocation } from "wouter";
import { useI18n } from "@/contexts/I18nContext";

export default function HeroSection() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const [searchData, setSearchData] = useState({
    location: "",
    propertyType: "",
    priceRange: "",
  });

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchData.location) params.set("city", searchData.location);
    if (searchData.propertyType) params.set("propertyType", searchData.propertyType);
    if (searchData.priceRange) {
      const [min, max] = searchData.priceRange.split("-");
      if (min) params.set("minPrice", min);
      if (max) params.set("maxPrice", max);
    }
    setLocation(`/properties?${params.toString()}`);
  };

  return (
    <section 
      className="relative h-96 md:h-[500px] bg-cover bg-center"
      style={{
        backgroundImage: "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080')"
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center text-white max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-4" data-testid="text-hero-title">
            {t('hero.title')}
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-200" data-testid="text-hero-subtitle">
            {t('hero.subtitle')}
          </p>
          
          {/* Search Bar */}
          <div className="bg-white rounded-lg p-4 md:p-6 shadow-xl max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder={t('hero.locationPlaceholder')}
                  className="pl-10"
                  value={searchData.location}
                  onChange={(e) => setSearchData({ ...searchData, location: e.target.value })}
                  data-testid="input-location"
                />
              </div>
              <Select 
                value={searchData.propertyType} 
                onValueChange={(value) => setSearchData({ ...searchData, propertyType: value })}
              >
                <SelectTrigger data-testid="select-property-type">
                  <SelectValue placeholder={t('hero.propertyType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="house">{t('propertyType.house')}</SelectItem>
                  <SelectItem value="condo">{t('propertyType.condo')}</SelectItem>
                  <SelectItem value="townhouse">{t('propertyType.townhouse')}</SelectItem>
                  <SelectItem value="apartment">{t('propertyType.apartment')}</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={searchData.priceRange} 
                onValueChange={(value) => setSearchData({ ...searchData, priceRange: value })}
              >
                <SelectTrigger data-testid="select-price-range">
                  <SelectValue placeholder={t('hero.priceRange')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-500000">{t('price.0-500000')}</SelectItem>
                  <SelectItem value="500000-1000000">{t('price.500000-1000000')}</SelectItem>
                  <SelectItem value="1000000-2000000">{t('price.1000000-2000000')}</SelectItem>
                  <SelectItem value="2000000-">{t('price.2000000+')}</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleSearch}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="button-search"
              >
                <Search className="w-4 h-4 mr-2" />
                {t('hero.search')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
