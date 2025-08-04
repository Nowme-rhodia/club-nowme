
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CreditCard, Shield, CheckCircle } from 'lucide-react';
import { SEO } from '../components/SEO';
import toast from 'react-hot-toast';
import { useAuth } from '../lib/auth';
import { PRICING_TIERS } from '../data/pricing';

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('discovery');

  useEffect(() => {
    const plan = searchParams.get('plan');
    if (plan && ['monthly', 'yearly'].includes(plan)) {
      setSelectedPlan(plan);
    }
  }, [searchParams]);

  const currentTier = PRICING_TIERS.find(tier => tier.id === selectedPlan);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // Utiliser la fonction createCheckoutSession
      const { createCheckoutSession } = await import('../lib/stripe');
      await createCheckoutSession(selectedPlan as 'monthly' | 'yearly', profile?.email);
    } catch (error) {
      console.error('Erreur checkout:', error);
      toast.error('Erreur lors de la redirection vers le paiement');
    } finally {
      setLoading(false);
    }
  };

  if (!currentTier) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Plan non trouvé</h1>
          <button
            onClick={() => navigate('/subscription')}
            className="px-6 py-3 bg-primary text-white rounded-full hover:bg-primary-dark"
          >
            Retour aux abonnements
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F4] via-white to-[#FDF8F4] py-12">
      <SEO 
        title="Finaliser votre abonnement"
        description="Finalisez votre abonnement Nowme et commencez à kiffer !"
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Finaliser votre abonnement
          </h1>
          <p className="text-gray-600">
            Plus qu'une étape pour rejoindre la communauté Nowme !
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Plan sélectionné</h2>
            <button
              onClick={() => navigate('/subscription')}
              className="text-primary hover:text-primary-dark text-sm"
            >
              Modifier
            </button>
          </div>

          <div className="border-2 border-primary/20 rounded-xl p-6 bg-primary/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-900">{currentTier.name}</h3>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">{currentTier.price}€</div>
                <div className="text-sm text-gray-500">/{currentTier.period}</div>
              </div>
            </div>

            <p className="text-gray-600 mb-4">{currentTier.description}</p>

            {selectedPlan === 'discovery' && (
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-blue-900 mb-2">🎯 Offre découverte</h4>
                <p className="text-blue-700 text-sm">
                  Premier mois à 12,99€ pour tout découvrir. Puis 39,99€/mois pour continuer à kiffer.
                </p>
              </div>
            )}

            {selectedPlan === 'yearly' && (
              <div className="bg-green-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-green-900 mb-2">⭐ Plan annuel avantageux</h4>
                <p className="text-green-700 text-sm">
                  399€ pour l'année + 100€ de réduction séjours. Économie de 80€ !
                </p>
              </div>
            )}

            <div className="space-y-2">
              {currentTier.features.slice(0, 4).map((feature, index) => (
                <div key={index} className="flex items-center text-sm">
                  <CheckCircle className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
              {currentTier.features.length > 4 && (
                <div className="text-sm text-gray-500">
                  + {currentTier.features.length - 4} autres avantages
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">Vos garanties</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center">
              <Shield className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-sm text-gray-700">Paiement sécurisé</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-sm text-gray-700">Sans engagement</span>
            </div>
            <div className="flex items-center">
              <CreditCard className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-sm text-gray-700">Résiliation en 1 clic</span>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={handleCheckout}
            disabled={loading}
            className={\`
              w-full px-8 py-4 rounded-full font-bold text-lg transition-all
              \${loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg transform hover:scale-105'
              }
            \`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Redirection vers le paiement...
              </div>
            ) : (
              <>
                <CreditCard className="w-5 h-5 inline mr-2" />
                Finaliser mon abonnement ({currentTier.price}€)
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 mt-4">
            Vous serez redirigé vers Stripe pour finaliser le paiement de manière sécurisée
          </p>
        </div>

        <div className="mt-12 bg-gray-50 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Questions fréquentes</h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium text-gray-900">Puis-je annuler à tout moment ?</span>
              <p className="text-gray-600">Oui, résiliation en 1 clic depuis votre compte, sans justification.</p>
            </div>
            <div>
              <span className="font-medium text-gray-900">Quand serai-je prélevé ?</span>
              <p className="text-gray-600">
                {selectedPlan === 'discovery' 
                  ? 'Aujourd\'hui 12,99€, puis 39,99€ le mois prochain.'
                  : selectedPlan === 'yearly'
                    ? 'Paiement unique de 399€ pour toute l\'année.'
                    : 'Paiement selon votre plan choisi.'
                }
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-900">Mes données sont-elles sécurisées ?</span>
              <p className="text-gray-600">Paiement 100% sécurisé via Stripe. Nous ne stockons aucune donnée bancaire.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
