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

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

export default function Subscription() {
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
      answer: "Le 1er mois à 12,99€ te permet de découvrir la communauté et les premiers avantages sans risque. Ensuite, 39,99€ te donne accès à TOUT : événements premium, box trimestrielle, apéros mensuels, séjours entre filles, carte interactive... Plus de 120€ de valeur réelle !"
    },
    {
      question: "Qu'est-ce que j'ai concrètement chaque mois ?",
      answer: "Dès le 1er mois : réductions jusqu'à -50% + 1 événement découverte + groupe WhatsApp + newsletter. À partir du 2ème : tout ça PLUS événements premium + box trimestrielle + apéros mensuels + carte interactive + séjours entre filles + service conciergerie !"
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
      answer: "C'est fait pour ça ! 90% de nos membres ne connaissaient personne au début. Les apéros mensuels et la carte interactive sont parfaits pour rencontrer des femmes qui te ressemblent près de chez toi."
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
              to="/checkout?plan=discovery"
              className="block w-full text-center px-6 py-3 bg-primary text-white rounded-full font-semibold hover:bg-primary-dark transition-colors"
            >
              Moi aussi je veux cette vie ! (12,99€)
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <SEO
        title="Nowme Club - Kiffe ta vie à prix mini"
        description="Rejoins une communauté de femmes qui découvrent, partagent et kiffent ensemble !"
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
                  to="/checkout?plan=discovery"
                  className="inline-flex items-center px-8 py-4 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-semibold text-lg hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Je teste maintenant !
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
                  Communauté active, apéros mensuels, carte interactive pour trouver
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

      {/* Section "Ce que tu auras" - Cartes flottantes */}
      <motion.section className="py-20 bg-white relative overflow-hidden" {...fadeInUp}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Concrètement, qu'est-ce que tu auras ?
            </motion.h2>
            <motion.p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Pas de blabla, que du concret pour transformer ton quotidien.
            </motion.p>
          </div>

          {/* Disposition libre des cartes */}
          <div className="relative min-h-[800px]">
            {/* Carte 1 - Découverte */}
            <motion.div
              className="absolute top-0 left-0 w-80 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 shadow-xl transform rotate-3 hover:rotate-0 transition-all duration-500 hover:scale-105"
              {...fadeInUp}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-bold">1</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Dès le 1er mois</h3>
              </div>
              <div className="text-center mb-4">
                <span className="text-3xl font-bold text-blue-600">12,99€</span>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center"><Check className="w-4 h-4 text-blue-500 mr-2" />Réductions jusqu'à -50%</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-blue-500 mr-2" />1 événement découverte</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-blue-500 mr-2" />Groupe WhatsApp actif</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-blue-500 mr-2" />Newsletter bons plans</li>
              </ul>
            </motion.div>

            {/* Carte 2 - Premium */}
            <motion.div
              className="absolute top-20 right-0 w-96 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-6 shadow-xl transform -rotate-2 hover:rotate-0 transition-all duration-500 hover:scale-105"
              {...fadeInUp}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-bold">2</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">À partir du 2ème mois</h3>
              </div>
              <div className="text-center mb-4">
                <span className="text-3xl font-bold text-primary">39,99€</span>
                <div className="text-sm text-gray-600">Valeur réelle : 120€+</div>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center"><Check className="w-4 h-4 text-primary mr-2" />Tout du niveau découverte +</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-primary mr-2" />2-3 événements premium/mois</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-primary mr-2" />Box partenaires trimestrielle</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-primary mr-2" />Apéros mensuels en ligne</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-primary mr-2" />Carte interactive membres</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-primary mr-2" />Séjours entre filles à prix réduits</li>
                <li className="flex items-center"><Check className="w-4 h-4 text-primary mr-2" />Service conciergerie</li>
              </ul>
            </motion.div>

            {/* Carte 3 - Box */}
            <motion.div
              className="absolute top-80 left-20 w-72 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-6 shadow-xl transform rotate-1 hover:rotate-0 transition-all duration-500 hover:scale-105"
              {...fadeInUp}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center mb-4">
                <Gift className="w-8 h-8 text-yellow-600 mr-3" />
                <h3 className="text-lg font-bold text-gray-900">Box Surprise</h3>
              </div>
              <p className="text-gray-600 mb-4 text-sm">
                Produits lifestyle, bons de réduction, découvertes locales... 30€ de valeur livrés chez toi !
              </p>
              <div className="bg-yellow-200 rounded-lg p-3">
                <p className="text-yellow-800 font-semibold text-sm">
                  📦 Tous les 3 mois dans ta boîte aux lettres
                </p>
              </div>
            </motion.div>

            {/* Carte 4 - Communauté */}
            <motion.div
              className="absolute top-60 right-20 w-80 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 shadow-xl transform -rotate-1 hover:rotate-0 transition-all duration-500 hover:scale-105"
              {...fadeInUp}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-center mb-4">
                <Users className="w-8 h-8 text-green-600 mr-3" />
                <h3 className="text-lg font-bold text-gray-900">Communauté Active</h3>
              </div>
              <p className="text-gray-600 mb-4 text-sm">
                Apéros mensuels, carte interactive, séjours entre filles... Trouve ta tribu !
              </p>
              <div className="bg-green-200 rounded-lg p-3">
                <p className="text-green-800 font-semibold text-sm">
                  👭 2000+ femmes qui vibrent ensemble
                </p>
              </div>
            </motion.div>

            {/* Spacer pour éviter le chevauchement */}
            <div className="h-96"></div>
          </div>
        </div>
      </motion.section>

      {/* Témoignages - Mosaïque cliquable */}
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

      {/* Section Pricing - Design central avec éléments flottants */}
      <motion.section id="plans" className="py-20 bg-white relative overflow-hidden" {...fadeInUp}>
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

          {/* Carte de pricing unique */}
          <motion.div
            className="bg-white rounded-3xl shadow-2xl p-8 border-2 border-primary/20 relative transform hover:scale-105 transition-all duration-500"
            {...fadeInUp}
          >
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
              <span className="px-6 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-full text-sm font-bold animate-pulse">
                ✨ OFFRE DÉCOUVERTE ✨
              </span>
            </div>

            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Nowme Club Premium</h3>
              <p className="text-gray-600">Tout l'accès, tarif progressif</p>
            </div>

            {/* Pricing visuel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="bg-blue-50 rounded-2xl p-6 transform rotate-1">
                <div className="text-center">
                  <div className="text-sm text-blue-600 uppercase tracking-wide mb-2">Mois 1 - Découverte</div>
                  <div className="text-4xl font-bold text-blue-600 mb-2">12,99€</div>
                  <div className="text-sm text-gray-600 mb-4">Pour tout tester sans risque</div>
                  <ul className="space-y-2 text-sm text-left">
                    <li className="flex items-center"><Check className="w-4 h-4 text-blue-500 mr-2" />Réductions jusqu'à -50%</li>
                    <li className="flex items-center"><Check className="w-4 h-4 text-blue-500 mr-2" />1 événement découverte</li>
                    <li className="flex items-center"><Check className="w-4 h-4 text-blue-500 mr-2" />Groupe WhatsApp</li>
                    <li className="flex items-center"><Check className="w-4 h-4 text-blue-500 mr-2" />Newsletter bons plans</li>
                  </ul>
                </div>
              </div>

              <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-6 transform -rotate-1">
                <div className="text-center">
                  <div className="text-sm text-primary uppercase tracking-wide mb-2">Dès le mois 2 - Premium</div>
                  <div className="text-4xl font-bold text-primary mb-2">39,99€</div>
                  <div className="text-sm text-gray-600 mb-4">Valeur réelle : 120€+</div>
                  <ul className="space-y-2 text-sm text-left">
                    <li className="flex items-center"><Check className="w-4 h-4 text-primary mr-2" />Tout du niveau découverte +</li>
                    <li className="flex items-center"><Check className="w-4 h-4 text-primary mr-2" />2-3 événements premium/mois</li>
                    <li className="flex items-center"><Check className="w-4 h-4 text-primary mr-2" />Box trimestrielle (30€)</li>
                    <li className="flex items-center"><Check className="w-4 h-4 text-primary mr-2" />Apéros mensuels en ligne</li>
                    <li className="flex items-center"><Check className="w-4 h-4 text-primary mr-2" />Carte interactive</li>
                    <li className="flex items-center"><Check className="w-4 h-4 text-primary mr-2" />Séjours entre filles</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 mb-6">
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-900 mb-1">💰 Calcul de la valeur premium :</p>
                <div className="flex justify-center items-center gap-2 text-xs text-gray-600 flex-wrap">
                  <span>Événements: 25€</span>
                  <span>•</span>
                  <span>Box: 30€</span>
                  <span>•</span>
                  <span>Apéros: 15€</span>
                  <span>•</span>
                  <span>Réductions: 50€+</span>
                </div>
                <p className="text-primary font-bold mt-1">= Plus de 120€ de valeur pour 39,99€ !</p>
              </div>
            </div>

            <Link
              to="/checkout?plan=discovery"
              className="block w-full text-center px-8 py-4 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-bold text-lg hover:shadow-lg transition-all transform hover:scale-105"
            >
              🚀 Je commence mon aventure Nowme !
            </Link>

            <p className="text-center text-xs text-gray-500 mt-4">
              Annulable à tout moment (mensuel) • Résiliation en 1 clic • Support 7j/7
            </p>
          </motion.div>
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
            On couvre déjà toute l'Île-de-France, et le kiff arrive bientôt dans toute la France. Dis-nous où tu es !
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
            Rejoins les 2000+ femmes qui ont déjà dit STOP à la routine et OUI au kiff !
          </motion.p>

          <motion.div className="space-y-6">
            <Link
              to="/checkout?plan=discovery"
              className="inline-flex items-center px-8 py-4 bg-white text-primary rounded-full font-bold text-lg hover:bg-gray-100 transform hover:scale-105 transition-all duration-300 shadow-lg"
            >
              <Heart className="w-5 h-5 mr-2" />
              Je teste maintenant à 12,99€
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>

            <div className="flex items-center justify-center space-x-6 text-sm opacity-90">
              <div className="flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Annulable à tout moment (mensuel)
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                Résiliation en 1 clic
              </div>
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                2000+ participantes
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Modales */}
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