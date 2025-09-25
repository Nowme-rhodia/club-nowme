import React, { useState, useEffect } from 'react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { MapPin, X, Loader2 } from 'lucide-react';
import { useGoogleMapsScript } from '../hooks/useGoogleMapsScript';

interface LocationSearchProps {
  onSelect: (location: { lat: number; lng: number; address: string }) => void;
  initialValue?: string;
  error?: string;
}

export function LocationSearch({ onSelect, initialValue, error }: LocationSearchProps) {
  const [selectedAddress, setSelectedAddress] = useState(initialValue || '');
  const [isLoading, setIsLoading] = useState(false);
  const { isLoaded, loadError } = useGoogleMapsScript();

  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: 'fr' },
      types: ['address'],
    },
    debounce: 300,
    initOnMount: isLoaded,
  });

  useEffect(() => {
    if (initialValue) {
      setValue(initialValue, false);
      setSelectedAddress(initialValue);
    }
  }, [initialValue, setValue]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (e.target.value === '') {
      setSelectedAddress('');
      onSelect({ lat: 0, lng: 0, address: '' });
    }
  };

  const handleSelect = async (placeId: string, description: string) => {
    try {
      setIsLoading(true);
      setValue(description, false);
      setSelectedAddress(description);
      clearSuggestions();

      const results = await getGeocode({ placeId });
      const { lat, lng } = await getLatLng(results[0]);
      const formattedAddress = results[0].formatted_address;

      onSelect({ lat, lng, address: formattedAddress });
    } catch (error) {
      console.error("Error selecting location:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setValue('');
    setSelectedAddress('');
    clearSuggestions();
    onSelect({ lat: 0, lng: 0, address: '' });
  };

  if (loadError) {
    return (
      <div className="relative">
        <input
          disabled
          value=""
          placeholder="Erreur de chargement de Google Maps"
          className="w-full px-6 py-4 pl-12 rounded-lg border-2 border-red-300 bg-red-50 text-red-700 cursor-not-allowed"
        />
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400" />
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="relative">
        <input
          disabled
          value=""
          placeholder="Chargement..."
          className="w-full px-6 py-4 pl-12 rounded-lg border-2 border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
        />
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          value={value}
          onChange={handleInput}
          disabled={!ready}
          placeholder="Entrez votre adresse..."
          className={`w-full px-6 py-4 pl-12 pr-12 rounded-lg border-2 ${
            error ? 'border-red-300' : 'border-gray-100'
          } focus:border-primary focus:ring focus:ring-primary/20 focus:ring-opacity-50 outline-none transition-all duration-200 bg-white/90 backdrop-blur-sm shadow-md text-gray-800 placeholder-gray-400`}
        />
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

        {/* Spinner avec fade-in/out */}
        <div
          className={`absolute right-4 top-1/2 -translate-y-1/2 transition-opacity duration-300 ${
            isLoading ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>

        {/* Bouton clear avec fade-in/out */}
        <button
          onClick={handleClear}
          type="button"
          className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-all duration-200 ${
            value && !isLoading ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Suggestions avec animation */}
      <ul
        className={`absolute z-50 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-100 max-h-60 overflow-auto transform transition-all duration-300 ${
          status === "OK" && !isLoading ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        {data.map(({ place_id, description }) => (
          <li
            key={place_id}
            role="button"
            tabIndex={0}
            onClick={() => handleSelect(place_id, description)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleSelect(place_id, description);
              }
            }}
            className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors duration-200 text-gray-700 text-sm"
          >
            {description}
          </li>
        ))}
      </ul>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
