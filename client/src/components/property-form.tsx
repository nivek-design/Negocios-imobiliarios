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

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
                onChange={(e) => handleInputChange('title', e.target.value)}
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
                onChange={(e) => handleInputChange('price', e.target.value)}
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
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
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
                onValueChange={(value) => handleInputChange('propertyType', value)}
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
                onValueChange={(value) => handleInputChange('status', value)}
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
                onChange={(e) => handleInputChange('bedrooms', parseInt(e.target.value))}
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
                onChange={(e) => handleInputChange('bathrooms', parseInt(e.target.value))}
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
                onChange={(e) => handleInputChange('squareFeet', parseInt(e.target.value))}
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
                onChange={(e) => handleInputChange('address', e.target.value)}
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
                onChange={(e) => handleInputChange('city', e.target.value)}
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
                onChange={(e) => handleInputChange('state', e.target.value)}
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
                onChange={(e) => handleInputChange('zipCode', e.target.value)}
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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="featured"
              checked={formData.featured}
              onCheckedChange={(checked) => handleInputChange('featured', checked)}
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
