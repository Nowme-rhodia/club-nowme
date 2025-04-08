import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import { SEO } from '../components/SEO';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <SEO 
        title="Page non trouvée"
        description="La page que vous recherchez n'existe pas."
      />
      
      <div className="max-w-md w-full text-center">
        <h1 className="text-9xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Page non trouvée
        </h2>
        <p className="text-gray-600 mb-8">
          Désolée, la page que tu recherches n'existe pas ou a été déplacée.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 rounded-full bg-primary text-white hover:bg-primary-dark transition-colors"
          >
            <Home className="w-5 h-5 mr-2" />
            Retour à l'accueil
          </Link>
          <Link
            to="/tous-les-kiffs"
            className="inline-flex items-center px-6 py-3 rounded-full bg-white text-primary border-2 border-primary hover:bg-primary/5 transition-colors"
          >
            <Search className="w-5 h-5 mr-2" />
            Explorer les kiffs
          </Link>
        </div>
      </div>
    </div>
  );
}