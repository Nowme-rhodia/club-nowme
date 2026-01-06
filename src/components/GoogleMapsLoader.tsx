import React from 'react';
import { useGoogleMapsScript } from '../hooks/useGoogleMapsScript';
import { LoadingFallback } from './LoadingFallback';

export function GoogleMapsLoader({ children }: { children: React.ReactNode }) {
    const { isLoaded } = useGoogleMapsScript();

    if (!isLoaded) return <LoadingFallback />;

    return <>{children}</>;
}
