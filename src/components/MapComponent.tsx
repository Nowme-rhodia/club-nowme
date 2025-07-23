import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { AlertCircle } from 'lucide-react';
import { useGoogleMapsScript } from '../hooks/useGoogleMapsScript';

interface MapComponentProps {
  center?: { lat: number; lng: number };
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

const defaultCenter = {
  lat: 48.8566,
  lng: 2.3522
};

const mapContainerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '1rem',
};

const options = {
  disableDefaultUI: false,
  zoomControl: true,
  scrollwheel: true,
  streetViewControl: true,
  mapTypeControl: false,
};

export function MapComponent({ center = defaultCenter, onLoad, onError }: MapComponentProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { isLoaded, loadError } = useGoogleMapsScript();

  useEffect(() => {
    if (loadError) {
      const errorMessage = "Erreur lors du chargement de Google Maps. Veuillez réessayer plus tard.";
      setError(errorMessage);
      onError?.(new Error(errorMessage));
    }
  }, [loadError, onError]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    onLoad?.();
  }, [onLoad]);

  // Update center when prop changes
  useEffect(() => {
    if (map && center) {
      map.panTo(center);
      map.setZoom(12);
    }
  }, [map, center]);

  if (error || loadError) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center">
        <div className="flex items-center justify-center gap-2 text-red-600 mb-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-semibold">Erreur</span>
        </div>
        <p className="text-red-700">{error || "Impossible de charger Google Maps"}</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="rounded-lg bg-gray-50 p-6 text-center animate-pulse">
        <div className="h-[500px] flex items-center justify-center">
          <p className="text-gray-500">Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg shadow-lg overflow-hidden">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={12}
        center={center}
        options={options}
        onLoad={onMapLoad}
      >
        {center && (
          <Marker
            position={center}
            options={{
              animation: google.maps.Animation.DROP
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}