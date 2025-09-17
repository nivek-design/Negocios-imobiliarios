import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/contexts/I18nContext";

// Filter interfaces - exported for use in other components
export interface PropertyFilters {
  propertyType: string[];
  keyword: string;
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
  bathrooms: string;
  status: string;
  radius: string;
  minGarageSpaces: string;
  minYearBuilt: string;
  maxYearBuilt: string;
  minLotArea: string;
  hasGarage: boolean;
  hasPool: boolean;
  hasBalcony: boolean;
  hasGarden: boolean;
  hasAirConditioning: boolean;
  hasFireplace: boolean;
  hasPetsAllowed: boolean;
  furnished: boolean;
  hasElevator: boolean;
  hasSecurity: boolean;
  hasGym: boolean;
  hasPlayground: boolean;
}

interface PropertySearchProps {
  onFilterChange: (filters: PropertyFilters) => void;
  initialFilters?: Partial<PropertyFilters>;
}

export default function PropertySearch({
  onFilterChange,
  initialFilters = {},
}: PropertySearchProps): JSX.Element {
  const { t } = useI18n();
  const [filters, setFilters] = useState<PropertyFilters>({
    propertyType: [],
    keyword: "",
    minPrice: "",
    maxPrice: "",
    bedrooms: "any",
    bathrooms: "any",
    status: "all",
    radius: "50",
    minGarageSpaces: "",
    minYearBuilt: "",
    maxYearBuilt: "",
    minLotArea: "",
    hasGarage: false,
    hasPool: false,
    hasBalcony: false,
    hasGarden: false,
    hasAirConditioning: false,
    hasFireplace: false,
    hasPetsAllowed: false,
    furnished: false,
    hasElevator: false,
    hasSecurity: false,
    hasGym: false,
    hasPlayground: false,
    ...initialFilters,
  });

  useEffect(() => {
    // Debounce the filter changes to avoid too many API calls
    const timeoutId = setTimeout(() => {
      onFilterChange(filters);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters, onFilterChange]);

  const handlePropertyTypeChange = useCallback(
    (type: string, checked: boolean): void => {
      setFilters((prev: PropertyFilters) => ({
        ...prev,
        propertyType: checked
          ? [...prev.propertyType, type]
          : prev.propertyType.filter((t: string) => t !== type),
      }));
    },
    [],
  );

  const handleInputChange = useCallback(
    (field: keyof PropertyFilters, value: string | boolean): void => {
      setFilters((prev: PropertyFilters) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const clearFilters = (): void => {
    setFilters({
      propertyType: [],
      keyword: "",
      minPrice: "",
      maxPrice: "",
      bedrooms: "any",
      bathrooms: "any",
      status: "all",
      radius: "50",
      minGarageSpaces: "",
      minYearBuilt: "",
      maxYearBuilt: "",
      minLotArea: "",
      hasGarage: false,
      hasPool: false,
      hasBalcony: false,
      hasGarden: false,
      hasAirConditioning: false,
      hasFireplace: false,
      hasPetsAllowed: false,
      furnished: false,
      hasElevator: false,
      hasSecurity: false,
      hasGym: false,
      hasPlayground: false,
    });
  };

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle data-testid="text-search-filters">
          {t("search.filters")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Keyword Search */}
        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block">
            Busca por palavras-chave
          </Label>
          <Input
            type="text"
            placeholder="Buscar no título e descrição..."
            value={filters.keyword}
            onChange={(e) => handleInputChange("keyword", e.target.value)}
            data-testid="input-keyword-search"
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block">
            {t("search.propertyType")}
          </Label>
          <div className="space-y-2">
            {["Casa", "Casa em Condomínio", "Terreno", "Apartamento"].map(
              (type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={type}
                    checked={filters.propertyType.includes(type)}
                    onCheckedChange={(checked) =>
                      handlePropertyTypeChange(type, checked as boolean)
                    }
                    data-testid={`checkbox-${type}`}
                  />
                  <Label
                    htmlFor={type}
                    className="text-sm text-foreground capitalize"
                  >
                    {type}
                  </Label>
                </div>
              ),
            )}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block">
            {t("search.status")}
          </Label>
          <Select
            value={filters.status}
            onValueChange={(value) => handleInputChange("status", value)}
          >
            <SelectTrigger data-testid="select-status">
              <SelectValue placeholder={t("search.anyStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("search.anyStatus")}</SelectItem>
              <SelectItem value="for_sale">{t("status.forSale")}</SelectItem>
              <SelectItem value="for_rent">{t("status.forRent")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block">
            {t("search.priceRange")}
          </Label>
          <div className="flex space-x-2">
            <Input
              type="number"
              placeholder={t("search.min")}
              value={filters.minPrice}
              onChange={(e) => handleInputChange("minPrice", e.target.value)}
              data-testid="input-min-price"
            />
            <Input
              type="number"
              placeholder={t("search.max")}
              value={filters.maxPrice}
              onChange={(e) => handleInputChange("maxPrice", e.target.value)}
              data-testid="input-max-price"
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block">
            {t("search.bedrooms")}
          </Label>
          <Select
            value={filters.bedrooms}
            onValueChange={(value) => handleInputChange("bedrooms", value)}
          >
            <SelectTrigger data-testid="select-bedrooms">
              <SelectValue placeholder={t("search.any")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">{t("search.any")}</SelectItem>
              <SelectItem value="1">1+</SelectItem>
              <SelectItem value="2">2+</SelectItem>
              <SelectItem value="3">3+</SelectItem>
              <SelectItem value="4">4+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block">
            {t("search.bathrooms")}
          </Label>
          <Select
            value={filters.bathrooms}
            onValueChange={(value) => handleInputChange("bathrooms", value)}
          >
            <SelectTrigger data-testid="select-bathrooms">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">{t("search.any")}</SelectItem>
              <SelectItem value="1">1+</SelectItem>
              <SelectItem value="2">2+</SelectItem>
              <SelectItem value="3">3+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Distance Filter */}
        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block">
            Raio de Busca (km)
          </Label>
          <Select
            value={filters.radius}
            onValueChange={(value) => handleInputChange("radius", value)}
          >
            <SelectTrigger data-testid="select-radius">
              <SelectValue placeholder="Selecione o raio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 km</SelectItem>
              <SelectItem value="10">10 km</SelectItem>
              <SelectItem value="25">25 km</SelectItem>
              <SelectItem value="50">50 km</SelectItem>
              <SelectItem value="100">100 km</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Property Features */}
        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block">
            Características
          </Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasGarage"
                checked={filters.hasGarage}
                onCheckedChange={(checked) =>
                  handleInputChange("hasGarage", checked as boolean)
                }
                data-testid="checkbox-garage"
              />
              <Label htmlFor="hasGarage" className="text-sm text-foreground">
                Garagem
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasPool"
                checked={filters.hasPool}
                onCheckedChange={(checked) =>
                  handleInputChange("hasPool", checked as boolean)
                }
                data-testid="checkbox-pool"
              />
              <Label htmlFor="hasPool" className="text-sm text-foreground">
                Piscina
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasBalcony"
                checked={filters.hasBalcony}
                onCheckedChange={(checked) =>
                  handleInputChange("hasBalcony", checked as boolean)
                }
                data-testid="checkbox-balcony"
              />
              <Label htmlFor="hasBalcony" className="text-sm text-foreground">
                Varanda
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasGarden"
                checked={filters.hasGarden}
                onCheckedChange={(checked) =>
                  handleInputChange("hasGarden", checked as boolean)
                }
                data-testid="checkbox-garden"
              />
              <Label htmlFor="hasGarden" className="text-sm text-foreground">
                Jardim
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasAirConditioning"
                checked={filters.hasAirConditioning}
                onCheckedChange={(checked) =>
                  handleInputChange("hasAirConditioning", checked as boolean)
                }
                data-testid="checkbox-air-conditioning"
              />
              <Label
                htmlFor="hasAirConditioning"
                className="text-sm text-foreground"
              >
                Ar-condicionado
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasFireplace"
                checked={filters.hasFireplace}
                onCheckedChange={(checked) =>
                  handleInputChange("hasFireplace", checked as boolean)
                }
                data-testid="checkbox-fireplace"
              />
              <Label htmlFor="hasFireplace" className="text-sm text-foreground">
                Lareira
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasPetsAllowed"
                checked={filters.hasPetsAllowed}
                onCheckedChange={(checked) =>
                  handleInputChange("hasPetsAllowed", checked as boolean)
                }
                data-testid="checkbox-pets-allowed"
              />
              <Label
                htmlFor="hasPetsAllowed"
                className="text-sm text-foreground"
              >
                Aceita animais
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="furnished"
                checked={filters.furnished}
                onCheckedChange={(checked) =>
                  handleInputChange("furnished", checked as boolean)
                }
                data-testid="checkbox-furnished"
              />
              <Label htmlFor="furnished" className="text-sm text-foreground">
                Mobiliado
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasElevator"
                checked={filters.hasElevator}
                onCheckedChange={(checked) =>
                  handleInputChange("hasElevator", checked as boolean)
                }
                data-testid="checkbox-elevator"
              />
              <Label htmlFor="hasElevator" className="text-sm text-foreground">
                Elevador
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasSecurity"
                checked={filters.hasSecurity}
                onCheckedChange={(checked) =>
                  handleInputChange("hasSecurity", checked as boolean)
                }
                data-testid="checkbox-security"
              />
              <Label htmlFor="hasSecurity" className="text-sm text-foreground">
                Segurança 24h
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasGym"
                checked={filters.hasGym}
                onCheckedChange={(checked) =>
                  handleInputChange("hasGym", checked as boolean)
                }
                data-testid="checkbox-gym"
              />
              <Label htmlFor="hasGym" className="text-sm text-foreground">
                Academia
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasPlayground"
                checked={filters.hasPlayground}
                onCheckedChange={(checked) =>
                  handleInputChange("hasPlayground", checked as boolean)
                }
                data-testid="checkbox-playground"
              />
              <Label
                htmlFor="hasPlayground"
                className="text-sm text-foreground"
              >
                Playground
              </Label>
            </div>
          </div>
        </div>

        {/* Additional Filters */}
        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block">
            Filtros Adicionais
          </Label>
          <div className="space-y-2">
            <div>
              <Label
                htmlFor="minGarageSpaces"
                className="text-xs text-muted-foreground"
              >
                Mín. Vagas de Garagem
              </Label>
              <Input
                id="minGarageSpaces"
                type="number"
                min="0"
                value={filters.minGarageSpaces}
                onChange={(e) =>
                  handleInputChange("minGarageSpaces", e.target.value)
                }
                placeholder="0"
                className="text-sm"
                data-testid="input-min-garage-spaces"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label
                  htmlFor="minYearBuilt"
                  className="text-xs text-muted-foreground"
                >
                  Ano Mín.
                </Label>
                <Input
                  id="minYearBuilt"
                  type="number"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={filters.minYearBuilt}
                  onChange={(e) =>
                    handleInputChange("minYearBuilt", e.target.value)
                  }
                  placeholder="1990"
                  className="text-sm"
                  data-testid="input-min-year-built"
                />
              </div>
              <div>
                <Label
                  htmlFor="maxYearBuilt"
                  className="text-xs text-muted-foreground"
                >
                  Ano Máx.
                </Label>
                <Input
                  id="maxYearBuilt"
                  type="number"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={filters.maxYearBuilt}
                  onChange={(e) =>
                    handleInputChange("maxYearBuilt", e.target.value)
                  }
                  placeholder="2024"
                  className="text-sm"
                  data-testid="input-max-year-built"
                />
              </div>
            </div>
            <div>
              <Label
                htmlFor="minLotArea"
                className="text-xs text-muted-foreground"
              >
                Área Mín. Terreno (m²)
              </Label>
              <Input
                id="minLotArea"
                type="number"
                min="0"
                step="0.01"
                value={filters.minLotArea}
                onChange={(e) =>
                  handleInputChange("minLotArea", e.target.value)
                }
                placeholder="100"
                className="text-sm"
                data-testid="input-min-lot-area"
              />
            </div>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={clearFilters}
            variant="outline"
            className="flex-1"
            data-testid="button-clear-filters"
          >
            {t("search.clear")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
