import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/I18nContext";
import { ImageUploader } from "@/components/ImageUploader";
import { X } from "lucide-react";
import type { Property, InsertProperty } from "@shared/schema";

interface PropertyFormProps {
  property?: Property;
  onSubmit: (data: InsertProperty) => void;
  isLoading: boolean;
}

export default function PropertyForm({ property, onSubmit, isLoading }: PropertyFormProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [formData, setFormData] = useState<InsertProperty>({
    title: property?.title || "",
    description: property?.description || "",
    price: property?.price || "0",
    propertyType: property?.propertyType || "house",
    status: property?.status || "for_sale",
    bedrooms: property?.bedrooms || 1,
    bathrooms: property?.bathrooms || 1,
    squareFeet: property?.squareFeet || 1000,
    address: property?.address || "",
    city: property?.city || "",
    state: property?.state || "",
    zipCode: property?.zipCode || "",
    latitude: property?.latitude ? property.latitude.toString() : null,
    longitude: property?.longitude ? property.longitude.toString() : null,
    images: property?.images || [],
    featured: !!property?.featured,
    agentId: property?.agentId || "",
  });

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, title: e.target.value }));
  }, []);

  const handlePriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, price: e.target.value }));
  }, []);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, description: e.target.value }));
  }, []);

  const handleAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, address: e.target.value }));
  }, []);

  const handleCityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, city: e.target.value }));
  }, []);

  const handleStateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, state: e.target.value }));
  }, []);

  const handleZipCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, zipCode: e.target.value }));
  }, []);

  const handlePropertyTypeChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, propertyType: value as any }));
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, status: value as any }));
  }, []);

  const handleBedroomsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, bedrooms: parseInt(e.target.value) }));
  }, []);

  const handleBathroomsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, bathrooms: parseInt(e.target.value) }));
  }, []);

  const handleSquareFeetChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, squareFeet: parseInt(e.target.value) }));
  }, []);

  const handleGarageSpacesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, garageSpaces: parseInt(e.target.value) || 0 }));
  }, []);

  const handleYearBuiltChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, yearBuilt: parseInt(e.target.value) || null }));
  }, []);

  const handleLotAreaChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, lotArea: value ? value : null }));
  }, []);

  const handleFeatureChange = useCallback((field: string) => (checked: boolean) => {
    setFormData(prev => ({ ...prev, [field]: checked }));
  }, []);

  const handleImagesUploaded = useCallback((imagePaths: string[]) => {
    setFormData(prev => ({
      ...prev,
      images: [...(prev.images || []), ...imagePaths]
    }));
  }, []);

  const removeImage = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index) || []
    }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.title || !formData.address || !formData.city || !formData.state) {
      toast({
        title: t('inquiry.validationError'),
        description: t('inquiry.requiredFields'),
        variant: "destructive",
      });
      return;
    }

    onSubmit(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle data-testid="text-property-form-title">
          {property ? t('form.editProperty') : t('form.addProperty')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">{t('form.title')}</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={handleTitleChange}
                placeholder="Casa Familiar Moderna"
                required
                data-testid="input-title"
              />
            </div>
            
            <div>
              <Label htmlFor="price">{t('form.price')}</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={handlePriceChange}
                placeholder="750000"
                required
                data-testid="input-price"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">{t('form.description')}</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={handleDescriptionChange}
              placeholder="Linda casa familiar moderna..."
              rows={4}
              data-testid="textarea-description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="propertyType">{t('form.propertyType')}</Label>
              <Select 
                value={formData.propertyType} 
                onValueChange={handlePropertyTypeChange}
              >
                <SelectTrigger data-testid="select-property-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="house">Casa</SelectItem>
                  <SelectItem value="condo">Apartamento</SelectItem>
                  <SelectItem value="townhouse">Sobrado</SelectItem>
                  <SelectItem value="apartment">Apartamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">{t('form.status')}</Label>
              <Select 
                value={formData.status} 
                onValueChange={handleStatusChange}
              >
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="for_sale">À Venda</SelectItem>
                  <SelectItem value="for_rent">Para Alugar</SelectItem>
                  <SelectItem value="sold">Vendido</SelectItem>
                  <SelectItem value="rented">Alugado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="bedrooms">{t('form.bedrooms')}</Label>
              <Input
                id="bedrooms"
                type="number"
                min="1"
                value={formData.bedrooms}
                onChange={handleBedroomsChange}
                data-testid="input-bedrooms"
              />
            </div>

            <div>
              <Label htmlFor="bathrooms">{t('form.bathrooms')}</Label>
              <Input
                id="bathrooms"
                type="number"
                min="1"
                value={formData.bathrooms}
                onChange={handleBathroomsChange}
                data-testid="input-bathrooms"
              />
            </div>

            <div>
              <Label htmlFor="squareFeet">{t('form.squareFeet')}</Label>
              <Input
                id="squareFeet"
                type="number"
                min="1"
                value={formData.squareFeet}
                onChange={handleSquareFeetChange}
                data-testid="input-square-feet"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="address">{t('form.address')}</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={handleAddressChange}
                placeholder="Rua das Palmeiras, 123"
                required
                data-testid="input-address"
              />
            </div>

            <div>
              <Label htmlFor="city">{t('form.city')}</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={handleCityChange}
                placeholder="São Paulo"
                required
                data-testid="input-city"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="state">{t('form.state')}</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={handleStateChange}
                placeholder="SP"
                required
                data-testid="input-state"
              />
            </div>

            <div>
              <Label htmlFor="zipCode">{t('form.zipCode')}</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={handleZipCodeChange}
                placeholder="01310-100"
                data-testid="input-zip-code"
              />
            </div>
          </div>

          {/* Image Upload Section */}
          <div className="space-y-4">
            <Label>{t('form.propertyImages')}</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
              <div className="text-center space-y-4">
                <ImageUploader
                  maxNumberOfFiles={10}
                  onComplete={handleImagesUploaded}
                  disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground">
                  {t('form.imageUploadNote')}
                </p>
              </div>
              
              {/* Display uploaded images */}
              {formData.images && formData.images.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-3">
                    {formData.images.length} {t('form.imagesUploaded')}
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image.startsWith('/objects/') ? image : `/objects/${image}`}
                          alt={`Property ${index + 1}`}
                          className="w-full h-20 object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`button-remove-image-${index}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Property Details */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Detalhes Adicionais</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="garageSpaces">Vagas de Garagem</Label>
                <Input
                  id="garageSpaces"
                  type="number"
                  min="0"
                  value={formData.garageSpaces || 0}
                  onChange={handleGarageSpacesChange}
                  data-testid="input-garage-spaces"
                />
              </div>
              <div>
                <Label htmlFor="yearBuilt">Ano de Construção</Label>
                <Input
                  id="yearBuilt"
                  type="number"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={formData.yearBuilt?.toString() || ''}
                  onChange={handleYearBuiltChange}
                  placeholder="2020"
                  data-testid="input-year-built"
                />
              </div>
              <div>
                <Label htmlFor="lotArea">Área do Terreno (m²)</Label>
                <Input
                  id="lotArea"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.lotArea || ''}
                  onChange={handleLotAreaChange}
                  placeholder="300.00"
                  data-testid="input-lot-area"
                />
              </div>
            </div>
          </div>

          {/* Property Features */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Características Adicionais</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasGarage"
                  checked={formData.hasGarage || false}
                  onCheckedChange={handleFeatureChange('hasGarage')}
                  data-testid="checkbox-garage"
                />
                <Label htmlFor="hasGarage">Garagem</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasPool"
                  checked={formData.hasPool || false}
                  onCheckedChange={handleFeatureChange('hasPool')}
                  data-testid="checkbox-pool"
                />
                <Label htmlFor="hasPool">Piscina</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasBalcony"
                  checked={formData.hasBalcony || false}
                  onCheckedChange={handleFeatureChange('hasBalcony')}
                  data-testid="checkbox-balcony"
                />
                <Label htmlFor="hasBalcony">Varanda</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasGarden"
                  checked={formData.hasGarden || false}
                  onCheckedChange={handleFeatureChange('hasGarden')}
                  data-testid="checkbox-garden"
                />
                <Label htmlFor="hasGarden">Jardim</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasAirConditioning"
                  checked={formData.hasAirConditioning || false}
                  onCheckedChange={handleFeatureChange('hasAirConditioning')}
                  data-testid="checkbox-air-conditioning"
                />
                <Label htmlFor="hasAirConditioning">Ar-condicionado</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasFireplace"
                  checked={formData.hasFireplace || false}
                  onCheckedChange={handleFeatureChange('hasFireplace')}
                  data-testid="checkbox-fireplace"
                />
                <Label htmlFor="hasFireplace">Lareira</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasPetsAllowed"
                  checked={formData.hasPetsAllowed || false}
                  onCheckedChange={handleFeatureChange('hasPetsAllowed')}
                  data-testid="checkbox-pets-allowed"
                />
                <Label htmlFor="hasPetsAllowed">Aceita animais</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="furnished"
                  checked={formData.furnished || false}
                  onCheckedChange={handleFeatureChange('furnished')}
                  data-testid="checkbox-furnished"
                />
                <Label htmlFor="furnished">Mobiliado</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasElevator"
                  checked={formData.hasElevator || false}
                  onCheckedChange={handleFeatureChange('hasElevator')}
                  data-testid="checkbox-elevator"
                />
                <Label htmlFor="hasElevator">Elevador</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasSecurity"
                  checked={formData.hasSecurity || false}
                  onCheckedChange={handleFeatureChange('hasSecurity')}
                  data-testid="checkbox-security"
                />
                <Label htmlFor="hasSecurity">Segurança 24h</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasGym"
                  checked={formData.hasGym || false}
                  onCheckedChange={handleFeatureChange('hasGym')}
                  data-testid="checkbox-gym"
                />
                <Label htmlFor="hasGym">Academia</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasPlayground"
                  checked={formData.hasPlayground || false}
                  onCheckedChange={handleFeatureChange('hasPlayground')}
                  data-testid="checkbox-playground"
                />
                <Label htmlFor="hasPlayground">Playground</Label>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="featured"
              checked={formData.featured || false}
              onCheckedChange={handleFeatureChange('featured')}
              data-testid="checkbox-featured"
            />
            <Label htmlFor="featured">{t('form.featured')}</Label>
          </div>

          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full"
            data-testid="button-submit-property"
          >
            {isLoading ? t('form.saving') : (property ? t('form.update') : t('form.create'))}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
