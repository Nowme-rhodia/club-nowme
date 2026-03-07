import React from 'react';
import { SEO } from '../../components/SEO';
import { useAuth } from '../../lib/auth';
import { CreditCard, Calendar, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

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
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${profile?.subscription_status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : (profile?.subscription_status === 'payment_failed' || profile?.subscription_status === 'past_due')
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                  }`}>
                  {profile?.subscription_status === 'active' ? (
                    <><CheckCircle className="w-4 h-4 mr-1" /> Actif</>
                  ) : (profile?.subscription_status === 'payment_failed' || profile?.subscription_status === 'past_due') ? (
                    <><Clock className="w-4 h-4 mr-1" /> Paiement refusé</>
                  ) : 'Inactif'}
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
                  <span className={`font-semibold ${profile?.subscription_status === 'active' ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {profile?.subscription_status === 'active' ? 'Actif' :
                      (profile?.subscription_status === 'payment_failed' || profile?.subscription_status === 'past_due') ? 'Paiement en attente' : 'Inactif'}
                  </span>
                </div>
              </div>

              {/* Action button for failed payments */}
              {(profile?.subscription_status === 'payment_failed' || profile?.subscription_status === 'past_due') && (
                <div className="mt-6 pt-6 border-t border-primary/10">
                  <p className="text-sm text-red-600 mb-4 font-medium italic">
                    ⚠️ Ton dernier prélèvement n'a pas pu aboutir. Pour éviter la suspension de tes avantages, merci de régulariser ta situation.
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) return;

                        const toastId = toast.loading('Redirection vers le portail...');
                        const { data, error } = await supabase.functions.invoke('create-portal-session', {
                          body: { returnUrl: window.location.href }
                        });

                        if (error) throw error;
                        if (data?.url) window.location.href = data.url;
                      } catch (err) {
                        console.error('Portal error:', err);
                        toast.error("Impossible d'accéder au portail de paiement.");
                      }
                    }}
                    className="w-full px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                  >
                    Régulariser mon prélèvement
                  </button>
                </div>
              )}
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
              <button
                onClick={async () => {
                  try {
                    const { data, error } = await supabase.functions.invoke('create-portal-session', {
                      body: { returnUrl: window.location.origin + '/mon-compte/parametres' }
                    });
                    if (error) throw error;
                    if (data?.url) window.location.href = data.url;
                  } catch (err) {
                    toast.error("Erreur d'accès au portail.");
                  }
                }}
                className="w-full px-6 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
              >
                Gérer ou annuler mon abonnement
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
