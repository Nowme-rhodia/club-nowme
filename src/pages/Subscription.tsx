import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  Users,
  Coffee,
  X,
  ArrowRight,
  CheckCircle,
  Clock,
  Euro,
  Zap,
  Camera,
  Music,
  Palette,
  Utensils,
  Plane,
  MonitorPlay
} from 'lucide-react';
import { SEO } from '../components/SEO';
import { submitRegionRequest } from '../lib/regions';
import { PricingCard } from '../components/PricingCard';
import { PRICING_TIERS, YEARLY_SAVINGS, calculateTotalValue } from '../data/pricing';
import { useAuth } from '../lib/auth';
import toast from 'react-hot-toast';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

export default function Subscription() {
  const { isAuthenticated, isSubscriber } = useAuth();
  const [regionForm, setRegionForm] = useState({ email: '', region: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleRegionSubmit = async (e: React.FormEvent) => {
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
    { value: '75', label: 'Paris (75)' },
    { value: '77', label: 'Seine-et-Marne (77)' },
    { value: '78', label: 'Yvelines (78)' },
    { value: '91', label: 'Essonne (91)' },
    { value: '92', label: 'Hauts-de-Seine (92)' },
    { value: '93', label: 'Seine-Saint-Denis (93)' },
    { value: '94', label: 'Val-de-Marne (94)' },
    { value: '95', label: "Val-d'Oise (95)" },
    { value: '13', label: 'Bouches-du-Rhône (13)' },
    { value: '33', label: 'Gironde (33)' },
    { value: '31', label: 'Haute-Garonne (31)' },
    { value: '69', label: 'Rhône (69)' },
    { value: '59', label: 'Nord (59)' },
    { value: '44', label: 'Loire-Atlantique (44)' },
    { value: 'autre', label: 'Autre région' },
  ];

  const faqItems = [
    { 
      question: "Pourquoi 12,99€ puis 39,99€ ?", 
      answer: "Le 1er mois à 12,99€ te permet de découvrir TOUT sans risque : événements, masterclass, box, consultations... Ensuite, 39,99€ pour continuer à profiter de tous ces services premium. Tu as accès à tout dès le premier jour !" 
    },
    { 
      question: "Qu'est-ce que j'ai concrètement chaque mois ?", 
      answer: "Dès le 1er mois : 2-3 événements premium + masterclass + Concours box trimestrielle + communauté + réductions jusqu'à -70% + accès séjours. Plus de 185€ de valeur pour 12,99€ le premier mois !" 
    },
    { 
      question: "Pourquoi choisir l'abonnement annuel ?", 
      answer: "L'annuel à 399€ te fait économiser 80€ vs le mensuel presque 2 mois OFFERTS, PLUS tu reçois 100€ de réduction sur tous les séjours. C'est le plan le plus avantageux !" 
    },
    { 
      question: "Je peux annuler quand ?", 
      answer: "Quand tu veux sur l'abonnement mensuel ! Résiliation en 1 clic depuis ton compte, sans justification. Tu gardes l'accès jusqu'à la fin de ton mois/année payé. Aucun engagement, aucune contrainte." 
    },
    { 
      question: "C'est où exactement ?", 
      answer: "Paris et Île-de-France pour l'instant, avec extension prévue dans toute la France ! Dis-nous ta région pour être prévenue en priorité quand on arrive chez toi." 
    }
  ];

  const totalValue = calculateTotalValue();

  // Fonction pour obtenir le lien d'action en fonction du statut
  const getActionLink = (plan: 'monthly' | 'yearly') => {
    if (isSubscriber) {
      // Déjà abonné → vers le compte
      return '/account';
    }
    if (isAuthenticated) {
      // Connecté mais pas abonné → vers checkout directement
      return `/checkout?plan=${plan}`;
    }
    // Pas connecté → vers signup
    return `/auth/signup?plan=${plan}`;
  };

  const getActionText = () => {
    if (isSubscriber) {
      return 'Voir mon compte';
    }
    if (isAuthenticated) {
      return 'Continuer vers le paiement';
    }
    return 'Je commence';
  };

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <SEO 
        title="Abonnement Nowme Club"
        description="Rejoins le Nowme Club et accède à des expériences exclusives, réductions et une communauté de femmes inspirantes."
      />

      {/* Hero Section - Focus sur l'abonnement */}
      <motion.section 
        className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-[#FDF8F4] via-white to-[#FDF8F4]"
        initial="initial"
        whileInView="whileInView"
        viewport={{ once: true }}
      >
        {/* Éléments décoratifs flottants */}
        <div className="absolute top-20 right-10 w-32 h-32 bg-primary/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 left-10 w-24 h-24 bg-secondary/10 rounded-full blur-lg animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-primary/5 rounded-full blur-md animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div {...fadeInUp}>
              <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full text-primary font-semibold mb-6">
                <Users className="w-4 h-4 mr-2" />
                <span>Plus de 100 femmes kiffent déjà avec nous</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Ton abonnement pour{' '}
                <span className="text-primary relative">
                  kiffer enfin ta vie !
                  <svg className="absolute -bottom-2 left-0 w-full h-3" viewBox="0 0 200 12" fill="none">
                    <path d="M2 10C50 2 150 2 198 10" stroke="#E4D44C" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                </span>
              </h1>
              
              <p className="text-lg sm:text-xl text-gray-700 mb-8 leading-relaxed">
                Accès complet dès le 1er mois : événements, masterclass, consultations, box, communauté...
              </p>
              
              {/* Comparaison des plans */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-lg max-w-2xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center bg-blue-50 rounded-xl p-4">
                    <h3 className="font-bold text-blue-900 mb-2">Plan Mensuel</h3>
                    <div className="text-3xl font-bold text-blue-600 mb-1">12,99€</div>
                    <div className="text-sm text-blue-700 mb-2">1er mois, puis 39,99€</div>
                    <div className="text-xs text-gray-600">Accès complet immédiat</div>
                  </div>
                  
                  <div className="text-center bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl p-4 border-2 border-primary/20">
                    <h3 className="font-bold text-primary mb-2">Plan Annuel ⭐</h3>
                    <div className="text-3xl font-bold text-primary mb-1">399€</div>
                    <div className="text-sm text-primary mb-2">Économie de {YEARLY_SAVINGS.savings.toFixed(0)}€</div>
                    <div className="text-xs text-gray-600">+ 100€ réduction séjours</div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to={getActionLink('monthly')}
                  className="inline-flex items-center px-8 py-4 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-semibold text-lg hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  {isSubscriber ? 'Voir mon compte' : isAuthenticated ? 'Continuer (12,99€)' : 'Je commence à 12,99€'}
                </Link>
                {!isSubscriber && (
                  <Link
                    to={getActionLink('yearly')}
                    className="inline-flex items-center px-8 py-4 rounded-full bg-white text-primary border-2 border-primary font-semibold text-lg hover:bg-primary/5 transform hover:scale-105 transition-all duration-300"
                  >
                    <Star className="w-5 h-5 mr-2" />
                    {isAuthenticated ? 'Continuer (annuel)' : 'Je choisis l\'annuel'}
                  </Link>
                )}
              </div>
              
              <p className="text-sm text-gray-600 mt-4">
                ✨ Sans engagement • Résiliation en 1 clic • Accès complet dès le 1er jour
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Section Pricing - Cartes des abonnements */}
      <motion.section id="plans" className="py-20 bg-gray-50" {...fadeInUp}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Choisis ton plan
            </motion.h2>
            <motion.p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Accès complet dès le premier jour, peu importe ton choix. 
              La seule différence : les bonus du plan annuel !
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {PRICING_TIERS.map((tier) => (
              <PricingCard key={tier.id} tier={tier} />
            ))}
          </div>
        </div>
      </motion.section>

      {/* Section avantages détaillés */}
      <motion.section className="py-20 bg-white" {...fadeInUp}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Tout ce que tu auras dès le 1er mois
            </motion.h2>
            <motion.p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Plus de 185€ de valeur pour 12,99€ le premier mois !
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Calendar,
                title: "Événements premium",
                description: "2-3 événements par mois : apéros, ateliers, masterclass",
                value: "25€/mois"
              },
              {
                icon: MonitorPlay,
                title: "Masterclass expertes",
                description: "Sessions exclusives développement personnel et business",
                value: "30€/mois"
              },
              {
                icon: Gift,
                title: "ConcoursBox surprise trimestrielle",
                description: "Produits lifestyle et bien-être livrés chez toi",
                value: "30€-100€/trimestre"
              },
              {
                icon: Star,
                title: "Réductions exclusives",
                description: "Jusqu'à -70% chez nos partenaires sélectionnés",
                value: "50€+ d'économies par mois"
              },
              {
                icon: Users,
                title: "Communauté active",
                description: "Groupe privé, partage de bons plans, créer son crew",
                value: "50€/mois"
              },
              {
                icon: Send,
                title: "Newsletter hebdomadaire",
                description: "\"Kiff du jour\" avec les meilleurs bons plans",
                value: "25€/mois"
              },
              {
                icon: Plane,
                title: "Séjours entre filles",
                description: "Accès aux weekends et séjours organisés",
                value: "Variable"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
                {...fadeInUp}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">{feature.title}</h3>
                    <span className="text-sm text-primary font-medium">{feature.value}</span>
                  </div>
                </div>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* FAQ Section */}
      <motion.section className="py-20 bg-gray-50" {...fadeInUp}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <motion.h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              Tes questions ? On te dit tout !
            </motion.h2>
          </div>
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <motion.div 
                key={index} 
                className="bg-white rounded-xl shadow-md overflow-hidden transform hover:scale-102 transition-all duration-300"
                {...fadeInUp} 
                transition={{ delay: index * 0.1 }}
              >
                <button
                  className="w-full text-left flex justify-between items-center p-6 text-lg font-semibold hover:text-primary transition-colors"
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                >
                  {item.question}
                  <ChevronDown className={`w-5 h-5 transition-transform ${activeFaq === index ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {activeFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6">
                        <p className="text-gray-600 leading-relaxed">{item.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Section Région */}
      <motion.section className="py-20 bg-primary/5" {...fadeInUp}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            Pas encore chez toi ? Fais-le venir !
          </motion.h2>
          <motion.p className="text-xl text-gray-600 mb-8">
            On commence à Paris et banlieue, mais ton kiff arrive bientôt partout. Dis-nous où tu es !
          </motion.p>
          
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto transform hover:scale-105 transition-all duration-300">
            <form onSubmit={handleRegionSubmit} className="space-y-4">
              <input
                type="email"
                value={regionForm.email}
                onChange={(e) => setRegionForm({ ...regionForm, email: e.target.value })}
                placeholder="Ton email"
                className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <select
                value={regionForm.region}
                onChange={(e) => setRegionForm({ ...regionForm, region: e.target.value })}
                className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">Ta région ?</option>
                {regions.map((region) => (
                  <option key={region.value} value={region.value}>{region.label}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-3 bg-primary text-white rounded-full font-semibold hover:bg-primary-dark transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Envoi..." : "Je veux être prévenue !"}
              </button>
            </form>
          </div>
        </div>
      </motion.section>

      {/* CTA Final */}
      <motion.section className="py-20 bg-gradient-to-r from-primary to-secondary text-white relative overflow-hidden" {...fadeInUp}>
        <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2 className="text-3xl md:text-4xl font-bold mb-6">
            Prête à reprendre le contrôle de ta vie ?
          </motion.h2>
          
          <motion.p className="text-xl mb-8 opacity-90">
            Rejoins les 100+ femmes qui ont déjà dit STOP à la routine et OUI au kiff !
          </motion.p>

          <motion.div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={getActionLink('monthly')}
              className="inline-flex items-center px-8 py-4 bg-white text-primary rounded-full font-bold text-lg hover:bg-gray-100 transform hover:scale-105 transition-all duration-300 shadow-lg"
            >
              <Heart className="w-5 h-5 mr-2" />
              {isSubscriber ? 'Voir mon compte' : isAuthenticated ? 'Continuer vers le paiement' : 'Je commence à 12,99€'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            
            {!isSubscriber && (
              <Link
                to={getActionLink('yearly')}
                className="inline-flex items-center px-8 py-4 bg-primary-dark text-white rounded-full font-bold text-lg hover:bg-primary transform hover:scale-105 transition-all duration-300 shadow-lg"
              >
                <Star className="w-5 h-5 mr-2" />
                {isAuthenticated ? 'Continuer (annuel)' : 'Je choisis l\'annuel'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            )}
          </motion.div>
          
          <div className="flex items-center justify-center space-x-6 text-sm opacity-90 mt-6">
            <div className="flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              <span>Sans engagement pour l'abonnement mensuel</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span>Résiliation en 1 clic</span>
            </div>
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              <span>100+ membres actives</span>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}