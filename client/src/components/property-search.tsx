import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/contexts/I18nContext";

interface PropertySearchProps {
  onFilterChange: (filters: any) => void;
  initialFilters?: any;
}

export default function PropertySearch({ onFilterChange, initialFilters = {} }: PropertySearchProps) {
  const { t } = useI18n();
  const [filters, setFilters] = useState({
    propertyType: [],
    minPrice: "",
    maxPrice: "",
    bedrooms: "",
    bathrooms: "",
    status: "",
    ...initialFilters,
  });

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const handlePropertyTypeChange = (type: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      propertyType: checked 
        ? [...prev.propertyType, type]
        : prev.propertyType.filter((t: string) => t !== type)
    }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      propertyType: [],
      minPrice: "",
      maxPrice: "",
      bedrooms: "any",
      bathrooms: "any",
      status: "all",
    });
  };

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle data-testid="text-search-filters">{t('search.filters')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block">{t('search.propertyType')}</Label>
          <div className="space-y-2">
            {['house', 'condo', 'townhouse', 'apartment'].map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={type}
                  checked={filters.propertyType.includes(type)}
                  onCheckedChange={(checked) => 
                    handlePropertyTypeChange(type, checked as boolean)
                  }
                  data-testid={`checkbox-${type}`}
                />
                <Label htmlFor={type} className="text-sm text-foreground capitalize">
                  {type}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block">{t('search.status')}</Label>
          <Select value={filters.status} onValueChange={(value) => handleInputChange('status', value)}>
            <SelectTrigger data-testid="select-status">
              <SelectValue placeholder={t('search.anyStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('search.anyStatus')}</SelectItem>
              <SelectItem value="for_sale">{t('status.forSale')}</SelectItem>
              <SelectItem value="for_rent">{t('status.forRent')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block">{t('search.priceRange')}</Label>
          <div className="flex space-x-2">
            <Input
              type="number"
              placeholder={t('search.min')}
              value={filters.minPrice}
              onChange={(e) => handleInputChange('minPrice', e.target.value)}
              data-testid="input-min-price"
            />
            <Input
              type="number"
              placeholder={t('search.max')}
              value={filters.maxPrice}
              onChange={(e) => handleInputChange('maxPrice', e.target.value)}
              data-testid="input-max-price"
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block">{t('search.bedrooms')}</Label>
          <Select value={filters.bedrooms} onValueChange={(value) => handleInputChange('bedrooms', value)}>
            <SelectTrigger data-testid="select-bedrooms">
              <SelectValue placeholder={t('search.any')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">{t('search.any')}</SelectItem>
              <SelectItem value="1">1+</SelectItem>
              <SelectItem value="2">2+</SelectItem>
              <SelectItem value="3">3+</SelectItem>
              <SelectItem value="4">4+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block">{t('search.bathrooms')}</Label>
          <Select value={filters.bathrooms} onValueChange={(value) => handleInputChange('bathrooms', value)}>
            <SelectTrigger data-testid="select-bathrooms">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">{t('search.any')}</SelectItem>
              <SelectItem value="1">1+</SelectItem>
              <SelectItem value="2">2+</SelectItem>
              <SelectItem value="3">3+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex space-x-2">
          <Button 
            onClick={clearFilters} 
            variant="outline" 
            className="flex-1"
            data-testid="button-clear-filters"
          >
            {t('search.clear')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
