import { useEffect, useRef, useState } from 'react';
import { initializeGoogleMaps } from '@/lib/maps';
import type { Property } from '@shared/schema';

interface MapProps {
  properties?: Property[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  onPropertyClick?: (property: Property) => void;
  className?: string;
  showPropertyDetails?: boolean;
}

export default function Map({
  properties = [],
  center = { lat: -23.5505, lng: -46.6333 }, // São Paulo default
  zoom = 12,
  height = '400px',
  onPropertyClick,
  className = '',
  showPropertyDetails = false,
}: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      try {
        setIsLoading(true);
        const maps = await initializeGoogleMaps();
        
        if (mapRef.current) {
          const mapInstance = new maps.Map(mapRef.current, {
            center,
            zoom,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }],
              },
            ],
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });
          
          setMap(mapInstance);
        }
      } catch (err) {
        console.error('Error initializing map:', err);
        setError('Erro ao carregar o mapa');
      } finally {
        setIsLoading(false);
      }
    };

    initMap();
  }, [center.lat, center.lng, zoom]);

  // Update markers when properties change
  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);

    if (properties.length === 0) return;

    const newMarkers: google.maps.Marker[] = [];
    const bounds = new google.maps.LatLngBounds();

    properties.forEach((property) => {
      if (property.latitude && property.longitude) {
        const lat = parseFloat(property.latitude);
        const lng = parseFloat(property.longitude);
        
        const marker = new google.maps.Marker({
          position: { lat, lng },
          map,
          title: property.title,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 0C6.716 0 0 6.716 0 15c0 8.284 15 25 15 25s15-16.716 15-25C30 6.716 23.284 0 15 0z" fill="#2563eb"/>
                <circle cx="15" cy="15" r="8" fill="white"/>
                <text x="15" y="20" text-anchor="middle" fill="#2563eb" font-size="12" font-weight="bold">R$</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(30, 40),
            anchor: new google.maps.Point(15, 40),
          },
        });

        // Add click listener
        marker.addListener('click', () => {
          if (onPropertyClick) {
            onPropertyClick(property);
          }
        });

        // Add info window
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="max-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${property.title}</h3>
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${property.address}</p>
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${property.bedrooms} quartos • ${property.bathrooms} banheiros</p>
              <p style="margin: 0; font-size: 14px; font-weight: bold; color: #2563eb;">R$ ${parseFloat(property.price).toLocaleString('pt-BR')}</p>
            </div>
          `,
        });

        marker.addListener('mouseover', () => {
          infoWindow.open(map, marker);
        });

        marker.addListener('mouseout', () => {
          infoWindow.close();
        });

        newMarkers.push(marker);
        bounds.extend({ lat, lng });
      }
    });

    setMarkers(newMarkers);

    // Fit map to show all markers
    if (newMarkers.length > 1) {
      map.fitBounds(bounds);
    } else if (newMarkers.length === 1) {
      map.setCenter(newMarkers[0].getPosition()!);
      map.setZoom(15);
    }
  }, [map, properties, onPropertyClick]);

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ height }}
      >
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`} style={{ height }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}