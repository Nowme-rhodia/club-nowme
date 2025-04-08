import React, { useState } from 'react';
import { categories } from '../data/categories';
import { CategoryCard } from '../components/CategoryCard';
import { WaveDecoration } from '../components/WaveDecoration';
import { Search, MapPin } from 'lucide-react';
import { LocationSearch } from '../components/LocationSearch';
import { MapComponent } from '../components/MapComponent';
import { SEO } from '../components/SEO';

export default function Categories() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const filteredCategories = categories.filter(category => {
    const searchLower = searchTerm.toLowerCase();
    return (
      category.name.toLowerCase().includes(searchLower) ||
      category.description?.toLowerCase().includes(searchLower) ||
      category.subcategories.some(sub => 
        sub.name.toLowerCase().includes(searchLower)
      )
    );
  });

  const handleLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    setSelectedLocation(location);
    setMapError(null);
  };

  const handleMapError = (error: Error) => {
    setMapError(error.message);
    console.error('Google Maps error:', error);
  };

  return (
    <div className="relative">
      <SEO 
        title="Catégories"
        description="Découvrez toutes nos catégories d'activités et trouvez votre prochain kiff !"
      />

      <div className="absolute inset-x-0 top-0 h-72 pointer-events-none">
        <WaveDecoration />
      </div>

      <div className="relative pt-16 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 animate-fade-in tracking-tight text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]">
              Trouve ton <span className="text-primary-light">kiff</span>
            </h1>
            <div className="relative z-10 inline-block px-8 py-3 rounded-full bg-white/90 backdrop-blur-sm shadow-lg">
              <p className="text-primary font-semibold animate-fade-in max-w-2xl mx-auto text-base sm:text-lg">
                Découvre notre sélection de services et d'activités pour enrichir ton quotidien
              </p>
            </div>
          </div>

          {/* Barres de recherche et carte */}
          <div className="max-w-5xl mx-auto mb-12 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher une activité..."
                    className="w-full px-6 py-4 pr-12 rounded-full border-2 border-gray-100 focus:border-primary focus:ring focus:ring-primary/20 focus:ring-opacity-50 outline-none transition-all duration-200 bg-white/90 backdrop-blur-sm shadow-md text-gray-800 placeholder-gray-400"
                  />
                  <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
                </div>

                <LocationSearch onLocationSelect={handleLocationSelect} />

                {selectedLocation && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>Recherche autour de : {selectedLocation.address}</span>
                    <button
                      onClick={() => setSelectedLocation(null)}
                      className="text-primary hover:text-primary-dark underline ml-2"
                    >
                      Réinitialiser
                    </button>
                  </div>
                )}
              </div>

              <div className="relative">
                <MapComponent
                  center={selectedLocation || undefined}
                  onError={handleMapError}
                />
                {mapError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-50/90 rounded-lg">
                    <p className="text-red-600 text-center px-4">{mapError}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10 auto-rows-fr">
            {filteredCategories.map((category, index) => (
              <div
                key={category.slug}
                className="animate-slide-up"
                style={{
                  animationDelay: `${index * 100}ms`
                }}
              >
                <CategoryCard 
                  category={category} 
                  highlightTerm={searchTerm}
                />
              </div>
            ))}
          </div>

          {filteredCategories.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                Aucune activité ne correspond à votre recherche.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}