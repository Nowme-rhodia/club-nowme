export const categoryBackgrounds: Record<string, string> = {
  'sport-et-activites-physiques': 'https://imgur.com/CV5Sf3p.jpg',
  'culture-et-divertissement': 'https://imgur.com/DvwhCis.jpg',
  'bien-etre-et-relaxation': 'https://imgur.com/I3QTMAQ.jpg',
  'developpement-personnel-et-coaching': 'https://imgur.com/zueyWZX.jpg',
  'loisirs-et-creativite': 'https://imgur.com/eKPwz4I.jpg',
  'mode-et-shopping': 'https://imgur.com/7L7NwD0.jpg',
  'produits': 'https://imgur.com/NDvRofL.jpg',
  'services-a-domicile': 'https://imgur.com/YXzZQm0.jpg',
  'spiritualite-et-energie': 'https://imgur.com/rrMSw7Z.jpg',
  'voyages-et-experiences': 'https://imgur.com/206IBHp.jpg'
};

export const getCategoryBackground = (categorySlug: string) => {
  return categoryBackgrounds[categorySlug] || categoryBackgrounds['bien-etre-et-relaxation'];
};