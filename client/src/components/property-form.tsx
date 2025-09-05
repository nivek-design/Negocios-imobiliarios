import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import type { Property, InsertProperty } from "@shared/schema";

interface PropertyFormProps {
  property?: Property;
  onSubmit: (data: InsertProperty) => void;
  isLoading: boolean;
}

export default function PropertyForm({ property, onSubmit, isLoading }: PropertyFormProps) {
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
    latitude: property?.latitude || null,
    longitude: property?.longitude || null,
    images: property?.images || [],
    featured: property?.featured || false,
    agentId: property?.agentId || "",
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.title || !formData.address || !formData.city || !formData.state) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
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
          {property ? 'Edit Property' : 'Add New Property'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Modern Family Home"
                required
                data-testid="input-title"
              />
            </div>
            
            <div>
              <Label htmlFor="price">Price *</Label>
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Beautiful modern family home..."
              rows={4}
              data-testid="textarea-description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="propertyType">Property Type</Label>
              <Select 
                value={formData.propertyType} 
                onValueChange={(value) => handleInputChange('propertyType', value)}
              >
                <SelectTrigger data-testid="select-property-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="condo">Condo</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="for_sale">For Sale</SelectItem>
                  <SelectItem value="for_rent">For Rent</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="rented">Rented</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="bedrooms">Bedrooms</Label>
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
              <Label htmlFor="bathrooms">Bathrooms</Label>
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
              <Label htmlFor="squareFeet">Square Feet</Label>
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
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="123 Oak Street"
                required
                data-testid="input-address"
              />
            </div>

            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="San Francisco"
                required
                data-testid="input-city"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                placeholder="CA"
                required
                data-testid="input-state"
              />
            </div>

            <div>
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={(e) => handleInputChange('zipCode', e.target.value)}
                placeholder="94102"
                data-testid="input-zip-code"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="featured"
              checked={formData.featured}
              onCheckedChange={(checked) => handleInputChange('featured', checked)}
              data-testid="checkbox-featured"
            />
            <Label htmlFor="featured">Featured Property</Label>
          </div>

          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full"
            data-testid="button-submit-property"
          >
            {isLoading ? 'Saving...' : (property ? 'Update Property' : 'Create Property')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
