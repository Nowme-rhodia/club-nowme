// Configuration des prix et offres Nowme Club

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  stripePriceId: string;
  yearlyPrice?: number;
  yearlyStripePriceId?: string;
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
    name: 'Mensuel',
    price: 12.99,
    period: '1er mois, puis 39,99€/mois',
    description: 'Accès complet dès le premier mois, puis tarif normal',
    stripePriceId: 'price_monthly_1299',
    features: [
      'Accès complet à tous les services dès le 1er mois',
      '2-3 événements premium par mois',
      'Box surprise trimestrielle (valeur 30€)',
      'Apéros mensuels en ligne',
      'Masterclass exclusives avec expertes',
      'Consultation bien-être gratuite/trimestre',
      'Carte interactive pour rencontrer des membres',
      'Réductions jusqu\'à -70% chez nos partenaires',
      'Service conciergerie pour réservations',
      'Accès aux séjours entre filles',
      'Communauté premium modérée',
      'Newsletter quotidienne "Kiff du jour"',
      'Résiliation en 1 clic'
    ]
  },
  {
    id: 'yearly',
    name: 'Annuel',
    price: 399,
    period: 'par an',
    description: 'Tout inclus + bonus exclusifs pour un engagement annuel',
    highlighted: true,
    stripePriceId: 'price_yearly_39900',
    features: [
      'Tout du plan mensuel inclus',
      '100€ de réduction sur tous les séjours',
      'Accès prioritaire aux événements exclusifs',
      'Box premium avec produits haut de gamme',
      'Consultation bien-être supplémentaire',
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
        description: 'Groupe privé, carte interactive, parrainage',
        value: 10,
        frequency: 'Accès permanent'
      }
    ]
  },
  {
    category: 'Services Premium',
    items: [
      {
        name: 'Box surprise trimestrielle',
        description: 'Produits lifestyle et bons plans découverte',
        value: 30,
        frequency: '1 par trimestre'
      },
      {
        name: 'Consultation bien-être',
        description: 'Séance gratuite avec nos expertes',
        value: 45,
        frequency: '1 par trimestre'
      },
      {
        name: 'Service conciergerie',
        description: 'Aide pour réservations et conseils perso',
        value: 20,
        frequency: 'Illimité'
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
    headline: "Accès complet dès le 1er mois !",
    subheadline: "12,99€ pour découvrir, puis 39,99€ pour continuer à kiffer",
    cta: "Je commence à 12,99€"
  },
  yearly: {
    headline: "Presque 2 mois OFFERTS + 100€ de réduction séjours",
    subheadline: "L'abonnement annuel le plus avantageux",
    cta: "Je choisis l'annuel"
  }
};

export const YEARLY_SAVINGS = {
  monthlyTotal: 12.99 + (39.99 * 11), // 1er mois + 11 mois à 39,99€
  yearlyPrice: 399,
  savings: (12.99 + (39.99 * 11)) - 399 // Économie réelle
};