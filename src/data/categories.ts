export interface Subcategory {
  name: string;
  slug: string;
  icon?: string;
}

export interface Category {
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  subcategories: Subcategory[];
}

export const categories: Category[] = [
  {
    name: "Bien-être et relaxation",
    slug: "bien-etre-et-relaxation",
    icon: "Spa",
    description: "Services et activités pour le bien-être et la relaxation",
    subcategories: [
      { name: "Autre", slug: "autre-bien-etre" },
      { name: "Centre de yoga, Pilates", slug: "centre-de-yoga-pilates" },
      { name: "Institut de beauté, Esthétique", slug: "institut-de-beaute-esthetique" },
      { name: "Naturopathe, Sophrologue", slug: "naturopathe-sophrologue" },
      { name: "Réflexologie", slug: "reflexologie" },
      { name: "Salon de massage, Drainage lymphatique", slug: "salon-de-massage-drainage-lymphatique" },
      { name: "Sophrologie", slug: "sophrologie" },
      { name: "Spa et centre de bien-être", slug: "spa-et-centre-de-bien-etre" },
      { name: "Thalassothérapie, Hammam", slug: "thalassotherapie-hammam" }
    ]
  },
  {
    name: "Culture et divertissement",
    slug: "culture-et-divertissement",
    icon: "Music",
    description: "Activités culturelles et divertissements variés",
    subcategories: [
      { name: "Autre", slug: "autre-culture-et-divertissement" },
      { name: "Bars", slug: "bars" },
      { name: "Boîte de nuit", slug: "boite-de-nuit" },
      { name: "DJ, animateur de soirée", slug: "dj-animateur-de-soiree" },
      { name: "Entreprise d'événementiel culturel", slug: "entreprise-devenementiel-culturel" },
      { name: "Game room", slug: "game-room" },
      { name: "One (wo)man show", slug: "one-wo-man-show" },
      { name: "Organisateur de concerts", slug: "organisateur-de-concerts" },
      { name: "Organisateur de soirées à thème", slug: "organisateur-de-soirees-a-theme" },
      { name: "Théâtre, salle de spectacle", slug: "theatre-salle-de-spectacle" }
    ]
  },
  {
    name: "Développement personnel et coaching",
    slug: "developpement-personnel-et-coaching",
    icon: "Brain",
    description: "Services de coaching et développement personnel",
    subcategories: [
      { name: "Autre", slug: "autre-developpement-personnel" },
      { name: "Coach de vie, Personnel", slug: "coach-de-vie-personnel" },
      { name: "Coach parentalité", slug: "coach-parentalite" },
      { name: "Coach sportif", slug: "coach-sportif" },
      { name: "Facilitateur de cercle de parole", slug: "facilitateur-de-cercle-de-parole" },
      { name: "Hypnothérapeute", slug: "hypnotherapeute" },
      { name: "Praticien de médecine alternative", slug: "praticien-de-medecine-alternative" },
      { name: "Psychologue", slug: "psychologue" },
      { name: "Sophrologue", slug: "sophrologue" },
      { name: "Thérapeute", slug: "therapeute" }
    ]
  },
  {
    name: "Gastronomie & Art de la Table",
    slug: "gastronomie-et-art-de-la-table",
    icon: "Utensils",
    description: "Expériences culinaires et dégustations",
    subcategories: [
      { name: "Brunchs & Food Tours", slug: "brunchs-food-tours" },
      { name: "Boulangerie", slug: "boulangerie" },
      { name: "Cours de Cuisine", slug: "cours-de-cuisine" },
      { name: "Dîners Privés", slug: "diners-prives" },
      { name: "Épicerie", slug: "epicerie" },
      { name: "Oenologie & Dégustations", slug: "oenologie-degustations" },
      { name: "Restaurants", slug: "restaurants" }
    ]
  },
  {
    name: "Loisirs et créativité",
    slug: "loisirs-et-creativite",
    icon: "Palette",
    description: "Activités créatives et loisirs",
    subcategories: [
      { name: "Autre", slug: "autre-loisirs-et-creativite" },
      { name: "Atelier de création (poterie, couture, peinture)", slug: "atelier-de-creation-poterie-couture-peinture" },
      { name: "Atelier d'écriture", slug: "atelier-decriture" },
      { name: "Club de lecture / Book Club", slug: "club-de-lecture-book-club" },
      { name: "École de musique / Organisation", slug: "ecole-de-musique-organisation" },
      { name: "École de photographie", slug: "ecole-de-photographie" },
      { name: "Studio de photographie", slug: "studio-de-photographie" }
    ]
  },
  {
    name: "Mode et shopping",
    slug: "mode-et-shopping",
    icon: "ShoppingBag",
    description: "Services de mode et shopping personnalisé",
    subcategories: [
      { name: "Autre", slug: "autre-mode-et-shopping" },
      { name: "Créateur/trice de vêtements, accessoires", slug: "createur-de-vetements-accessoires" },
      { name: "Organisateur d'atelier de seconde main", slug: "organisateur-datelier-de-seconde-main" },
      { name: "Personal shopper", slug: "personal-shopper" }
    ]
  },
  {
    name: "Produits",
    slug: "produits",
    icon: "Package",
    description: "Produits pour votre bien-être, mode, épicerie...",
    subcategories: [
      { name: "Autre", slug: "autre-produits" },
      { name: "Accessoires de yoga / sport", slug: "accessoires-de-yoga-sport" },
      { name: "Beauté et hygiène, cosmétique", slug: "beaute-et-hygiene-cosmetique" },
      { name: "Box bien-être", slug: "box-bien-etre" }
    ]
  },
  {
    name: "Services à domicile",
    slug: "services-a-domicile",
    icon: "Home",
    description: "Services personnels directement à domicile",
    subcategories: [
      { name: "Autre", slug: "autre-services-a-domicile" },
      { name: "Assistant personnel", slug: "assistant-personnel" },
      { name: "Chef privé", slug: "chef-prive" },
      { name: "Coiffure à domicile", slug: "coiffure-a-domicile" },
      { name: "Esthétique à domicile", slug: "esthetique-a-domicile" },
      { name: "Massage à domicile", slug: "massage-a-domicile" }
    ]
  },
  {
    name: "Spiritualité et énergie",
    slug: "spiritualite-et-energie",
    icon: "Sparkles",
    description: "Pratiques spirituelles pour le bien-être et l'énergie",
    subcategories: [
      { name: "Autre", slug: "autre-spiritualite-et-energie" },
      { name: "Astrologue/tarologue et autres pratiques", slug: "astrologue-tarologue-et-autres-pratiques" },
      { name: "Magnétiseur", slug: "magnetiseur" }
    ]
  },
  {
    name: "Sport et activités physiques",
    slug: "sport-et-activites-physiques",
    icon: "Activity",
    description: "Activités sportives et physiques",
    subcategories: [
      { name: "Autre", slug: "autre-sport" },
      { name: "Activités sur glace (ex: patinoire)", slug: "activites-sur-glace" },
      { name: "Activités terrestres", slug: "activites-terrestres" },
      { name: "Activités nautiques (aquagym, natation)", slug: "activites-nautiques" },
      { name: "Coach sportif", slug: "coach-sportif-sport" },
      { name: "Salle de danse", slug: "salle-de-danse" },
      { name: "Salle de sport", slug: "salle-de-sport" }
    ]
  },
  {
    name: "Voyages et expériences",
    slug: "voyages-et-experiences",
    icon: "Globe",
    description: "Voyages et expériences uniques",
    subcategories: [
      { name: "Autre", slug: "autre-voyages" },
      { name: "Activités insolites", slug: "activites-insolites" },
      { name: "Agence de voyage", slug: "agence-de-voyage" },
      { name: "Guide touristique", slug: "guide-touristique" },
      { name: "Hôtels / Maisons d'hôte", slug: "hotels-maisons-dhote" },
      { name: "Organisateur de retraites bien-être", slug: "organisateur-de-retraites-bien-etre" },
      { name: "Séjours culturels", slug: "sejours-culturels" },
      { name: "Séjours à la nature", slug: "sejours-a-la-nature" }
    ]
  }
];