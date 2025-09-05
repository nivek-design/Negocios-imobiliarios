import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { School, Hospital, MapPin, Star, Car, Clock } from 'lucide-react';
import { searchNearbyPlaces, calculateDistance, type PlaceInfo } from '@/lib/maps';

interface NeighborhoodInfoProps {
  latitude: number;
  longitude: number;
  className?: string;
}

const PLACE_TYPES = [
  { type: 'school', label: 'Escolas', icon: School, color: 'bg-blue-100 text-blue-800' },
  { type: 'hospital', label: 'Hospitais', icon: Hospital, color: 'bg-red-100 text-red-800' },
  { type: 'shopping_mall', label: 'Shopping Centers', icon: MapPin, color: 'bg-purple-100 text-purple-800' },
  { type: 'subway_station', label: 'Estações de Metrô', icon: Car, color: 'bg-green-100 text-green-800' },
];

export default function NeighborhoodInfo({ latitude, longitude, className = '' }: NeighborhoodInfoProps) {
  const [places, setPlaces] = useState<{ [key: string]: PlaceInfo[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadNearbyPlaces = async () => {
      try {
        setLoading(true);
        setError(null);

        const allPlaces: { [key: string]: PlaceInfo[] } = {};
        
        for (const placeType of PLACE_TYPES) {
          const nearbyPlaces = await searchNearbyPlaces(
            latitude,
            longitude,
            [placeType.type],
            2000 // 2km radius
          );
          allPlaces[placeType.type] = nearbyPlaces;
        }

        setPlaces(allPlaces);
      } catch (err) {
        console.error('Error loading nearby places:', err);
        setError('Erro ao carregar informações do bairro');
      } finally {
        setLoading(false);
      }
    };

    if (latitude && longitude) {
      loadNearbyPlaces();
    }
  }, [latitude, longitude]);

  const formatDistance = (distance: number) => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Informações do Bairro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {PLACE_TYPES.map((type) => (
              <div key={type.type} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-3 bg-gray-100 rounded"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Informações do Bairro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Informações do Bairro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {PLACE_TYPES.map((placeType) => {
          const Icon = placeType.icon;
          const typePlaces = places[placeType.type] || [];

          return (
            <div key={placeType.type} className="space-y-3">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <h3 className="font-medium">{placeType.label}</h3>
                <Badge variant="secondary" className={placeType.color}>
                  {typePlaces.length}
                </Badge>
              </div>

              {typePlaces.length > 0 ? (
                <div className="space-y-2">
                  {typePlaces.slice(0, 3).map((place, index) => (
                    <div 
                      key={place.placeId || index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{place.name}</p>
                        <p className="text-xs text-gray-600 truncate">{place.address}</p>
                        {place.rating && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span className="text-xs text-gray-600">{place.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end ml-2">
                        <span className="text-sm font-medium text-primary">
                          {formatDistance(place.distance)}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          ~{Math.round(place.distance / 50)}min
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {typePlaces.length > 3 && (
                    <p className="text-xs text-gray-500 text-center">
                      +{typePlaces.length - 3} outros locais próximos
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Nenhum {placeType.label.toLowerCase()} encontrado nas proximidades
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}