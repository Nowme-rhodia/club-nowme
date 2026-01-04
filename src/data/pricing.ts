// Configuration des prix et offres Nowme Club

// Force sync with GitHub - timestamp: 2025-01-04
export interface PricingTier {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  stripePriceId: string;
  promoCode?: string;
  originalPrice?: number;
  bonusValue?: number;
}

export interface ServiceOffering {
  category: string;
  items: {
    name: string;
    description: string;
    value: number;
    frequency: string;
  }[];
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'monthly',
    name: 'Plan Découverte',
    price: 12.99,
    originalPrice: 39.99,
    period: '1er mois, puis 39,99€/mois',
    description: 'Premier mois à 12,99€ (Automatiquement appliqué)',
    stripePriceId: 'price_1RqraiDaQ8XsywAvAAmxoAFW',
    promoCode: undefined, // Plus de code promo manuel requis
    features: [
      'Accès complet à tous les services dès le 1er mois',
      '2-3 événements premium et `sorties organisées par mois',
      'Concours Box surprise trimestrielle (valeur 30€ à 100€)',
      'Apéros mensuels en ligne',
      'Masterclass exclusives avec expertes',
      'Réductions jusqu\'à -70% chez nos partenaires',
      'Accès aux séjours entre filles',
      'Communauté premium modérée',
      'Newsletter hebdomadaire "Kiff de la semaine"',
      'Résiliation en 1 clic'
    ]
  },
  {
    id: 'yearly',
    name: 'Annuel',
    price: 399,
    period: 'par an',
    description: 'Presque 2 mois OFFERTS + bonus exclusifs',
    highlighted: true,
    stripePriceId: 'price_1Rqrb6DaQ8XsywAvvF8fsaJi',
    bonusValue: 100,
    features: [
      'Tout du plan mensuel inclus',
      '100€ de réduction sur tous les séjours',
      'Accès prioritaire aux événements exclusifs',
      'Concours Box premium avec produits haut de gamme',
      'Invitation aux événements VIP',
      'Cadeaux d\'anniversaire personnalisés',
      'Support prioritaire',
      'Accès anticipé aux nouveautés',
      'Réductions majorées chez les partenaires',
    ]
  }
];

export const SERVICE_OFFERINGS: ServiceOffering[] = [
  {
    category: 'Expériences & Découvertes',
    items: [
      {
        name: 'Activités premium',
        description: 'Expériences testées et approuvées par la communauté',
        value: 25,
        frequency: '2-3 par mois'
      },
      {
        name: 'Réductions exclusives',
        description: 'Jusqu\'à -70% chez nos partenaires sélectionnés',
        value: 50,
        frequency: 'Permanent'
      },
      {
        name: 'Bons plans en avant-première',
        description: 'Accès prioritaire aux nouveautés et offres limitées',
        value: 15,
        frequency: 'Hebdomadaire'
      }
    ]
  },
  {
    category: 'Événements & Communauté',
    items: [
      {
        name: 'Événements premium',
        description: 'Brunchs, ateliers, soirées networking',
        value: 25,
        frequency: '2-3 par mois'
      },
      {
        name: 'Masterclass expertes',
        description: 'Sessions exclusives développement personnel',
        value: 30,
        frequency: '1 par mois'
      },
      {
        name: 'Communauté active',
        description: 'Groupe privé, parrainage',
        value: 10,
        frequency: 'Accès permanent'
      }
    ]
  },
  {
    category: 'Services Premium',
    items: [
      {
        name: 'Concours Box surprise trimestrielle',
        description: 'Produits lifestyle et bons plans découverte',
        value: 30,
        frequency: '1 par trimestre'
      }
    ]
  }
];

// Calcul automatique de la valeur totale
export const calculateTotalValue = (): number => {
  return SERVICE_OFFERINGS.reduce((total, category) => {
    return total + category.items.reduce((categoryTotal, item) => {
      return categoryTotal + item.value;
    }, 0);
  }, 0);
};

// Messages marketing
export const MARKETING_MESSAGES = {
  monthly: {
    headline: "Profite de ton 1er mois à 12,99€ !",
    subheadline: "Offre de bienvenue automatiquement appliquée (puis 39,99€/mois)",
    cta: "Je profite de l'offre"
  },
  yearly: {
    headline: "Presque 2 mois OFFERTS + 100€ de réduction séjours",
    subheadline: "L'abonnement annuel le plus avantageux",
    cta: "Je choisis l'annuel"
  }
};

export const YEARLY_SAVINGS = {
  monthlyTotal: 27 + (39.99 * 11), // 1er mois avec KIFFE + 11 mois à 39,99€
  yearlyPrice: 399,
  savings: (27 + (39.99 * 11)) - 399 // Économie réelle
};