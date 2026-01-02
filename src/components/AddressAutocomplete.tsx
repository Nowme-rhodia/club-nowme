
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader } from 'lucide-react';

interface Suggestion {
    label: string;
    properties: {
        label: string;
        postcode: string;
        city: string;
        context: string;
    };
}

interface AddressAutocompleteProps {
    onSelect: (address: string, postcode: string, city: string) => void;
    onChange?: (value: string) => void; // New prop for raw text
    defaultValue?: string;
}

export function AddressAutocomplete({ onSelect, onChange, defaultValue = '' }: AddressAutocompleteProps) {
    const [query, setQuery] = useState(defaultValue);
    const [isLocked, setIsLocked] = useState(false);
    const skipFetchRef = useRef(false);

    // Sync query if defaultValue changes (e.g. parent clears it)
    useEffect(() => {
        setQuery(defaultValue);
        // If we have a defaultValue coming in, we assume it's "locked"/valid if it's long enough, 
        // BUT for this specific UX, we want to start unlocked unless explicitly handled.
        // Actually, let's keep it simple: defaulting doesn't lock automatically to allow editing,
        // unless we want to persist the lock state. For now, local state lock on selection is safer.
    }, [defaultValue]);

    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        // [FIX] If we just selected an item, do NOT fetch again.
        if (skipFetchRef.current) {
            skipFetchRef.current = false;
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            if (query.trim().length >= 3 && !isLocked) {
                fetchAddress(query);
            } else {
                setSuggestions([]);
                setIsOpen(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query, isLocked]);

    const fetchAddress = async (value: string) => {
        setLoading(true);
        try {
            const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value.trim())}&limit=5`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            setSuggestions(data.features || []);
            setIsOpen(true);
        } catch (error) {
            console.error('Error fetching address:', error);
            setSuggestions([]); // Clean up
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        if (onChange) onChange(value); // Propagate raw value
    };

    const handleSelect = (suggestion: Suggestion) => {
        const { label, postcode, city } = suggestion.properties;
        skipFetchRef.current = true; // [FIX] Signal useEffect to skip the next fetch
        setQuery(label);
        setIsLocked(true); // <--- LOCK THE INPUT
        setIsOpen(false);
        onSelect(label, postcode, city);
        // Do NOT call onChange here. Parent handles validity via onSelect.
    };

    const handleReset = () => {
        setIsLocked(false);
        setQuery('');
        if (onChange) onChange(''); // Clear parent
        // Auto-focus input after reset could be nice, but simple is better
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            {isLocked ? (
                <div className="w-full flex items-center justify-between px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-green-100 p-1.5 rounded-full shrink-0">
                            <MapPin className="w-4 h-4 text-green-700" />
                        </div>
                        <span className="font-medium text-green-900 truncate">
                            {query}
                        </span>
                    </div>
                    <button
                        onClick={handleReset}
                        className="text-xs font-bold text-green-700 hover:text-green-800 bg-white border border-green-200 px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all shrink-0 ml-2"
                        type="button"
                    >
                        Modifier
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                    <input
                        type="text"
                        value={query}
                        onChange={handleInputChange}
                        placeholder="Entrez l'adresse du rendez-vous..."
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-shadow"
                        autoComplete="off"
                        id={`meeting-address-${Math.random().toString(36).substr(2, 9)}`}
                        name={`meeting-address-${Math.random().toString(36).substr(2, 9)}`}
                        data-lpignore="true"
                        data-1p-ignore="true"
                    />
                    {loading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader className="w-4 h-4 animate-spin text-gray-400" />
                        </div>
                    )}
                </div>
            )}

            {isOpen && suggestions.length > 0 && !isLocked && (
                <div className="absolute z-[9999] w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={index}
                            onClick={() => handleSelect(suggestion)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex flex-col transition-colors border-b border-gray-50 last:border-0"
                            type="button" // Prevent form submission
                        >
                            <span className="font-medium text-gray-900">{suggestion.properties.label}</span>
                            <span className="text-xs text-gray-500">{suggestion.properties.context}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
