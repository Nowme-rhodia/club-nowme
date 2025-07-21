import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PricingTier } from '../data/pricing';

interface PricingCardProps {
  tier: PricingTier;
  isCurrentPlan?: boolean;
  showTransition?: boolean;
}

export function PricingCard({ tier, isCurrentPlan, showTransition }: PricingCardProps) {
  const totalValue = tier.id === 'premium' ? 125 : 45;
  const savings = totalValue - tier.price;

  return (
    <div className={`
      relative bg-white rounded-2xl shadow-lg p-8 transition-all duration-300
      ${tier.highlighted ? 'border-2 border-primary scale-105' : 'border border-gray-200'}
      ${isCurrentPlan ? 'ring-2 ring-primary ring-opacity-50' : ''}
      hover:shadow-xl hover:-translate-y-1
    `}>
      {tier.highlighted && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="px-4 py-1 bg-gradient-to-r from-primary to-secondary text-white rounded-full text-sm font-bold">
            ✨ RECOMMANDÉ ✨
          </span>
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute -top-3 -right-3">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
        <p className="text-gray-600 text-sm">{tier.description}</p>
      </div>

      <div className="text-center mb-6">
        <div className="flex items-baseline justify-center">
          <span className="text-4xl font-bold text-gray-900">{tier.price}€</span>
          <span className="text-gray-500 ml-2">/{tier.period}</span>
        </div>
        
        {tier.id === 'premium' && (
          <div className="mt-2 p-3 bg-primary/5 rounded-lg">
            <p className="text-sm text-primary font-semibold">
              💰 Valeur réelle : {totalValue}€
            </p>
            <p className="text-xs text-gray-600">
              Tu économises {savings.toFixed(2)}€ chaque mois !
            </p>
          </div>
        )}
      </div>

      <ul className="space-y-3 mb-8">
        {tier.features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700 text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="space-y-3">
        {isCurrentPlan ? (
          <div className="w-full px-6 py-3 rounded-full bg-gray-100 text-gray-600 font-semibold text-center">
            Plan actuel
          </div>
        ) : showTransition ? (
          <Link
            to={`/upgrade?to=${tier.id}`}
            className="block w-full px-6 py-3 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-semibold text-center hover:shadow-lg transition-all"
          >
            <Sparkles className="w-5 h-5 inline mr-2" />
            Passer au premium
          </Link>
        ) : (
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
            {tier.id === 'discovery' ? 'Je teste maintenant' : 'Je veux tout ça'}
          </Link>
        )}
        
        <p className="text-center text-xs text-gray-500">
          Sans engagement • Résiliation en 1 clic
        </p>
      </div>
    </div>
  );
}