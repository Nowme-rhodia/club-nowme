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
    id: 'discovery',
    name: 'Découverte',
    price: 12.99,
    period: '1er mois',
    description: 'Pour découvrir la communauté et les premiers avantages',
    stripePriceId: 'price_discovery_1299',
    features: [
      'Réductions jusqu\'à -50% chez nos partenaires',
      'Accès au groupe WhatsApp communautaire',
      '1 événement découverte par mois',
      'Newsletter hebdomadaire avec bons plans',
      'Support par email',
      'Résiliation en 1 clic'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 39.99,
    period: 'à partir du 2ème mois',
    description: 'Accès complet à tous les services premium',
    highlighted: true,
    stripePriceId: 'price_premium_3999',
    features: [
      'Tout du niveau Découverte +',
      '2-3 événements premium par mois',
      'Box surprise trimestrielle (valeur 30€)',
      'Masterclass exclusives avec expertes',
      'Consultation bien-être gratuite/trimestre',
      'Réductions majorées (jusqu\'à -70%)',
      'Service conciergerie pour réservations',
      'Accès prioritaire aux nouveautés',
      'Groupes WhatsApp spécialisés',
      'Programme de parrainage'
    ]
  }
];

export const SERVICE_OFFERINGS: ServiceOffering[] = [
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
        description: 'Sessions avec des professionnelles reconnues',
        value: 20,
        frequency: '1 par mois'
      },
      {
        name: 'Groupes WhatsApp spécialisés',
        description: 'Par centres d\'intérêt et localisation',
        value: 5,
        frequency: 'Accès permanent'
      }
    ]
  },
  {
    category: 'Bien-être & Développement',
    items: [
      {
        name: 'Consultation bien-être',
        description: 'Séance individuelle avec une experte',
        value: 15,
        frequency: '1 par trimestre'
      },
      {
        name: 'Box surprise',
        description: 'Produits bien-être et lifestyle sélectionnés',
        value: 30,
        frequency: '1 par trimestre'
      },
      {
        name: 'Méditations guidées',
        description: 'Contenu audio exclusif',
        value: 10,
        frequency: 'Nouveau contenu mensuel'
      }
    ]
  },
  {
    category: 'Services Premium',
    items: [
      {
        name: 'Réductions majorées',
        description: 'Jusqu\'à -70% vs -50% niveau découverte',
        value: 50,
        frequency: 'Sur tous les partenaires'
      },
      {
        name: 'Service conciergerie',
        description: 'Aide pour réservations et conseils personnalisés',
        value: 15,
        frequency: 'Illimité'
      },
      {
        name: 'Accès prioritaire',
        description: 'Premiers informés des nouveautés',
        value: 5,
        frequency: 'Permanent'
      }
    ]
  }
];

export const TOTAL_VALUE_CALCULATION = {
  discovery: {
    services: 45, // Événement + newsletter + réductions
    cost: 12.99,
    savings: 32.01
  },
  premium: {
    services: 125, // Tous les services combinés
    cost: 39.99,
    savings: 85.01
  }
};

// Calcul automatique de la valeur totale
export const calculateTotalValue = (tier: 'discovery' | 'premium'): number => {
  const relevantOfferings = tier === 'discovery' 
    ? SERVICE_OFFERINGS.slice(0, 1) // Seulement événements de base
    : SERVICE_OFFERINGS; // Tout

  return relevantOfferings.reduce((total, category) => {
    return total + category.items.reduce((categoryTotal, item) => {
      return categoryTotal + item.value;
    }, 0);
  }, 0);
};

// Messages marketing
export const MARKETING_MESSAGES = {
  discovery: {
    headline: "Teste sans risque !",
    subheadline: "Découvre la communauté et les premiers avantages",
    cta: "Je teste à 12,99€"
  },
  premium: {
    headline: "Plus de 120€ de valeur pour 39,99€",
    subheadline: "Accès complet à tous les services premium",
    cta: "J'accède au premium"
  },
  transition: {
    headline: "Prête pour l'expérience complète ?",
    subheadline: "Passe au premium et débloquer tous les avantages",
    cta: "Je passe au premium"
  }
};