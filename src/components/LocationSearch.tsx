import React, { useState, useEffect, useRef } from "react";
import { MapPin, X, Loader2 } from "lucide-react";
import { useGoogleMapsScript } from "../hooks/useGoogleMapsScript";

interface LocationSearchProps {
  onSelect: (location: {
    lat: number;
    lng: number;
    address: string;
    street_address?: string;
    zip_code?: string;
    city?: string;
    department?: string;
  }) => void;
  initialValue?: string;
  error?: string;
}

export function LocationSearch({ onSelect, initialValue, error }: LocationSearchProps) {
  const [value, setValue] = useState(initialValue || "");
  const [suggestions, setSuggestions] = useState<{ placeId: string; description: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { isLoaded, loadError } = useGoogleMapsScript();
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken>();

  // ✅ SessionToken pour meilleure facturation et suggestions
  useEffect(() => {
    if (isLoaded && window.google?.maps?.places) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    }
  }, [isLoaded]);

  // ✅ Récupération des suggestions
  useEffect(() => {
    if (!value) {
      setSuggestions([]);
      return;
    }
    if (!isLoaded || !window.google?.maps?.places) return;

    // Nouvelle API (si dispo)
    if ((window.google.maps.places as any).AutocompleteSuggestion) {
      console.info("✅ Utilisation de AutocompleteSuggestion");
      const service = new (window.google.maps.places as any).AutocompleteSuggestion();

      if (typeof service.getSuggestions === "function") {
        service.getSuggestions(
          {
            input: value,
            sessionToken: sessionTokenRef.current,
            componentRestrictions: { country: "fr" },
            language: "fr",
          },
          (res: any[], status: string) => {
            console.log("📥 Résultat AutocompleteSuggestion:", { status, res });
            if (status === "OK" && res) {
              setSuggestions(
                res.map((r) => ({
                  placeId: r.placeId || r.id,
                  description: r.description,
                }))
              );
            } else {
              setSuggestions([]);
            }
          }
        );
        return;
      }
    }

    // Fallback → ancienne API
    console.info("ℹ️ Fallback sur AutocompleteService");
    const service = new window.google.maps.places.AutocompleteService();
    service.getPlacePredictions(
      {
        input: value,
        sessionToken: sessionTokenRef.current,
        componentRestrictions: { country: "fr" },
        language: "fr",
      },
      (res, status) => {
        console.log("📥 Résultat AutocompleteService:", { status, res });
        if (status === "OK" && res) {
          setSuggestions(
            res.map((r) => ({
              placeId: r.place_id!,
              description: r.description,
            }))
          );
        } else {
          setSuggestions([]);
        }
      }
    );
  }, [value, isLoaded]);

  // ✅ Sélection d'une suggestion
  const handleSelect = (placeId: string, description: string) => {
    if (!window.google?.maps) return;

    setIsLoading(true);
    setValue(description);
    setSuggestions([]);

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ placeId }, (results, status) => {
      setIsLoading(false);
      if (status === "OK" && results?.[0]) {
        const result = results[0];
        const { lat, lng } = result.geometry.location;

        let streetNumber = "";
        let route = "";
        let zipCode = "";
        let city = "";
        let department = "";

        result.address_components.forEach((component) => {
          const types = component.types;
          if (types.includes("street_number")) streetNumber = component.long_name;
          if (types.includes("route")) route = component.long_name;
          if (types.includes("postal_code")) zipCode = component.long_name;
          if (types.includes("locality")) city = component.long_name;
          if (types.includes("administrative_area_level_2")) department = component.long_name;
        });

        onSelect({
          lat: lat(),
          lng: lng(),
          address: result.formatted_address,
          street_address: `${streetNumber} ${route}`.trim(),
          zip_code: zipCode,
          city: city,
          department: department,
        });
      }
    });
  };

  // ✅ Reset
  const handleClear = () => {
    setValue("");
    setSuggestions([]);
    onSelect({ lat: 0, lng: 0, address: "" });
  };

  // ✅ États de chargement
  if (loadError) return <p className="text-red-500">Erreur de chargement Google Maps</p>;
  if (!isLoaded) return <p className="text-gray-500">Chargement de Google Maps...</p>;

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Entrez votre adresse..."
        className={`w-full px-6 py-4 pl-12 pr-12 rounded-lg border-2 ${error ? "border-red-300" : "border-gray-200"
          } focus:border-primary focus:ring focus:ring-primary/20 outline-none bg-white text-gray-800`}
      />
      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

      {isLoading ? (
        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-spin" />
      ) : (
        value && (
          <button
            onClick={handleClear}
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )
      )}

      {suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {suggestions.map((s) => (
            <li
              key={s.placeId}
              role="button"
              tabIndex={0}
              onClick={() => handleSelect(s.placeId, s.description)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleSelect(s.placeId, s.description);
                }
              }}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
            >
              {s.description}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
