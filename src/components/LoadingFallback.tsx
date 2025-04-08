import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

export const LoadingFallback = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <LoadingSpinner size="lg" className="mb-4" />
      <p className="text-gray-600">Chargement...</p>
    </div>
  </div>
);