// src/hooks/useGoogleMapsScript.ts
import { useLoadScript, Libraries } from "@react-google-maps/api";

// On garde seulement la lib "places" (suffisant pour AutocompleteService)
export const libraries: Libraries = ["places"];

export function useGoogleMapsScript() {
  return useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries,
    language: "fr",
    region: "FR",
    preventGoogleFontsLoading: true,
  });
}
