// Simple geocoding service for adding coordinates to properties
export interface GeocodingResult {
  latitude: number;
  longitude: number;
}

export class GeocodingService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
  }

  async geocodeAddress(address: string, city: string, state: string, zipCode: string): Promise<GeocodingResult | null> {
    if (!this.apiKey) {
      console.warn('Google Maps API key not configured for geocoding');
      return null;
    }

    try {
      const fullAddress = `${address}, ${city}, ${state}, ${zipCode}, Brazil`;
      const encodedAddress = encodeURIComponent(fullAddress);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return {
          latitude: location.lat,
          longitude: location.lng,
        };
      } else {
        console.warn(`Geocoding failed for address: ${fullAddress}. Status: ${data.status}`);
        return null;
      }
    } catch (error) {
      console.error('Error during geocoding:', error);
      return null;
    }
  }

  // Batch geocode multiple addresses - useful for updating existing properties
  async geocodeMultipleAddresses(addresses: Array<{
    id: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  }>): Promise<Array<{
    id: string;
    coordinates: GeocodingResult | null;
  }>> {
    const results = [];
    
    for (const addr of addresses) {
      const coordinates = await this.geocodeAddress(addr.address, addr.city, addr.state, addr.zipCode);
      results.push({
        id: addr.id,
        coordinates,
      });
      
      // Add small delay to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }
}

export const geocodingService = new GeocodingService();