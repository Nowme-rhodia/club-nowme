import React, { useState } from 'react';
import usePlacesAutocomplete, {
    getGeocode,
    getLatLng,
} from 'use-places-autocomplete';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { MapPin, Save, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

interface LocationPickerProps {
    userId: string;
    onLocationSaved: () => void;
    currentHasLocation: boolean;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
    userId,
    onLocationSaved,
    currentHasLocation
}) => {
    const { refreshProfile } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Initial state: if no location, we are editing. If location, we are viewing.
    // We use a ref to track if we've already set the initial state to avoid re-triggering
    const initialized = React.useRef(false);
    React.useEffect(() => {
        if (!initialized.current) {
            if (!currentHasLocation) setIsEditing(true);
            initialized.current = true;
        }
    }, [currentHasLocation]);

    const {
        ready,
        value,
        suggestions: { status, data },
        setValue,
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: {
            types: ['(cities)'], // Restrict to cities for privacy/broad location
            componentRestrictions: { country: 'fr' } // Default to France, adjust if international
        },
        debounce: 300,
    });

    const handleSelect = async (address: string) => {
        setValue(address, false);
        clearSuggestions();

        try {
            setSaving(true);
            const results = await getGeocode({ address });
            const { lat, lng } = await getLatLng(results[0]);

            // Save to Supabase
            const { error } = await (supabase
                .from('user_profiles') as any)
                .update({
                    latitude: lat,
                    longitude: lng,
                    // We could also save a formatted address if needed, e.g. city_text
                })
                .eq('user_id', userId);

            if (error) throw error;

            toast.success("Position mise à jour ! 📍");
            await refreshProfile(); // Sync new location to auth context immediately
            setValue("", false); // Clear input to show action is done
            clearSuggestions();
            setIsEditing(false); // Switch back to view mode
            onLocationSaved();
        } catch (error) {
            console.error('Error saving location:', error);
            toast.error("Erreur lors de l'enregistrement de la position.");
        } finally {
            setSaving(false);
        }
    };

    // VIEW MODE
    if (currentHasLocation && !isEditing) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <MapPin className="w-24 h-24 text-emerald-500" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">Ma Position</h3>
                        <p className="text-xs text-emerald-600 font-medium">✅ Localisation active</p>
                    </div>
                </div>

                <p className="text-gray-500 text-sm mb-4 mt-4">
                    Vous apparaissez sur la carte ! Les autres membres peuvent voir que vous êtes dans le quartier (position floutée).
                </p>

                <button
                    onClick={() => setIsEditing(true)}
                    className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-medium text-sm transition-colors border border-gray-200"
                >
                    Modifier ma ville
                </button>
            </div>
        );
    }

    // EDIT MODE
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-gray-900">
                        {currentHasLocation ? "Modifier ma ville" : "Rejoins la Carte !"}
                    </h3>
                </div>
                {currentHasLocation && (
                    <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">
                        <span className="sr-only">Annuler</span>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                )}
            </div>

            <p className="text-gray-500 text-sm mb-4">
                Renseigne ta ville pour apparaître sur la carte des membres.
                <span className="block mt-1 text-xs text-purple-600 font-medium bg-purple-50 p-2 rounded-lg">
                    🔒 Rassure-toi, ta position exacte reste secrète. Seule une zone approximative (floutée de quelques km) sera visible par les autres membres.
                </span>
            </p>

            <div className="relative">
                <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    disabled={!ready || saving}
                    placeholder="Entrer ma ville (ex: Lyon, Bordeaux...)"
                    className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />

                {status === "OK" && (
                    <ul className="absolute z-50 w-full bg-white border border-gray-100 rounded-xl mt-1 shadow-xl max-h-60 overflow-auto">
                        {data.map(({ place_id, description }) => (
                            <li
                                key={place_id}
                                onClick={() => handleSelect(description)}
                                className="p-3 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0"
                            >
                                {description}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {saving && (
                <div className="flex items-center justify-center gap-2 mt-2 text-sm text-gray-400">
                    <Loader className="w-4 h-4 animate-spin" /> Enregistrement...
                </div>
            )}
        </div>
    );
};
