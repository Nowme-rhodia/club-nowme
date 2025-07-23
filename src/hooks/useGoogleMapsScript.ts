// hooks/useGoogleMapsScript.ts
import { useLoadScript } from '@react-google-maps/api';

// Définir les bibliothèques en dehors pour éviter les re-rendus inutiles
export const libraries: ("places" | "drawing" | "geometry" | "localContext" | "visualization")[] = ["places"];

export function useGoogleMapsScript() {
  return useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries,
    language: 'fr',
    region: 'FR',
    preventGoogleFontsLoading: true
  });
}