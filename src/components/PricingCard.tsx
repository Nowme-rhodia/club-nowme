import React from 'react';
import { Check, Sparkles, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PricingTier } from '../data/pricing';
import { YEARLY_SAVINGS } from '../data/pricing';
import { useAuth } from '../lib/auth';

interface PricingCardProps {
  tier: PricingTier;
  isCurrentPlan?: boolean;
}

export function PricingCard({ tier, isCurrentPlan }: PricingCardProps) {
  const { user } = useAuth();
  const totalValue = 185;
  const savings = tier.id === 'yearly' ? YEARLY_SAVINGS.savings : 0;

  // Si l'utilisateur est connecté, aller directement au checkout, sinon inscription
  const ctaLink = user ? `/checkout?plan=${tier.id}` : `/auth/signup?plan=${tier.id}`;

  return (
    <div
      className={`
        relative bg-white rounded-2xl shadow-lg p-8 transition-all duration-300
        ${tier.highlighted ? 'border-2 border-primary scale-105' : 'border border-gray-200'}
        ${isCurrentPlan ? 'ring-2 ring-primary ring-opacity-50' : ''}
        hover:shadow-xl hover:-translate-y-1
      `}
    >
      {tier.highlighted && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="px-4 py-1 bg-gradient-to-r from-primary to-secondary text-white rounded-full text-sm font-bold">
            ⭐ MEILLEUR PLAN ⭐
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

        {tier.id === 'monthly' && (
          <div className="mt-2 text-center">
            <div className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold mb-2">
              Cadeau de bienvenue
            </div>
            <p className="text-xs text-gray-500">
              Puis 39,99€/mois • <span className="font-bold text-gray-700">Sans engagement</span>
            </p>
          </div>
        )}

        {tier.id === 'yearly' && (
          <div className="mt-2 space-y-2">
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700 font-semibold">
                💰 Économie de {savings.toFixed(0)}€ vs mensuel
              </p>
            </div>
            {tier.bonusValue && (
              <div className="p-3 bg-primary/5 rounded-lg">
                <p className="text-sm text-primary font-semibold">
                  🎁 + {tier.bonusValue}€ de bonus chaque mois
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <ul className="space-y-3 mb-8">
        {Array.isArray(tier.features) &&
          tier.features.map((feature, index) => (
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
        ) : (
          <Link
            to={ctaLink}
            className={`
              block w-full px-6 py-3 rounded-full font-semibold text-center transition-all
              ${tier.highlighted
                ? 'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg'
                : 'bg-primary text-white hover:bg-primary-dark'}
            `}
          >
            {tier.id === 'monthly' ? (
              <>
                <Sparkles className="w-5 h-5 inline mr-2" />
                Je commence à 12,99€
              </>
            ) : (
              <>
                <Star className="w-5 h-5 inline mr-2" />
                Je choisis l'annuel
              </>
            )}
          </Link>
        )}

        <p className="text-center text-xs text-gray-500">
          {tier.id === 'yearly' ? "Engagement d'un an" : "Liberté totale • Annulable en 1 clic"}
        </p>
      </div>
    </div>
  );
}
