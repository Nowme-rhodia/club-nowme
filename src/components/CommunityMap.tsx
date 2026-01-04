import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMap, Marker, InfoWindow, OverlayView } from '@react-google-maps/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Loader } from 'lucide-react';

import toast from 'react-hot-toast';

const mapContainerStyle = {
    width: '100%',
    height: '500px',
    borderRadius: '1rem',
};

// Default center (Paris)
const defaultCenter = {
    lat: 48.8566,
    lng: 2.3522,
};

const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    styles: [
        {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
        },
    ],
};

interface SafeLocation {
    user_id: string;
    first_name: string;
    photo_url: string;
    safe_latitude: number;
    safe_longitude: number;
}
// Script loaded in parent (CommunitySpace)
export const CommunityMap = () => {
    const { user, profile } = useAuth(); // Moved to top
    const [locations, setLocations] = useState<SafeLocation[]>([]);
    const [selectedUser, setSelectedUser] = useState<SafeLocation | null>(null);
    const [loadingLocations, setLoadingLocations] = useState(true);
    const [center, setCenter] = useState(defaultCenter);

    useEffect(() => {
        if (user?.id) fetchLocations();
    }, [user?.id]);

    // Force updates when profile changes
    useEffect(() => {
        if (profile?.latitude && profile?.longitude) {
            setCenter({ lat: profile.latitude, lng: profile.longitude });
        }
    }, [profile?.latitude, profile?.longitude]);

    const handleRecenter = () => {
        if (profile?.latitude && profile?.longitude) {
            setCenter({ lat: profile.latitude, lng: profile.longitude });
        } else {
            toast.error("Aucune position définie");
        }
    };

    const fetchLocations = async () => {
        try {
            const { data, error } = await supabase.rpc('get_safe_community_locations');
            if (error) throw error;

            // Store raw data, filter in render to be reactive
            const safeData = (data as unknown as SafeLocation[]) || [];
            console.log("📍 Raw map locations fetched:", safeData.length);
            setLocations(safeData);
        } catch (err) {
            console.error("Error fetching map locations:", err);
        } finally {
            setLoadingLocations(false);
        }
    };

    // Filter reactively so if user loads late, we still filter correctly
    const filteredLocations = useMemo(() => {
        return locations.filter((loc) => loc.user_id !== user?.id);
    }, [locations, user?.id]);

    const markers = useMemo(() => filteredLocations.map((loc) => (
        <Marker
            key={loc.user_id}
            position={{ lat: loc.safe_latitude, lng: loc.safe_longitude }}
            // Explicitly undefined icon to force default red pin
            icon={undefined}
            onClick={() => setSelectedUser(loc)}
        />
    )), [filteredLocations]);

    if (loadingLocations) return <div className="h-[500px] flex items-center justify-center bg-gray-100 rounded-2xl"><Loader className="animate-spin text-gray-400" /></div>;

    // Use a composite key to force re-render if location changes drastically
    // limiting re-renders to only when lat/lng actually change
    const mapKey = `map-${profile?.latitude}-${profile?.longitude}`;

    return (
        <div className="relative w-full h-[500px] bg-gray-100 rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Manual Recenter Button */}
            <button
                onClick={handleRecenter}
                className="absolute top-4 right-4 z-10 bg-white p-2 rounded-lg shadow-md hover:bg-gray-50 text-gray-700 transition-colors"
                title="Recentrer sur ma position"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /><path d="M12 2v20" /></svg>
            </button>

            <GoogleMap
                key={mapKey}
                mapContainerStyle={mapContainerStyle}
                zoom={12}
                center={center}
                options={mapOptions}
            >
                {/* Current User Marker - Reverted to OverlayView since it worked */}
                {user && profile?.latitude && profile?.longitude && (
                    <OverlayView
                        position={{ lat: profile.latitude, lng: profile.longitude }}
                        mapPaneName='overlayMouseTarget'
                    >
                        <div
                            className="relative group cursor-pointer transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform duration-200"
                            onClick={() => setSelectedUser({
                                user_id: user.id,
                                first_name: "C'est vous !",
                                photo_url: profile?.photo_url || "",
                                safe_latitude: profile.latitude!,
                                safe_longitude: profile.longitude!
                            } as SafeLocation)}
                        >
                            <div className="w-12 h-12 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
                                {profile.photo_url ? (
                                    <img
                                        src={profile.photo_url}
                                        alt="Vous"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-purple-600 flex items-center justify-center text-white font-bold">
                                        {profile.first_name?.[0] || 'U'}
                                    </div>
                                )}
                                <div className="hidden w-full h-full bg-purple-600 items-center justify-center text-white top-0 left-0 absolute">
                                    {profile.first_name?.[0] || 'U'}
                                </div>
                            </div>
                            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full shadow border-2 border-white whitespace-nowrap">
                                Vous
                            </div>
                        </div>
                    </OverlayView>
                )}

                {markers}

                {/* InfoWindow for selected user */}
                {selectedUser && (
                    <InfoWindow
                        position={{ lat: selectedUser.safe_latitude, lng: selectedUser.safe_longitude }}
                        onCloseClick={() => setSelectedUser(null)}
                    >
                        <div className="p-2 text-center min-w-[150px]">
                            <div className={`w-12 h-12 mx-auto rounded-full overflow-hidden border-2 mb-2 ${selectedUser.user_id === user?.id ? 'border-primary' : 'border-gray-200'}`}>
                                <img
                                    src={selectedUser.photo_url || `https://ui-avatars.com/api/?name=${selectedUser.first_name}&background=random`}
                                    alt={selectedUser.first_name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <h3 className="font-bold text-gray-900">{selectedUser.first_name}</h3>
                            <p className="text-xs text-gray-500">{selectedUser.user_id === user?.id ? 'Votre position exacte 🔒' : 'Membre du Club ✨'}</p>
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>

            {/* Overlay info */}
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg text-xs text-gray-600">
                📍 {filteredLocations.length} membres actifs
            </div>
        </div>
    );
};
