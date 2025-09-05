import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';
import { initializeGoogleMaps } from '@/lib/maps';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string, location?: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
  onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void;
}

export default function LocationAutocomplete({
  value,
  onChange,
  placeholder = "Digite uma cidade, bairro ou endereço...",
  className = "",
  onLocationSelect,
}: LocationAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const initAutocomplete = async () => {
      try {
        const maps = await initializeGoogleMaps();
        
        if (inputRef.current) {
          const autocompleteService = new maps.places.AutocompleteService();
          const placesService = new maps.places.PlacesService(document.createElement('div'));
          
          setAutocomplete({
            getPlacePredictions: (request: any, callback: any) => {
              autocompleteService.getPlacePredictions(request, callback);
            },
            getDetails: (request: any, callback: any) => {
              placesService.getDetails(request, callback);
            }
          } as any);
        }
      } catch (error) {
        console.error('Failed to initialize autocomplete:', error);
      }
    };

    initAutocomplete();
  }, []);

  const handleInputChange = async (inputValue: string) => {
    onChange(inputValue);
    
    if (!autocomplete || !inputValue.trim() || inputValue.length < 3) {
      setPredictions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    
    try {
      autocomplete.getPlacePredictions(
        {
          input: inputValue,
          componentRestrictions: { country: 'br' },
          types: ['(regions)'],
        },
        (predictions: google.maps.places.AutocompletePrediction[], status: google.maps.places.PlacesServiceStatus) => {
          setIsLoading(false);
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            setPredictions(predictions.slice(0, 5));
            setShowSuggestions(true);
          } else {
            setPredictions([]);
            setShowSuggestions(false);
          }
        }
      );
    } catch (error) {
      setIsLoading(false);
      console.error('Error getting predictions:', error);
    }
  };

  const handleSuggestionClick = async (prediction: google.maps.places.AutocompletePrediction) => {
    if (!autocomplete) return;

    setShowSuggestions(false);
    setIsLoading(true);
    onChange(prediction.description);

    try {
      autocomplete.getDetails(
        { placeId: prediction.place_id },
        (place: google.maps.places.PlaceResult, status: google.maps.places.PlacesServiceStatus) => {
          setIsLoading(false);
          if (status === google.maps.places.PlacesServiceStatus.OK && place.geometry?.location) {
            const location = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              address: place.formatted_address || prediction.description,
            };
            
            onChange(prediction.description, { lat: location.lat, lng: location.lng });
            onLocationSelect?.(location);
          }
        }
      );
    } catch (error) {
      setIsLoading(false);
      console.error('Error getting place details:', error);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => value.length >= 3 && predictions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className="pl-10"
          data-testid="input-location-autocomplete"
        />
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          </div>
        )}
      </div>

      {showSuggestions && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              className="w-full px-3 py-2 text-left hover:bg-muted focus:bg-muted focus:outline-none border-b border-border last:border-b-0"
              onClick={() => handleSuggestionClick(prediction)}
              data-testid={`suggestion-${prediction.place_id}`}
            >
              <div className="flex items-center">
                <MapPin className="w-4 h-4 text-muted-foreground mr-2 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm">{prediction.structured_formatting.main_text}</div>
                  <div className="text-xs text-muted-foreground">{prediction.structured_formatting.secondary_text}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}