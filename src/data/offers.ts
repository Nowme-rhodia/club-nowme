export interface Offer {
  id: string;
  title: string;
  description: string;
  location: string;
  price: number;
  promoPrice?: number;
  imageUrl: string;
  rating: number;
  category: string;
  categorySlug: string;
  subcategorySlug: string;
}

export const offers: Offer[] = [
  {
    id: '1',
    title: 'Séance de massage relaxant',
    description: "Profitez d'une séance de massage relaxant d'une heure dans notre spa luxueux.",
    location: 'Paris 8e',
    price: 90,
    promoPrice: 76,
    imageUrl: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=800',
    rating: 4.8,
    category: 'Bien-être',
    categorySlug: 'bien-etre-et-relaxation',
    subcategorySlug: 'salon-de-massage-drainage-lymphatique'
  },
  {
    id: '2',
    title: 'Cours de yoga en petit groupe',
    description: 'Séance de yoga kundalini en petit groupe avec une professeure expérimentée.',
    location: 'Paris 11e',
    price: 25,
    imageUrl: 'https://images.unsplash.com/photo-1599447421416-3414500d18a5?auto=format&fit=crop&q=80&w=800',
    rating: 4.9,
    category: 'Bien-être',
    categorySlug: 'bien-etre-et-relaxation',
    subcategorySlug: 'centre-de-yoga-pilates'
  },
  {
    id: '3',
    title: 'Concert jazz intimiste',
    description: 'Une soirée jazz exceptionnelle dans un cadre intimiste avec des musiciens talentueux.',
    location: 'Paris 5e',
    price: 35,
    promoPrice: 28,
    imageUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&q=80&w=800',
    rating: 4.7,
    category: 'Culture',
    categorySlug: 'culture-et-divertissement',
    subcategorySlug: 'organisateur-de-concerts'
  },
  {
    id: '4',
    title: 'Atelier peinture créative',
    description: 'Découvrez votre créativité lors de cet atelier de peinture acrylique guidé par un artiste.',
    location: 'Paris 18e',
    price: 45,
    imageUrl: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=800',
    rating: 4.6,
    category: 'Loisirs',
    categorySlug: 'loisirs-et-creativite',
    subcategorySlug: 'atelier-de-creation-poterie-couture-peinture'
  },
  {
    id: '5',
    title: 'Coaching personnel',
    description: 'Séance de coaching personnalisée pour atteindre vos objectifs de vie.',
    location: 'Paris 16e',
    price: 80,
    promoPrice: 64,
    imageUrl: 'https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?auto=format&fit=crop&q=80&w=800',
    rating: 4.9,
    category: 'Coaching',
    categorySlug: 'developpement-personnel-et-coaching',
    subcategorySlug: 'coach-de-vie-personnel'
  },
  {
    id: '6',
    title: 'Shopping personnalisé',
    description: 'Une expérience de shopping sur mesure avec une personal shopper expérimentée.',
    location: 'Paris 1er',
    price: 120,
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800',
    rating: 4.8,
    category: 'Shopping',
    categorySlug: 'mode-et-shopping',
    subcategorySlug: 'personal-shopper'
  },
  {
    id: '7',
    title: 'Séance photo professionnelle',
    description: 'Shooting photo professionnel en studio ou en extérieur selon vos préférences.',
    location: 'Paris 3e',
    price: 150,
    promoPrice: 120,
    imageUrl: 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?auto=format&fit=crop&q=80&w=800',
    rating: 4.7,
    category: 'Loisirs',
    categorySlug: 'loisirs-et-creativite',
    subcategorySlug: 'studio-de-photographie'
  },
  {
    id: '8',
    title: 'Cours de méditation',
    description: 'Initiation à la méditation mindfulness pour débutants.',
    location: 'Paris 14e',
    price: 30,
    imageUrl: 'https://images.unsplash.com/photo-1593811167562-9cef47bfc4a7?auto=format&fit=crop&q=80&w=800',
    rating: 4.9,
    category: 'Bien-être',
    categorySlug: 'bien-etre-et-relaxation',
    subcategorySlug: 'centre-de-yoga-pilates'
  }
];