// hooks/useGoogleMapsScript.ts
import { useLoadScript, Libraries } from '@react-google-maps/api';

// 👉 supprime "localContext" (non supporté dans les types)
export const libraries: Libraries = ["places", "drawing", "geometry", "visualization"];

export function useGoogleMapsScript() {
  return useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries,
    language: 'fr',
    region: 'FR',
    preventGoogleFontsLoading: true,
  });
}
