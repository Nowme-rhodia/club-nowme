import React from 'react';
import { SEO } from '../../components/SEO';
import { useAuth } from '../../lib/auth';
import { Bell, Lock, Globe, Eye } from 'lucide-react';

export default function Settings() {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F4] via-white to-[#FDF8F4] py-12">
      <SEO 
        title="Paramètres"
        description="Gérez vos préférences"
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-soft p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Paramètres</h1>

          <div className="space-y-6">
            {/* Notifications */}
            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Bell className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
              </div>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-gray-700">Recevoir les emails promotionnels</span>
                  <input type="checkbox" className="w-5 h-5 text-primary rounded" defaultChecked />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-gray-700">Notifications de réservation</span>
                  <input type="checkbox" className="w-5 h-5 text-primary rounded" defaultChecked />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-gray-700">Nouveaux kiffs disponibles</span>
                  <input type="checkbox" className="w-5 h-5 text-primary rounded" defaultChecked />
                </label>
              </div>
            </div>

            {/* Confidentialité */}
            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Eye className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-gray-900">Confidentialité</h2>
              </div>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-gray-700">Profil public</span>
                  <input type="checkbox" className="w-5 h-5 text-primary rounded" />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-gray-700">Partager mes activités</span>
                  <input type="checkbox" className="w-5 h-5 text-primary rounded" />
                </label>
              </div>
            </div>

            {/* Langue */}
            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Globe className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-gray-900">Langue</h2>
              </div>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>

            {/* Sécurité */}
            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-gray-900">Sécurité</h2>
              </div>
              <button className="w-full px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                Changer mon mot de passe
              </button>
            </div>

            {/* Sauvegarder */}
            <div className="pt-6 border-t border-gray-200">
              <button className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
