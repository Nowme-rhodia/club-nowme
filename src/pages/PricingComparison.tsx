import React from 'react';
import { Check, X, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { PRICING_TIERS, SERVICE_OFFERINGS, calculateTotalValue } from '../data/pricing';

export default function PricingComparison() {
  const discoveryValue = calculateTotalValue('discovery');
  const premiumValue = calculateTotalValue('premium');

  const comparisonFeatures = [
    {
      category: 'Réductions partenaires',
      discovery: 'Jusqu\'à -50%',
      premium: 'Jusqu\'à -70%'
    },
    {
      category: 'Événements par mois',
      discovery: '1 événement découverte',
      premium: '2-3 événements premium'
    },
    {
      category: 'Communauté',
      discovery: 'Groupe WhatsApp principal',
      premium: 'Groupes spécialisés + parrainage'
    },
    {
      category: 'Box surprise',
      discovery: false,
      premium: 'Trimestrielle (valeur 30€)'
    },
    {
      category: 'Masterclass',
      discovery: false,
      premium: '1 par mois avec expertes'
    },
    {
      category: 'Consultation bien-être',
      discovery: false,
      premium: '1 gratuite par trimestre'
    },
    {
      category: 'Service conciergerie',
      discovery: false,
      premium: 'Aide réservations illimitée'
    },
    {
      category: 'Accès prioritaire',
      discovery: false,
      premium: 'Nouveautés en avant-première'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F4] via-white to-[#FDF8F4] py-12">
      <SEO 
        title="Comparaison des offres"
        description="Découvrez les différences entre nos offres Découverte et Premium"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choisis ton niveau de kiff !
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Commence par découvrir à 12,99€, puis accède à tout le premium à 39,99€. 
            Résilie quand tu veux, sans engagement.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`
                bg-white rounded-2xl shadow-lg p-8 relative
                ${tier.highlighted ? 'border-2 border-primary' : 'border border-gray-200'}
              `}
            >
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="px-4 py-1 bg-primary text-white rounded-full text-sm font-bold">
                    ACCÈS COMPLET
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h2>
                <div className="flex items-baseline justify-center mb-2">
                  <span className="text-4xl font-bold text-primary">{tier.price}€</span>
                  <span className="text-gray-500 ml-2">/{tier.period}</span>
                </div>
                <p className="text-gray-600">{tier.description}</p>
              </div>

              {tier.id === 'premium' && (
                <div className="bg-primary/5 rounded-lg p-4 mb-6">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      💰 Valeur réelle : {premiumValue}€
                    </p>
                    <p className="text-xs text-primary font-bold">
                      Tu économises {(premiumValue - tier.price).toFixed(2)}€ chaque mois !
                    </p>
                  </div>
                </div>
              )}

              <ul className="space-y-3 mb-8">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={`/checkout?plan=${tier.id}`}
                className={`
                  block w-full px-6 py-3 rounded-full font-semibold text-center transition-all
                  ${tier.highlighted
                    ? 'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg'
                    : 'bg-primary text-white hover:bg-primary-dark'
                  }
                `}
              >
                {tier.id === 'discovery' ? 'Je teste à 12,99€' : 'Je veux tout ça !'}
              </Link>
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-16">
          <div className="bg-primary text-white p-6 text-center">
            <h2 className="text-2xl font-bold">Comparaison détaillée</h2>
            <p className="text-primary-light">Tout ce que tu obtiens selon ton niveau</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Fonctionnalités
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    Découverte<br />
                    <span className="text-primary font-bold">12,99€</span>
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    Premium<br />
                    <span className="text-primary font-bold">39,99€</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {comparisonFeatures.map((feature, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {feature.category}
                    </td>
                    <td className="px-6 py-4 text-center text-sm">
                      {feature.discovery === false ? (
                        <X className="w-5 h-5 text-gray-400 mx-auto" />
                      ) : (
                        <span className="text-gray-700">{feature.discovery}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-sm">
                      {feature.premium === false ? (
                        <X className="w-5 h-5 text-gray-400 mx-auto" />
                      ) : (
                        <span className="text-primary font-medium">{feature.premium}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Value Proposition */}
        <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-8 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">
            Pourquoi ce modèle progressif ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div>
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-2">Teste sans risque</h3>
              <p className="text-primary-light">
                12,99€ pour découvrir la communauté et voir si ça te plaît vraiment
              </p>
            </div>
            <div>
              <div className="text-4xl mb-4">💎</div>
              <h3 className="text-xl font-semibold mb-2">Valeur exceptionnelle</h3>
              <p className="text-primary-light">
                39,99€ pour plus de 120€ de services premium chaque mois
              </p>
            </div>
            <div>
              <div className="text-4xl mb-4">🔄</div>
              <h3 className="text-xl font-semibold mb-2">Liberté totale</h3>
              <p className="text-primary-light">
                Résilie en 1 clic, quand tu veux, sans justification
              </p>
            </div>
          </div>
          
          <div className="mt-8">
            <Link
              to="/subscription"
              className="inline-flex items-center px-8 py-4 bg-white text-primary rounded-full font-bold text-lg hover:bg-gray-100 transition-all"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Je commence mon aventure !
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}