import React from 'react';
import { SEO } from '../../components/SEO';
import { useAuth } from '../../lib/auth';
import { CreditCard, Calendar, CheckCircle } from 'lucide-react';

export default function Subscription() {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F4] via-white to-[#FDF8F4] py-12">
      <SEO 
        title="Mon abonnement"
        description="Gérez votre abonnement Nowme"
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-soft p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Mon abonnement</h1>

          <div className="space-y-6">
            <div className="p-6 bg-primary/5 rounded-xl border-2 border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-semibold text-gray-900">Premium</h2>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Actif
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Prix</span>
                  <span className="font-semibold text-gray-900">39,99€ / mois</span>
                </div>
                
                {profile?.subscription?.current_period_end && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Prochaine facturation</span>
                    <span className="font-semibold text-gray-900">
                      {new Date(profile.subscription.current_period_end).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600">Statut</span>
                  <span className="font-semibold text-green-600">
                    {profile?.subscription_status === 'active' ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-3">Avantages inclus</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Accès illimité à tous les kiffs</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Réservations prioritaires</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Accès au Club Nowme</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Événements exclusifs</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <button className="w-full px-6 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200">
                Annuler mon abonnement
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
