import React from 'react';
import { SEO } from '../../components/SEO';
import { History as HistoryIcon } from 'lucide-react';

export default function History() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F4] via-white to-[#FDF8F4] py-12">
      <SEO 
        title="Historique"
        description="Vos réservations passées"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-soft p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Historique</h1>

          <div className="text-center py-12">
            <HistoryIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Aucune réservation pour le moment</p>
            <p className="text-gray-400 mt-2">Vos réservations passées apparaîtront ici</p>
            <a 
              href="/tous-les-kiffs"
              className="inline-block mt-6 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Réserver une activité
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
