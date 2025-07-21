import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  Star, 
  Shield, 
  Gift, 
  Heart,
  Send,
  MapPin,
  Check,
  ChevronDown,
  MessageCircle,
  Calendar,
  Smartphone,
  Users,
  Coffee,
  Paintbrush
} from 'lucide-react';
import { SEO } from '../components/SEO';
import { submitRegionRequest } from '../lib/regions';
import toast from 'react-hot-toast';

export default function Subscription() {
  const [regionForm, setRegionForm] = useState({ email: '', region: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleRegionSubmit = async (e) => {
    e.preventDefault();
    if (!regionForm.email || !regionForm.region) {
      toast.error('Remplis tout, stp !');
      return;
    }
    setIsSubmitting(true);
    try {
      await submitRegionRequest(regionForm.email, regionForm.region);
      toast.success('Top ! On te prévient dès que ça arrive chez toi.');
      setRegionForm({ email: '', region: '' });
    } catch (error) {
      toast.error('Oups, réessaie !');
    } finally {
      setIsSubmitting(false);
    }
  };

  const regions = [
    { value: '01', label: 'Ain (01)' },
    { value: '02', label: 'Aisne (02)' },
    { value: '03', label: 'Allier (03)' },
    { value: '04', label: 'Alpes-de-Haute-Provence (04)' },
    { value: '05', label: 'Hautes-Alpes (05)' },
    { value: '06', label: 'Alpes-Maritimes (06)' },
    { value: '07', label: 'Ardèche (07)' },
    { value: '08', label: 'Ardennes (08)' },
    { value: '09', label: 'Ariège (09)' },
    { value: '10', label: 'Aube (10)' },
    { value: '11', label: 'Aude (11)' },
    { value: '12', label: 'Aveyron (12)' },
    { value: '13', label: 'Bouches-du-Rhône (13)' },
    { value: '14', label: 'Calvados (14)' },
    { value: '15', label: 'Cantal (15)' },
    { value: '16', label: 'Charente (16)' },
    { value: '17', label: 'Charente-Maritime (17)' },
    { value: '18', label: 'Cher (18)' },
    { value: '19', label: 'Corrèze (19)' },
    { value: '2A', label: 'Corse-du-Sud (2A)' },
    { value: '2B', label: 'Haute-Corse (2B)' },
    { value: '21', label: "Côte-d'Or (21)" },
    { value: '22', label: "Côtes-d'Armor (22)" },
    { value: '23', label: 'Creuse (23)' },
    { value: '24', label: 'Dordogne (24)' },
    { value: '25', label: 'Doubs (25)' },
    { value: '26', label: 'Drôme (26)' },
    { value: '27', label: 'Eure (27)' },
    { value: '28', label: 'Eure-et-Loir (28)' },
    { value: '29', label: 'Finistère (29)' },
    { value: '30', label: 'Gard (30)' },
    { value: '31', label: 'Haute-Garonne (31)' },
    { value: '32', label: 'Gers (32)' },
    { value: '33', label: 'Gironde (33)' },
    { value: '34', label: 'Hérault (34)' },
    { value: '35', label: 'Ille-et-Vilaine (35)' },
    { value: '36', label: 'Indre (36)' },
    { value: '37', label: 'Indre-et-Loire (37)' },
    { value: '38', label: 'Isère (38)' },
    { value: '39', label: 'Jura (39)' },
    { value: '40', label: 'Landes (40)' },
    { value: '41', label: 'Loir-et-Cher (41)' },
    { value: '42', label: 'Loire (42)' },
    { value: '43', label: 'Haute-Loire (43)' },
    { value: '44', label: 'Loire-Atlantique (44)' },
    { value: '45', label: 'Loiret (45)' },
    { value: '46', label: 'Lot (46)' },
    { value: '47', label: 'Lot-et-Garonne (47)' },
    { value: '48', label: 'Lozère (48)' },
    { value: '49', label: 'Maine-et-Loire (49)' },
    { value: '50', label: 'Manche (50)' },
    { value: '51', label: 'Marne (51)' },
    { value: '52', label: 'Haute-Marne (52)' },
    { value: '53', label: 'Mayenne (53)' },
    { value: '54', label: 'Meurthe-et-Moselle (54)' },
    { value: '55', label: 'Meuse (55)' },
    { value: '56', label: 'Morbihan (56)' },
    { value: '57', label: 'Moselle (57)' },
    { value: '58', label: 'Nièvre (58)' },
    { value: '59', label: 'Nord (59)' },
    { value: '60', label: 'Oise (60)' },
    { value: '61', label: 'Orne (61)' },
    { value: '62', label: 'Pas-de-Calais (62)' },
    { value: '63', label: 'Puy-de-Dôme (63)' },
    { value: '64', label: 'Pyrénées-Atlantiques (64)' },
    { value: '65', label: 'Hautes-Pyrénées (65)' },
    { value: '66', label: 'Pyrénées-Orientales (66)' },
    { value: '67', label: 'Bas-Rhin (67)' },
    { value: '68', label: 'Haut-Rhin (68)' },
    { value: '69', label: 'Rhône (69)' },
    { value: '70', label: 'Haute-Saône (70)' },
    { value: '71', label: 'Saône-et-Loire (71)' },
    { value: '72', label: 'Sarthe (72)' },
    { value: '73', label: 'Savoie (73)' },
    { value: '74', label: 'Haute-Savoie (74)' },
    { value: '75', label: 'Paris (75)' },
    { value: '76', label: 'Seine-Maritime (76)' },
    { value: '77', label: 'Seine-et-Marne (77)' },
    { value: '78', label: 'Yvelines (78)' },
    { value: '79', label: 'Deux-Sèvres (79)' },
    { value: '80', label: 'Somme (80)' },
    { value: '81', label: 'Tarn (81)' },
    { value: '82', label: 'Tarn-et-Garonne (82)' },
    { value: '83', label: 'Var (83)' },
    { value: '84', label: 'Vaucluse (84)' },
    { value: '85', label: 'Vendée (85)' },
    { value: '86', label: 'Vienne (86)' },
    { value: '87', label: 'Haute-Vienne (87)' },
    { value: '88', label: 'Vosges (88)' },
    { value: '89', label: 'Yonne (89)' },
    { value: '90', label: 'Territoire de Belfort (90)' },
    { value: '91', label: 'Essonne (91)' },
    { value: '92', label: 'Hauts-de-Seine (92)' },
    { value: '93', label: 'Seine-Saint-Denis (93)' },
    { value: '94', label: 'Val-de-Marne (94)' },
    { value: '95', label: "Val-d'Oise (95)" },
    { value: '971', label: 'Guadeloupe (971)' },
    { value: '972', label: 'Martinique (972)' },
    { value: '973', label: 'Guyane (973)' },
    { value: '974', label: 'La Réunion (974)' },
    { value: '976', label: 'Mayotte (976)' },
    // Pays limitrophes
    { value: 'BE', label: 'Belgique' },
    { value: 'LU', label: 'Luxembourg' },
    { value: 'DE', label: 'Allemagne' },
    { value: 'CH', label: 'Suisse' },
    { value: 'IT', label: 'Italie' },
    { value: 'MC', label: 'Monaco' },
    { value: 'AD', label: 'Andorre' },
    { value: 'ES', label: 'Espagne' },
  ];

  const faqItems = [
    { 
      question: "Pourquoi 12,99€ puis 39,99€ ?", 
      answer: "Le 1er mois à 12,99€ te permet de découvrir la communauté et les premiers avantages. Ensuite, 39,99€ te donne accès à TOUT : événements premium, box trimestrielle, masterclass, consultations... Plus de 120€ de valeur réelle !" 
    },
    { 
      question: "Qu'est-ce que j'ai concrètement chaque mois ?", 
      answer: "Dès le 1er mois : réductions partenaires + 1 événement + groupe WhatsApp + newsletter. À partir du 2ème : 2-3 événements premium + box tous les 3 mois + masterclass + consultation bien-être + réductions majorées + conciergerie." 
    },
    { 
      question: "Je peux annuler quand ?", 
      answer: "Quand tu veux ! Résiliation en 1 clic depuis ton compte, sans justification. Tu gardes l'accès jusqu'à la fin de ton mois payé." 
    },
    { 
      question: "C'est où exactement ?", 
      answer: "Paris et Île-de-France pour l'instant. Mais on s'étend vite ! Dis-nous ta région pour être prévenue en priorité." 
    },
  ];

  const categories = [
    { title: "Bien-être", description: "Massages à -30%, yoga qui ressource", image: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=800" },
    { title: "Sorties", description: "Apéros à 5 €, soirées entre filles", image: "https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&q=80&w=800" },
    { title: "Créativité", description: "Ateliers peinture, poterie fun", image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=800" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F4] via-white to-[#FDF8F4] overflow-hidden">
      <SEO 
        title="Nowme Club - Kiffe ta vie à prix mini"
        description="Massages, sorties, ateliers : rejoins le club des femmes qui kiffent sans se ruiner !"
      />

      {/* Hero Section */}
      <div className="relative min-h-[70vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-20 animate-subtle-zoom" 
             style={{ backgroundImage: "url('https://images.unsplash.com/photo-1517457373958-b7bdd7f6e7af?auto=format&fit=crop&q=80')" }} 
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 animate-fade-in-down ${scrollY > 50 ? 'opacity-0' : 'opacity-100'}`}>
            Et si tu kiffais enfin TA vie ?  
            <span className="text-primary block">Massages, apéros, liberté : c’est ton tour !</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-8 animate-fade-in-up">
            Imagine : un spa à -30% après une journée folle, un apéro entre filles à 5 €, ou un atelier pour te retrouver.  
            +100 femmes ont déjà dit oui au kiff sans se ruiner. Toi aussi ?
          </p>
          <Link to="#plans" className="inline-flex items-center px-8 py-4 rounded-full bg-primary text-white font-semibold hover:bg-primary-dark transform hover:scale-105 transition-all animate-bounce-slow">
            <Sparkles className="w-5 h-5 mr-2" />
            Je rejoins le kiff maintenant
          </Link>
        </div>
      </div>

      {/* Avantages Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12 animate-fade-in">
            Pourquoi tu vas adorer être avec nous
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 transform group-hover:scale-110 transition-all">
                <Star className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Des pépites rien que pour toi</h3>
              <p className="text-gray-600">Massages qui te font fondre, ateliers testés par des femmes qui te ressemblent : fini les plans moyens !</p>
            </div>
            <div className="text-center group animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 transform group-hover:scale-110 transition-all">
                <Gift className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Bons plans de folie</h3>
              <p className="text-gray-600">Spa à -30%, apéros à 5 €, soirées VIP : ton portefeuille te dit merci, ton cœur vibre.</p>
            </div>
            <div className="text-center group animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 transform group-hover:scale-110 transition-all">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Libre comme l’air</h3>
              <p className="text-gray-600">Résilie en 1 clic quand tu veux. Le kiff, c’est zéro contrainte.</p>
            </div>
            <div className="text-center group animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 transform group-hover:scale-110 transition-all">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Une tribu qui te booste</h3>
              <p className="text-gray-600">Rejoins des femmes fun, partage tes idées, trouve des copines pour kiffer près de chez toi.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Catégories Section - Avec animation gauche-droite */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12 animate-fade-in">
            Ton kiff, ton style, dès aujourd’hui
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map((category, index) => (
              <Link 
                key={index} 
                to={`/kiffs/${category.title.toLowerCase()}`} 
                className={`group relative h-80 rounded-2xl overflow-hidden animate-slide-left-right ${index % 2 === 0 ? 'animate-from-left' : 'animate-from-right'}`} 
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <img src={category.image} alt={category.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
                <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
                  <h3 className="text-2xl font-bold mb-2">{category.title}</h3>
                  <p className="text-white/90">{category.description}</p>
                  <span className="mt-2 inline-block px-4 py-1 bg-primary text-white rounded-full text-sm opacity-0 group-hover:opacity-100 transition-opacity animate-bounce">
                    Je veux ça !
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Nouvelle Section : Aujourd’hui & Demain */}
      <div className="py-20 bg-[#FDF8F4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12 animate-fade-in">
            Ton kiff aujourd’hui, encore plus demain
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Aujourd’hui */}
            <div className="space-y-6 animate-slide-up">
              <h3 className="text-2xl font-bold text-gray-900">Aujourd’hui, tu as :</h3>
              <ul className="space-y-4 text-gray-600">
                <li className="flex items-start">
                  <Check className="w-6 h-6 text-primary mr-2" />
                  <span><strong>Réductions de dingue</strong> : massages à -30%, apéros à 5 €, yoga ou ateliers à prix mini.</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-6 h-6 text-primary mr-2" />
                  <span><strong>Événements fun</strong> : soirées VIP, apéros entre filles, ateliers créatifs près de Paris.</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-6 h-6 text-primary mr-2" />
                  <span><strong>Une tribu</strong> : groupe WhatsApp pour partager bons plans et fous rires.</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-6 h-6 text-primary mr-2" />
                  <span><strong>Contenu exclusif</strong> : newsletter inspirante, défis fun (ex. : "1 kiff par jour").</span>
                </li>
              </ul>
            </div>
            {/* Demain */}
            <div className="space-y-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <h3 className="text-2xl font-bold text-gray-900">Demain, ça sera :</h3>
              <ul className="space-y-4 text-gray-600">
                <li className="flex items-start">
                  <Check className="w-6 h-6 text-primary mr-2" />
                  <span><strong>Partout en France</strong> : des bons plans et événements dans chaque région.</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-6 h-6 text-primary mr-2" />
                  <span><strong>Une appli canon</strong> : réserve ton kiff en 2 clics où que tu sois.</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-6 h-6 text-primary mr-2" />
                  <span><strong>Box surprise</strong> : goodies feel-good (bougies, carnets) livrés chez toi.</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-6 h-6 text-primary mr-2" />
                  <span><strong>Réseau de ouf</strong> : rencontres IRL, masterclass avec des femmes inspirantes.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Communauté Section */}
      <div className="py-20 bg-[#FDF8F4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12 animate-fade-in">
            Ta tribu t’attend déjà !
          </h2>
          <p className="text-xl text-gray-600 mb-8 animate-fade-in-up">
            Imagine : tu arrives dans un groupe WhatsApp bouillant. "Qui est chaude pour un apéro vendredi ?"  
            +100 femmes partagent leurs bons plans, leurs fous rires, et organisent des sorties près de chez toi.
          </p>
          <img 
            src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800" 
            alt="Femmes qui rient" 
            className="rounded-xl shadow-lg max-w-full h-64 object-cover mx-auto animate-slide-up" 
          />
          <button 
            to="/auth/test-signup"
            onClick={() => alert('Rejoins-nous après ton inscription !')}
          >
            <MessageCircle className="w-5 h-5 inline mr-2" />
            Voir un aperçu du groupe
          </button>
        </div>
      </div>

      {/* Plans Section */}
      <div id="plans" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12 animate-fade-in">
            Rejoins le Nowme Club !
          </h2>
          <p className="text-xl text-gray-600 text-center mb-8 animate-fade-in-up">
            Teste d'abord, kiffe ensuite ! Premier mois découverte puis accès à tout le premium.
          </p>
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-primary relative hover:shadow-2xl transition-shadow animate-slide-up">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="px-6 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-full text-sm font-bold animate-pulse">
                  ✨ OFFRE DÉCOUVERTE ✨
                </span>
              </div>
              <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-gray-900 mb-4">Nowme Club Premium</h3>
                <p className="text-gray-600">Tout l'accès, tarif progressif</p>
              </div>
              <div className="mb-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">1er mois</div>
                      <div className="flex items-baseline justify-center">
                        <span className="text-4xl font-bold text-primary animate-pulse-price">12,99€</span>
                      </div>
                      <div className="text-xs text-gray-500">Pour tout découvrir</div>
                    </div>
                    <div className="text-2xl text-gray-400">→</div>
                    <div className="text-center">
                      <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">Puis</div>
                      <div className="flex items-baseline justify-center">
                        <span className="text-4xl font-bold text-gray-900">39,99€</span>
                        <span className="text-gray-500 ml-1">/mois</span>
                      </div>
                      <div className="text-xs text-gray-500">Accès premium complet</div>
                    </div>
                  </div>
                  <p className="text-primary font-semibold text-center bg-primary/10 rounded-lg p-3">
                    🎯 Teste sans risque, résilie quand tu veux !
                  </p>
                </div>
              </div>
              
              <div className="space-y-6 mb-8">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary text-sm font-bold mr-2">1</span>
                    Dès le 1er mois (12,99€)
                  </h4>
                  <ul className="space-y-2 ml-8">
                    <li className="flex items-center text-sm"><Check className="w-4 h-4 text-primary mr-2" />Réductions jusqu'à -50% chez nos partenaires</li>
                    <li className="flex items-center text-sm"><Check className="w-4 h-4 text-primary mr-2" />Accès au groupe WhatsApp communautaire</li>
                    <li className="flex items-center text-sm"><Check className="w-4 h-4 text-primary mr-2" />1 événement découverte par mois</li>
                    <li className="flex items-center text-sm"><Check className="w-4 h-4 text-primary mr-2" />Newsletter hebdo avec bons plans</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary text-sm font-bold mr-2">2</span>
                    À partir du 2ème mois (39,99€)
                  </h4>
                  <ul className="space-y-2 ml-8">
                    <li className="flex items-center text-sm"><Check className="w-4 h-4 text-primary mr-2" />Tout du niveau découverte +</li>
                    <li className="flex items-center text-sm"><Check className="w-4 h-4 text-primary mr-2" />2-3 événements premium par mois</li>
                    <li className="flex items-center text-sm"><Check className="w-4 h-4 text-primary mr-2" />Box surprise trimestrielle (valeur 30€)</li>
                    <li className="flex items-center text-sm"><Check className="w-4 h-4 text-primary mr-2" />Masterclass exclusives avec expertes</li>
                    <li className="flex items-center text-sm"><Check className="w-4 h-4 text-primary mr-2" />Consultation bien-être gratuite/trimestre</li>
                    <li className="flex items-center text-sm"><Check className="w-4 h-4 text-primary mr-2" />Réductions majorées (-70% vs -50%)</li>
                    <li className="flex items-center text-sm"><Check className="w-4 h-4 text-primary mr-2" />Service conciergerie pour tes réservations</li>
                    <li className="flex items-center text-sm"><Check className="w-4 h-4 text-primary mr-2" />Accès prioritaire aux nouveautés</li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg p-4 mb-6">
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-900 mb-1">💰 Valeur réelle du premium :</p>
                  <div className="flex justify-center items-center gap-4 text-xs text-gray-600">
                    <span>Événements: 25€</span>
                    <span>Box: 10€</span>
                    <span>Masterclass: 20€</span>
                    <span>Consultation: 15€</span>
                    <span>Réductions: 50€+</span>
                  </div>
                  <p className="text-primary font-bold mt-1">= Plus de 120€ de valeur pour 39,99€ !</p>
                </div>
              </div>
              
              <Link to="/checkout?plan=discovery" className="block w-full text-center px-8 py-4 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-bold text-lg hover:shadow-lg transition-all animate-bounce-slow">
                🚀 Je commence mon aventure Nowme !
              </Link>
              
              <p className="text-center text-xs text-gray-500 mt-4">
                Sans engagement • Résiliation en 1 clic • Support 7j/7
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Témoignages Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12 animate-fade-in">
            Elles kiffent déjà, imagine-toi !
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-[#FDF8F4] p-6 rounded-xl shadow animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <p className="text-gray-700 mb-4">"Les masterclass m'ont ouvert les yeux, et les copines du groupe me boostent chaque jour !"</p>
              <p className="font-semibold text-primary">— Amandine, jeune pro</p>
            </div>
            <div className="bg-[#FDF8F4] p-6 rounded-xl shadow animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <p className="text-gray-700 mb-4">"La box trimestrielle + les événements premium : je me sens chouchoutée !"</p>
              <p className="font-semibold text-primary">— Samira, maman active</p>
            </div>
            <div className="bg-[#FDF8F4] p-6 rounded-xl shadow animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <p className="text-gray-700 mb-4">"12,99€ pour tester, puis j'ai vu la valeur : 39,99€ c'est donné pour tout ça !"</p>
              <p className="font-semibold text-primary">— Julie, chasseuse de deals</p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12 animate-fade-in">
            Tes questions ? On te dit tout !
          </h2>
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <div key={index} className="border-b pb-4 animate-slide-up" style={{ animationDelay: `${index * 0.2}s` }}>
                <button
                  className="w-full text-left flex justify-between items-center text-xl font-semibold hover:text-primary transition-colors"
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                >
                  {item.question}
                  <ChevronDown className={`w-5 h-5 transition-transform ${activeFaq === index ? 'rotate-180' : ''}`} />
                </button>
                {activeFaq === index && <p className="mt-2 text-gray-600 animate-fade-in-up">{item.answer}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Région Section */}
      <div className="py-20 bg-primary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12 animate-fade-in">
            Pas encore chez toi ? Fais-le venir !
          </h2>
          <p className="text-xl text-gray-600 mb-8 animate-fade-in-up">
            On commence à Paris et banlieue, mais ton kiff arrive bientôt partout. Dis-nous où tu es !
          </p>
          <form onSubmit={handleRegionSubmit} className="max-w-md mx-auto space-y-4 animate-slide-up">
            <input
              type="email"
              value={regionForm.email}
              onChange={(e) => setRegionForm({ ...regionForm, email: e.target.value })}
              placeholder="Ton email"
              className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              value={regionForm.region}
              onChange={(e) => setRegionForm({ ...regionForm, region: e.target.value })}
              className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Ta région ?</option>
              {regions.map((region) => (
                <option key={region.value} value={region.value}>{region.label}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-3 bg-primary text-white rounded-full font-semibold hover:bg-primary-dark transition-all animate-pulse"
            >
              {isSubmitting ? "Envoi..." : "Je veux être prévenue !"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Animations mises à jour avec effet gauche-droite
const animations = `
  @keyframes fade-in-down {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(50px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slide-left-right {
    from { opacity: 0; transform: translateX(var(--start)); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes bounce-slow {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  @keyframes subtle-zoom {
    0% { transform: scale(1); }
    100% { transform: scale(1.05); }
  }
  @keyframes pulse-price {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  .animate-fade-in { animation: fade-in-down 1s ease-out; }
  .animate-fade-in-up { animation: fade-in-up 1s ease-out; }
  .animate-slide-up { animation: slide-up 0.8s ease-out; }
  .animate-bounce-slow { animation: bounce-slow 2s infinite; }
  .animate-subtle-zoom { animation: subtle-zoom 10s infinite alternate; }
  .animate-pulse { animation: pulse 2s infinite; }
  .animate-pulse-price { animation: pulse-price 1.5s infinite; }
  .animate-slide-left-right { animation: slide-left-right 0.8s ease-out; }
  .animate-from-left { --start: -50px; }
  .animate-from-right { --start: 50px; }
`;