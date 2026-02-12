import React from 'react';
import { useGoogleMapsScript } from '../hooks/useGoogleMapsScript';
import { LoadingFallback } from './LoadingFallback';

export function GoogleMapsLoader({ children }: { children: React.ReactNode }) {
    const { isLoaded, loadError } = useGoogleMapsScript();

    if (loadError) {
        console.error("Google Maps script loading failed:", loadError);
        // On error, we still render children to avoid a white page.
        // Child components must check for window.google before using Maps features.
        return <>{children}</>;
    }

    if (!isLoaded) return <LoadingFallback />;

    return <>{children}</>;
}
