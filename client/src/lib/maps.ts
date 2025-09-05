import { Loader } from '@googlemaps/js-api-loader';

let googleMapsLoader: Loader | null = null;
let isLoaded = false;

export const initializeGoogleMaps = async (): Promise<typeof google.maps> => {
  if (isLoaded && window.google?.maps) {
    return window.google.maps;
  }

  if (!googleMapsLoader) {
    // Get API key from server
    const response = await fetch('/api/config/maps');
    const config = await response.json();
    const apiKey = config.apiKey || '';
    
    googleMapsLoader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places', 'geometry'],
      region: 'BR',
      language: 'pt-BR',
    });
  }

  await googleMapsLoader.load();
  isLoaded = true;
  return window.google.maps;
};

export interface PlaceInfo {
  name: string;
  type: string;
  distance: number;
  rating?: number;
  address: string;
  placeId: string;
}

export const searchNearbyPlaces = async (
  lat: number,
  lng: number,
  types: string[],
  radius = 2000
): Promise<PlaceInfo[]> => {
  const maps = await initializeGoogleMaps();
  
  return new Promise((resolve, reject) => {
    const service = new maps.places.PlacesService(document.createElement('div'));
    const location = new maps.LatLng(lat, lng);

    const requests = types.map(type => 
      new Promise<PlaceInfo[]>((resolveType) => {
        service.nearbySearch(
          {
            location,
            radius,
            type: type as any,
          },
          (results, status) => {
            if (status === maps.places.PlacesServiceStatus.OK && results) {
              const places = results.slice(0, 5).map(place => ({
                name: place.name || '',
                type: type,
                distance: maps.geometry.spherical.computeDistanceBetween(
                  location,
                  place.geometry?.location || location
                ),
                rating: place.rating,
                address: place.vicinity || '',
                placeId: place.place_id || '',
              }));
              resolveType(places);
            } else {
              resolveType([]);
            }
          }
        );
      })
    );

    Promise.all(requests)
      .then(results => resolve(results.flat()))
      .catch(reject);
  });
};

export const calculateDistance = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<{ distance: string; duration: string }> => {
  const maps = await initializeGoogleMaps();
  
  return new Promise((resolve, reject) => {
    const service = new maps.DistanceMatrixService();
    
    service.getDistanceMatrix(
      {
        origins: [new maps.LatLng(origin.lat, origin.lng)],
        destinations: [new maps.LatLng(destination.lat, destination.lng)],
        travelMode: maps.TravelMode.DRIVING,
        unitSystem: maps.UnitSystem.METRIC,
        avoidHighways: false,
        avoidTolls: false,
      },
      (response, status) => {
        if (status === maps.DistanceMatrixStatus.OK && response) {
          const element = response.rows[0]?.elements[0];
          if (element?.status === 'OK') {
            resolve({
              distance: element.distance?.text || '',
              duration: element.duration?.text || '',
            });
          } else {
            reject(new Error('Route not found'));
          }
        } else {
          reject(new Error('Distance calculation failed'));
        }
      }
    );
  });
};

export const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  const maps = await initializeGoogleMaps();
  
  return new Promise((resolve) => {
    const geocoder = new maps.Geocoder();
    
    geocoder.geocode({ address }, (results, status) => {
      if (status === maps.GeocoderStatus.OK && results?.[0]) {
        const location = results[0].geometry.location;
        resolve({
          lat: location.lat(),
          lng: location.lng(),
        });
      } else {
        resolve(null);
      }
    });
  });
};