// Définition des couleurs thématiques pour chaque catégorie
export const categoryGradients: Record<string, { from: string; to: string }> = {
  'bien-etre-et-relaxation': { from: '#9EE6CF', to: '#6ABEAA' },
  'culture-et-divertissement': { from: '#89CFF0', to: '#5B84B1' },
  'developpement-personnel-et-coaching': { from: '#FFB6C1', to: '#DB7093' },
  'loisirs-et-creativite': { from: '#DDA0DD', to: '#9370DB' },
  'mode-et-shopping': { from: '#F0E68C', to: '#DAA520' },
  'produits': { from: '#98FB98', to: '#3CB371' },
  'services-a-domicile': { from: '#FFA07A', to: '#FF6347' },
  'spiritualite-et-energie': { from: '#E6E6FA', to: '#9370DB' },
  'sport-et-activites-physiques': { from: '#87CEEB', to: '#4682B4' },
  'voyages-et-experiences': { from: '#FFB347', to: '#FF8C00' },
};

export const getCategoryGradient = (categorySlug: string) => {
  return categoryGradients[categorySlug] || { from: '#BF2778', to: '#E4D44C' };
};