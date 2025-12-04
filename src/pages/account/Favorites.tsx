import React from 'react';
import { SEO } from '../../components/SEO';
import { Heart } from 'lucide-react';

export default function Favorites() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F4] via-white to-[#FDF8F4] py-12">
      <SEO 
        title="Mes kiffs"
        description="Vos activités favorites"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-soft p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Mes kiffs</h1>

          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Vous n'avez pas encore de kiffs favoris</p>
            <p className="text-gray-400 mt-2">Explorez nos offres et ajoutez vos préférées ici</p>
            <a 
              href="/tous-les-kiffs"
              className="inline-block mt-6 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Découvrir les kiffs
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
