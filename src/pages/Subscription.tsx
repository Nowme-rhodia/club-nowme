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
  Plane
} from 'lucide-react';
import { SEO } from '../components/SEO';
import { submitRegionRequest } from '../lib/regions';
import toast from 'react-hot-toast';
import { useAuth } from '../lib/auth'; // Imported from original Subscription.tsx
// Importing pricing data to keep source of truth, even if used physically in the layout
import { PRICING_TIERS, YEARLY_SAVINGS } from '../data/pricing';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

export default function Subscription() {
  // Logic from original Subscription.tsx
  const { isAuthenticated, isSubscriber } = useAuth();

  const [regionForm, setRegionForm] = useState({ email: '', region: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [selectedTestimonial, setSelectedTestimonial] = useState<number | null>(null);

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

  // Helper from original Subscription.tsx
  const getActionLink = (plan: 'monthly' | 'yearly' = 'monthly') => {
    if (isSubscriber) {
      return '/account';
    }
    if (isAuthenticated) {
      return `/checkout?plan=${plan}`;
    }
    return `/auth/signup?plan=${plan}`;
  };

  const getActionText = (defaultText: string) => {
    if (isSubscriber) return 'Voir mon compte';
    if (isAuthenticated) return 'Continuer vers le paiement';
    return defaultText;
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

  const testimonials = [
    {
      name: "Sophie, 32 ans",
      role: "Maman entrepreneur",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
      quote: "Grâce à Nowme, j'ai découvert un spa incroyable à -40% et rencontré 3 super copines lors de l'apéro mensuel ! Maintenant on se fait des sorties ensemble chaque semaine.",
      highlight: "3 nouvelles amitiés + 150€ économisés",
      fullStory: "J'étais nouvelle sur Paris et je ne connaissais personne. En 3 mois avec Nowme, j'ai trouvé ma tribu ! Les apéros mensuels sont géniaux pour rencontrer du monde, et les réductions m'ont fait découvrir des endroits que je n'aurais jamais osé essayer. La box du dernier trimestre était dingue avec des produits locaux que j'adore maintenant."
    },
    {
      name: "Emma, 28 ans",
      role: "Cadre en reconversion",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150",
      quote: "Les événements Nowme sont toujours au top ! Atelier poterie, dégustation de vins, soirée salsa... J'ai enfin un agenda qui me fait vibrer !",
      highlight: "Agenda qui pétille",
      fullStory: "Avant Nowme, mes weekends c'était Netflix et canapé. Maintenant j'ai découvert la poterie (ma nouvelle passion !), j'ai appris la salsa, et je teste un nouveau resto chaque mois grâce aux réductions. Ma vie sociale a explosé et je me sens tellement plus épanouie !"
    },
    {
      name: "Julie, 35 ans",
      role: "Maman active",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
      quote: "12,99€ pour tester, puis j'ai vu la valeur : 39,99€ c'est donné pour tout ça ! Les séjours entre filles, un rêve devenu réalité.",
      highlight: "Séjours de rêve",
      fullStory: "Le premier séjour Nowme en Normandie était magique ! 3 jours entre filles, activités incluses, hébergement de qualité, et tout ça à un prix défiant toute concurrence. J'ai rencontré des femmes extraordinaires de toute la France. On a créé un groupe WhatsApp et on se revoit régulièrement !"
    }
  ];

  const faqItems = [
    {
      question: "Pourquoi 12,99€ puis 39,99€ ?",
      answer: "Le 1er mois à 12,99€ te permet de découvrir la communauté et les premiers avantages sans risque. Ensuite, 39,99€ te donne accès à TOUT : événements premium, box trimestrielle, apéros mensuels, séjours entre filles, carte interactive (Bientôt)... Plus de 120€ de valeur réelle !"
    },
    {
      question: "Qu'est-ce que j'ai concrètement chaque mois ?",
      answer: "Dès le 1er mois : réductions jusqu'à -50% + 1 événement découverte + groupe WhatsApp + newsletter. À partir du 2ème : tout ça PLUS événements premium + box trimestrielle + apéros mensuels + carte interactive (Bientôt) + séjours entre filles + service conciergerie !"
    },
    {
      question: "Je peux annuler quand ?",
      answer: "Quand tu veux ! Résiliation en 1 clic depuis ton compte, sans justification. Tu gardes l'accès jusqu'à la fin de ton mois payé. Aucun engagement, aucune contrainte."
    },
    {
      question: "C'est où exactement ?",
      answer: "Pour l'instant, nos événements se déroulent dans tous les départements d'Île-de-France. On arrive très vite dans toute la France ! Inscris-toi pour être la première informée quand on débarque chez toi."
    },
    {
      question: "Et si je ne connais personne ?",
      answer: "C'est fait pour ça ! 90% de nos membres ne connaissaient personne au début. Les apéros mensuels et la carte interactive (Bientôt) sont parfaits pour rencontrer des femmes qui te ressemblent près de chez toi."
    },
    {
      question: "Les séjours entre filles, comment ça marche ?",
      answer: "2-3 fois par an, on organise des weekends ou séjours dans toute la France. Hébergement, activités, repas : tout est inclus à prix membre. Tu peux venir seule, tu repartiras avec des copines !"
    }
  ];

  const TestimonialModal = ({ testimonial, onClose }: { testimonial: typeof testimonials[0]; onClose: () => void }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative">
          <div className="bg-gradient-to-r from-primary to-secondary p-8 text-white">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              <img
                src={testimonial.image}
                alt={testimonial.name}
                className="w-20 h-20 rounded-full object-cover border-4 border-white/20"
              />
              <div>
                <h3 className="text-2xl font-bold">{testimonial.name}</h3>
                <p className="text-white/90">{testimonial.role}</p>
                <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-semibold mt-2">
                  {testimonial.highlight}
                </span>
              </div>
            </div>

            {/* Early CTA */}
            <div className="mt-8 flex justify-center md:justify-start gap-4">
              <button
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-primary text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
              >
                Je rejoins le club
              </button>
            </div>
          </div>

          <div className="p-8">
            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
              ))}
            </div>
            <p className="text-gray-700 text-lg leading-relaxed mb-6">
              "{testimonial.fullStory}"
            </p>
            <Link
              to={getActionLink('monthly')}
              className="block w-full text-center px-6 py-3 bg-primary text-white rounded-full font-semibold hover:bg-primary-dark transition-colors"
            >
              {getActionText('Moi aussi je veux cette vie ! (12,99€)')}
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Sticky Top Banner */}
      <div className="sticky top-0 z-50 bg-red-50 border-b border-red-100 text-red-800 text-center py-4 px-6 text-base md:text-lg font-bold shadow-sm">
        📍 ATTENTION : Disponible uniquement en Île-de-France pour l'instant (bientôt chez toi !)
      </div>
      <SEO
        title="Sorties entre filles & Club Privé - Nowme"
        description="Rejoins le club n°1 des sorties entre filles en Île-de-France. Événements, business, amitié et bons plans !"
      />

      {/* Hero Section - Design asymétrique */}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Texte principal */}
            <motion.div {...fadeInUp}>
              <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full text-primary font-semibold mb-6 transform rotate-1">
                <Users className="w-4 h-4 mr-2" />
                Plus de 500 femmes kiffent déjà avec nous
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Stop à la routine,{' '}
                <span className="text-primary relative">
                  place au kiff quotidien !
                  <svg className="absolute -bottom-2 left-0 w-full h-3" viewBox="0 0 200 12" fill="none">
                    <path d="M2 10C50 2 150 2 198 10" stroke="#E4D44C" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-700 mb-8 leading-relaxed">
                Rejoins une communauté de femmes qui découvrent des expériences incroyables,
                partagent leurs bons plans et se soutiennent pour kiffer la vie ensemble.
              </p>

              {/* Prix en évidence */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-lg transform -rotate-1">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">1er mois</div>
                      <div className="text-4xl font-bold text-primary">12,99€</div>
                      <div className="text-xs text-gray-500">Pour tout découvrir</div>
                    </div>
                    <div className="text-2xl text-gray-400">→</div>
                    <div className="text-center">
                      <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">Puis</div>
                      <div className="text-4xl font-bold text-gray-900">39,99€</div>
                      <div className="text-xs text-gray-500">Accès premium complet</div>
                    </div>
                  </div>
                  <p className="text-primary font-semibold bg-primary/10 rounded-lg p-3">
                    🎯 Plus de 120€ de valeur pour 39,99€ !
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to={getActionLink('monthly')}
                  className="inline-flex items-center px-8 py-4 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-semibold text-lg hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  {getActionText('Je teste maintenant !')}
                </Link>
                <p className="text-sm text-gray-600 self-center">
                  ✨ Annulable à tout moment (mensuel) • Résiliation en 1 clic
                </p>
              </div>
            </motion.div>

            {/* Images décalées */}
            <motion.div
              className="relative"
              {...fadeInUp}
              transition={{ delay: 0.3 }}
            >
              <div className="relative">
                {/* Image principale */}
                <div className="transform rotate-3 hover:rotate-0 transition-transform duration-500">
                  <img
                    src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=600"
                    alt="Femmes qui rient ensemble"
                    className="rounded-2xl shadow-2xl"
                  />
                </div>

                {/* Petites images flottantes */}
                <div className="absolute -top-8 -right-8 transform -rotate-12 hover:rotate-0 transition-transform duration-500">
                  <img
                    src="https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=200"
                    alt="Spa détente"
                    className="w-32 h-32 rounded-xl shadow-lg object-cover border-4 border-white"
                  />
                </div>

                <div className="absolute -bottom-6 -left-6 transform rotate-12 hover:rotate-0 transition-transform duration-500">
                  <img
                    src="https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=200"
                    alt="Atelier créatif"
                    className="w-28 h-28 rounded-xl shadow-lg object-cover border-4 border-white"
                  />
                </div>

                {/* Bulle de témoignage */}
                <div className="absolute -bottom-4 right-4 bg-white p-4 rounded-xl shadow-lg max-w-xs transform rotate-2">
                  <p className="text-sm font-semibold text-gray-900">"Enfin des copines qui me comprennent !"</p>
                  <p className="text-xs text-gray-600">- Marie, membre depuis 6 mois</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Section "Avant/Après" - Design en zigzag */}
      <motion.section className="py-20 bg-gray-50" {...fadeInUp}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Tu te reconnais dans ces situations ?
            </motion.h2>
            <motion.p className="text-xl text-gray-600 max-w-3xl mx-auto">
              On a toutes vécu ça... Mais maintenant, on a trouvé la solution ensemble.
            </motion.p>
          </div>

          <div className="space-y-20">
            {/* Problème 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div {...fadeInUp}>
                <div className="transform -rotate-2 hover:rotate-0 transition-transform duration-500">
                  <img
                    src="https://images.unsplash.com/photo-1551836022-deb4988cc6c0?auto=format&fit=crop&q=80&w=600"
                    alt="Femme qui s'ennuie"
                    className="rounded-2xl shadow-lg"
                  />
                </div>
              </motion.div>
              <motion.div {...fadeInUp} transition={{ delay: 0.2 }}>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  😩 "Je galère à trouver des plans sympas"
                </h3>
                <p className="text-gray-600 mb-6">
                  Entre les avis bidons sur internet et les recommandations de ta belle-mère,
                  tu ne sais plus où donner de la tête. Tu finis toujours dans les mêmes endroits...
                </p>
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded transform rotate-1">
                  <p className="text-red-700 font-semibold">
                    ✗ Résultat : Tu t'ennuies et tu passes à côté de pépites près de chez toi
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Solution 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div className="lg:order-2" {...fadeInUp}>
                <div className="transform rotate-2 hover:rotate-0 transition-transform duration-500">
                  <img
                    src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=600"
                    alt="Femmes heureuses découvrant"
                    className="rounded-2xl shadow-lg"
                  />
                </div>
              </motion.div>
              <motion.div className="lg:order-1" {...fadeInUp} transition={{ delay: 0.2 }}>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  ✨ Avec Nowme : Des expériences testées et approuvées
                </h3>
                <p className="text-gray-600 mb-6">
                  2000+ femmes qui ont participé à nos événements, partagent leurs découvertes et te donnent les vrais bons plans.
                  Chaque expérience est validée par la communauté !
                </p>
                <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded transform -rotate-1">
                  <p className="text-green-700 font-semibold">
                    ✓ Résultat : Tu découvres des pépites et tu kiffes à chaque sortie
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Problème 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div {...fadeInUp}>
                <div className="transform -rotate-1 hover:rotate-0 transition-transform duration-500">
                  <img
                    src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600"
                    alt="Femme seule"
                    className="rounded-2xl shadow-lg"
                  />
                </div>
              </motion.div>
              <motion.div {...fadeInUp} transition={{ delay: 0.2 }}>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  😔 "Je n'ai personne avec qui sortir"
                </h3>
                <p className="text-gray-600 mb-6">
                  Tes copines sont occupées, ton mec n'est pas chaud pour tes activités...
                  Tu finis par rester chez toi et scroller sur ton canapé.
                </p>
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded transform rotate-1">
                  <p className="text-red-700 font-semibold">
                    ✗ Résultat : Tu t'isoles et tu rates des moments de bonheur
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Solution 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div className="lg:order-2" {...fadeInUp}>
                <div className="transform rotate-1 hover:rotate-0 transition-transform duration-500">
                  <img
                    src="https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&q=80&w=600"
                    alt="Groupe d'amies"
                    className="rounded-2xl shadow-lg"
                  />
                </div>
              </motion.div>
              <motion.div className="lg:order-1" {...fadeInUp} transition={{ delay: 0.2 }}>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  🎉 Avec Nowme : Toujours des copines dispo
                </h3>
                <p className="text-gray-600 mb-6">
                  Communauté active, apéros mensuels, carte interactive (Bientôt) pour trouver
                  des membres près de chez toi... Fini la galère pour trouver quelqu'un !
                </p>
                <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded transform -rotate-1">
                  <p className="text-green-700 font-semibold">
                    ✓ Résultat : Tu as toujours des copines pour t'accompagner
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Section "Scientific Fact" (Reordered) */}
      <motion.section className="py-16 bg-blue-900 text-white relative overflow-hidden" {...fadeInUp}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1543807535-eceef0bc6599?auto=format&fit=crop&q=80")', backgroundSize: 'cover', backgroundPosition: 'center', mixBlendMode: 'overlay' }}></div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">🧠 Le savais-tu ?</h2>
          <div className="text-xl md:text-2xl font-medium mb-8 leading-relaxed">
            Un enfant rit en moyenne <span className="text-yellow-400 font-bold text-4xl">400</span> fois par jour.<br />
            Un adulte ? Seulement <span className="text-red-400 font-bold text-4xl">20</span> fois.
          </div>
          <p className="text-lg text-blue-100 mb-8">
            La solitude urbaine et la routine tuent notre joie de vivre. <br />
            Rejoins une <strong className="text-yellow-300">communauté prouvée et approuvée par 500+ membres</strong> pour booster ton bonheur.
          </p>
          <Link
            to={getActionLink('monthly')}
            className="inline-flex items-center px-8 py-4 bg-white text-blue-900 rounded-full font-bold text-lg hover:bg-gray-100 transform hover:scale-105 transition-all duration-300 shadow-lg"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {getActionText('Je veux rire plus !')}
          </Link>
        </div>
      </motion.section>

      {/* Section Nowme Philosophy */}
      <motion.section className="relative pt-20 pb-0 overflow-hidden" {...fadeInUp}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              <span className="text-primary">Nowme</span> = <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent italic">Maintenant Moi</span>.<br />
            </h1>
            <p className="text-2xl text-gray-700 font-medium mb-8">
              C'est ton moment. Tu mérites de kiffer à fond, sans culpabiliser.
              <br /><span className="text-gray-500 text-lg font-normal">On s'occupe de tout, tu n'as plus qu'à profiter.</span>
            </p>
            <motion.h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Concrètement, qu'est-ce que tu auras ?
            </motion.h2>
            <motion.p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Tout pour booster ta vie sociale, pro et perso.
            </motion.p>
          </div>

          {/* Marquee des Kiffs - Moved here as per plan */}
          <div className="relative mb-16 overflow-hidden">
            <div className="flex gap-4 animate-scroll whitespace-nowrap">
              {['🍸 Apéros', '🧗‍♀️ Aventure', '🧘‍♀️ Bien-être', '🎨 Ateliers Créatifs', '🎭 Culture', '🍽️ Restos', '✈️ Voyages', '💃 Danse', '🎤 Karaoké', '🧖‍♀️ Spa', '🛍️ Shopping', '🍷 Dégustation', '🎢 Parcs', '🎬 Ciné', '📚 Book Club'].map((kiff, i) => (
                <span key={i} className="inline-block px-6 py-2 bg-white rounded-full border border-gray-200 text-gray-600 font-medium shadow-sm">
                  {kiff}
                </span>
              ))}
              {['🍸 Apéros', '🧗‍♀️ Aventure', '🧘‍♀️ Bien-être', '🎨 Ateliers Créatifs', '🎭 Culture', '🍽️ Restos', '✈️ Voyages', '💃 Danse', '🎤 Karaoké', '🧖‍♀️ Spa', '🛍️ Shopping', '🍷 Dégustation', '🎢 Parcs', '🎬 Ciné', '📚 Book Club'].map((kiff, i) => (
                <span key={i} className="inline-block px-6 py-2 bg-white rounded-full border border-gray-200 text-gray-600 font-medium shadow-sm">
                  {kiff}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
            {/* Feature 1 */}
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4 text-white">
                <Star className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Events & Séjours</h3>
              <p className="text-gray-600 text-sm">
                Les événements officiels Nowme (Masterclass, Ateliers, Soirées) sont à <strong>moitié prix</strong> pour les abonnées.
                <br /><span className="text-blue-600 font-bold text-xs mt-2 block bg-blue-100/50 p-1 rounded">Ex: Soirée Rooftop (40€ public ➔ 20€ membre) = Rentabilisé direct !</span>
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-purple-50 rounded-2xl p-6 border border-purple-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-4 text-white">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Apéros & Discussions</h3>
              <p className="text-gray-600 text-sm">
                Apéros en ligne mensuels, discussions thématiques sur le groupe privé. On parle de tout, sans tabou.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-pink-50 rounded-2xl p-6 border border-pink-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-pink-500 rounded-xl flex items-center justify-center mb-4 text-white">
                <Coffee className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Business & Networking</h3>
              <p className="text-gray-600 text-sm">
                Rencontre des femmes inspirantes, échange des conseils pro et booste ta carrière ou ton projet.
              </p>
            </div>

            {/* Feature 4 copy */}
            <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center mb-4 text-white">
                <Gift className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Concours Box</h3>
              <p className="text-gray-600 text-sm">
                Chaque trimestre, participe au grand concours pour gagner une Box Surprise (valeur 30€-100€) !
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-green-50 rounded-2xl p-6 border border-green-100 hover:shadow-lg transition-all feature-card">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mb-4 text-white">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Sorties entre filles</h3>
              <p className="text-gray-600 text-sm">
                L'activité phare de Nowme : ne reste plus jamais seule le week-end. Trouve ta squad près de chez toi.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-orange-50 rounded-2xl p-6 border border-orange-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mb-4 text-white">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Réductions Exclusives</h3>
              <p className="text-gray-600 text-sm">
                Jusqu'à -50% chez nos partenaires bien-être, mode et lifestyle testés par la communauté.
              </p>
            </div>

          </div>
        </div>
      </motion.section>

      {/* Second IDF Warning */}
      <div className="bg-yellow-50 border-t border-b border-yellow-100 text-yellow-800 text-center py-4 px-4 text-base font-semibold shadow-sm">
        ⚠️ Rappel : Nos événements sont actuellement concentrés en Île-de-France. Mais on arrive vite chez toi !
      </div>

      {/* Section FUTURE */}
      <motion.section className="py-16 bg-gradient-to-r from-gray-900 to-gray-800 text-white overflow-hidden relative" {...fadeInUp}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-3xl font-bold mb-8">🚀 Et ce n'est que le début...</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="text-2xl mb-2">🇫🇷</div>
              <h3 className="font-bold text-lg mb-2">Tour de France</h3>
              <p className="text-white/80 text-sm">Arrivée prévue dans toutes les grandes villes (Lyon, Bordeaux, Lille...) très bientôt.</p>
            </div>
            <div className="p-6 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="text-2xl mb-2">📱</div>
              <h3 className="font-bold text-lg mb-2">App Mobile</h3>
              <p className="text-white/80 text-sm">En attendant l'app officielle, notre communauté ultra-active est sur WhatsApp !</p>
            </div>
            <div className="p-6 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="text-2xl mb-2">🎓</div>
              <h3 className="font-bold text-lg mb-2">Academy</h3>
              <p className="text-white/80 text-sm">Un programme complet de formation et de mentoring pour celles qui veulent lancer leur projet.</p>
            </div>
            <div className="p-6 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 md:col-span-3 text-center">
              <div className="text-2xl mb-2">✨</div>
              <h3 className="font-bold text-lg mb-2">Et bien plus encore...</h3>
              <p className="text-white/80 text-sm">Voyages internationaux, partenariats grandes marques, festivals Nowme... On voit grand !</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Témoignages - Mosaïque cliquable (MOVED UP) */}
      <motion.section className="py-20 bg-gradient-to-br from-primary/5 to-secondary/5" {...fadeInUp}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Elles ont osé franchir le pas...
            </motion.h2>
            <motion.p className="text-xl text-gray-600">
              Et maintenant, elles kiffent leur vie ! Clique pour lire leur histoire complète.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                className={`
                  bg-white p-6 rounded-2xl shadow-lg cursor-pointer relative
                  ${index === 1 ? 'md:transform md:translate-y-8' : ''}
                  ${index === 2 ? 'lg:transform lg:-translate-y-4' : ''}
                `}
                {...fadeInUp}
                transition={{ delay: index * 0.2 }}
                whileHover={{ scale: 1.02, rotate: index % 2 === 0 ? 1 : -1 }}
                onClick={() => setSelectedTestimonial(index)}
              >
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-primary/20 shadow-md"
                  />
                  <div>
                    <h3 className="font-bold text-gray-900">{testimonial.name}</h3>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                    <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full mt-1">
                      {testimonial.highlight}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 italic leading-relaxed">"{testimonial.quote}"</p>
                <div className="absolute top-4 right-4 text-4xl text-primary/20">"</div>
                <div className="mt-4 text-center">
                  <span className="text-primary text-sm font-medium">Cliquer pour lire l'histoire complète →</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Section "Founding Member" (New) */}
      <motion.section className="py-16 bg-gradient-to-r from-pink-50 to-white" {...fadeInUp}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <span className="inline-block px-4 py-1 rounded-full bg-pink-100 text-pink-600 font-bold text-sm mb-4">👑 Deviens une Pionnière</span>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">On ne te vend pas juste un abonnement.</h2>
          <p className="text-xl text-gray-600 mb-8">
            On t'invite à <strong>construire avec nous</strong> la communauté dont tu as toujours rêvé.<br />
            Celle où l'on se soutient, où l'on rit aux éclats, et où l'on grandit ensemble.
            Fais partie des premières à écrire l'histoire de Nowme.
          </p>
          <Link
            to={getActionLink('monthly')}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full font-bold text-lg hover:shadow-lg transform hover:scale-105 transition-all duration-300"
          >
            <Heart className="w-5 h-5 mr-2" />
            {getActionText('Je rejoins l\'aventure !')}
          </Link>
        </div>
      </motion.section>

      {/* Section Pricing - Design central avec éléments flottants */}
      <motion.section id="pricing" className="py-20 bg-white relative overflow-hidden" {...fadeInUp}>
        {/* Éléments décoratifs */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-primary/5 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-secondary/5 rounded-full blur-2xl"></div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            Prête à rejoindre l'aventure ?
          </motion.h2>
          <motion.p className="text-xl text-gray-600 mb-12">
            Teste d'abord, kiffe ensuite ! Premier mois découverte puis accès à tout le premium.
          </motion.p>

          {/* Deux options claires: Mensuel vs Annuel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">

            {/* Option Mensuelle */}
            <motion.div
              className="bg-white rounded-3xl p-8 border-2 border-primary/20 relative flex flex-col hover:shadow-xl transition-shadow duration-300"
              whileHover={{ y: -5 }}
            >
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <span className="px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wide">
                  Sans engagement
                </span>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">Liberté Totale</h3>
              <div className="text-4xl font-bold text-gray-900 mb-1">12,99€</div>
              <div className="text-sm text-gray-500 mb-6 font-medium">le 1er mois, puis 39,99€/mois</div>

              {/* Value Stack Visual */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Ce que tu économises (réel) :</div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Events & Séjours</span>
                  <span className="font-semibold text-gray-900">25€/mois</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Concours Box</span>
                  <span className="font-semibold text-gray-900">10€/mois</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Réductions</span>
                  <span className="font-semibold text-gray-900">50€+/mois</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Communauté (WhatsApp)</span>
                  <span className="font-semibold text-gray-900">35€/mois</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between items-center mt-2">
                  <span className="font-bold text-primary">Valeur Totale</span>
                  <span className="font-bold text-primary text-lg">120€+/mois</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start text-sm"><Check className="w-5 h-5 text-green-500 mr-2 shrink-0" /> <span>Accès complet immédiat</span></li>
                <li className="flex items-start text-sm"><Check className="w-5 h-5 text-green-500 mr-2 shrink-0" /> <span>Events partout en Île-de-France</span></li>
                <li className="flex items-start text-sm"><Check className="w-5 h-5 text-green-500 mr-2 shrink-0" /> <span className="font-bold">Masterclass & Apéros offerts</span></li>
                <li className="flex items-start text-sm"><Check className="w-5 h-5 text-green-500 mr-2 shrink-0" /> <span>Concours Box trimestriel</span></li>
                <li className="flex items-start text-sm"><Check className="w-5 h-5 text-green-500 mr-2 shrink-0" /> <span>Communauté WhatsApp (App bientôt !)</span></li>
              </ul>

              <Link
                to={getActionLink('monthly')}
                className="block w-full text-center px-6 py-3 rounded-full bg-white border-2 border-primary text-primary font-bold hover:bg-primary hover:text-white transition-all"
              >
                {isSubscriber ? 'Voir mon compte' : isAuthenticated ? 'Choisir le mensuel' : 'Je teste (12,99€)'}
              </Link>
            </motion.div>

            {/* Option Annuelle */}
            <motion.div
              className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl p-8 border-2 border-primary relative flex flex-col hover:shadow-2xl transition-all duration-300 transform scale-105 z-10"
              whileHover={{ y: -5 }}
            >
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full text-center">
                <span className="px-6 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-full text-sm font-bold shadow-lg animate-pulse">
                  ✨ OFFRE POPULAIRE ✨
                </span>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">Club VIP Annuel</h3>
              <div className="text-4xl font-bold text-primary mb-1">399€</div>
              <div className="text-sm text-gray-600 mb-6 font-medium">
                par an (soit <span className="text-green-600 font-bold">2 mois offerts !</span>)
              </div>

              {/* Value Stack Visual */}
              <div className="bg-white/60 rounded-xl p-4 mb-6 space-y-3">
                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Ta valeur ajoutée annuelle :</div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Valeur services (x12)</span>
                  <span className="font-semibold text-gray-900">1440€</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Bonus Séjours</span>
                  <span className="font-semibold text-green-600">+100€ OFF</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Économie abo</span>
                  <span className="font-semibold text-green-600">+80€</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between items-center mt-2">
                  <span className="font-bold text-primary">Valeur Réelle</span>
                  <span className="font-bold text-primary text-xl">1620€ / an</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start text-sm"><Check className="w-5 h-5 text-primary mr-2 shrink-0" /> <span className="font-bold">Tout du plan mensuel inclus</span></li>
                <li className="flex items-start text-sm"><Check className="w-5 h-5 text-primary mr-2 shrink-0" /> <span className="font-bold">100€ de réduction sur les séjours</span></li>
                <li className="flex items-start text-sm"><Check className="w-5 h-5 text-primary mr-2 shrink-0" /> <span>Cadeau d'anniversaire exclusif</span></li>
                <li className="flex items-start text-sm"><Check className="w-5 h-5 text-primary mr-2 shrink-0" /> <span>Accès prioritaire événements VIP</span></li>
              </ul>

              <Link
                to={getActionLink('yearly')}
                className="block w-full text-center px-6 py-4 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-bold text-lg hover:shadow-lg transition-all hover:scale-105"
              >
                {isSubscriber ? 'Passer en Annuel' : isAuthenticated ? 'Profiter des 1620€ de valeur' : 'Je veux la totale !'}
              </Link>
              <div className="text-center mt-3 text-xs text-gray-500">
                Paiement 100% sécurisé via Stripe • Satisfait ou remboursé.
              </div>
            </motion.div>

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



      <motion.section className="py-20 bg-gradient-to-r from-primary to-secondary text-white relative overflow-hidden" {...fadeInUp}>
        <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2 className="text-3xl md:text-4xl font-bold mb-6">
            Prête à reprendre le contrôle de ta vie ?
          </motion.h2>

          <motion.p className="text-xl mb-8 opacity-90">
            Rejoins les 2000+ femmes qui ont déjà dit STOP à la routine et OUI au kiff !
          </motion.p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              to={getActionLink('monthly')}
              className="inline-flex items-center px-8 py-4 bg-white text-primary rounded-full font-bold text-lg hover:bg-gray-100 transform hover:scale-105 transition-all duration-300 shadow-lg"
            >
              <Heart className="w-5 h-5 mr-2" />
              {getActionText('Je commence (Places Limitées)')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>

            <Link
              to={getActionLink('yearly')}
              className="inline-flex items-center px-8 py-4 bg-transparent border-2 border-white text-white rounded-full font-bold text-lg hover:bg-white/10 transform hover:scale-105 transition-all duration-300"
            >
              <Star className="w-5 h-5 mr-2" />
              Plan Annuel (399€)
            </Link>
          </div>
          <div className="text-white/80 text-sm flex items-center justify-center gap-4">
            <span className="flex items-center"><Shield className="w-4 h-4 mr-1" /> Paiement Sécurisé Stripe</span>
            <span className="flex items-center"><CheckCircle className="w-4 h-4 mr-1" /> Annulable en 1 clic</span>
          </div>
        </div>
      </motion.section>

      {/* Section Région (Moved Here) */}
      <motion.section className="py-12 bg-gray-50 border-t border-gray-200" {...fadeInUp}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2 className="text-2xl font-bold text-gray-900 mb-4">
            Pas encore chez toi ?
          </motion.h2>
          <motion.p className="text-gray-600 mb-6 text-sm">
            Si tu n'es pas en IDF, dis-nous où tu es pour qu'on arrive plus vite !
          </motion.p>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-md mx-auto">
            <form onSubmit={handleRegionSubmit} className="space-y-4">
              <input
                type="email"
                value={regionForm.email}
                onChange={(e) => setRegionForm({ ...regionForm, email: e.target.value })}
                placeholder="Ton email"
                className="w-full p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                required
              />
              <select
                value={regionForm.region}
                onChange={(e) => setRegionForm({ ...regionForm, region: e.target.value })}
                className="w-full p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary text-sm"
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
                className="w-full px-4 py-2 bg-gray-900 text-white rounded-full font-bold text-sm hover:bg-black transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Envoi..." : "Prévenez-moi"}
              </button>
            </form>
          </div>
        </div>
      </motion.section>

      {/* Testimonial Modal */}
      <AnimatePresence>
        {selectedTestimonial !== null && (
          <TestimonialModal
            testimonial={testimonials[selectedTestimonial]}
            onClose={() => setSelectedTestimonial(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}