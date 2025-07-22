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
      answer: "Le 1er mois à 12,99€ te permet de découvrir la communauté et les premiers avantages. Ensuite, 39,99€ te donne accès à TOUT : événements premium, box trimestrielle, masterclass, consultations... Plus de 120€ de valeur réelle !" 
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
      answer: "Paris et Île-de-France pour l'instant, avec extension prévue dans toute la France ! Dis-nous ta région pour être prévenue en priorité quand on arrive chez toi." 
    },
    { 
      question: "Et si je ne connais personne ?", 
      answer: "C'est fait pour ça ! 90% de nos membres ne connaissaient personne au début. Les apéros mensuels et la carte interactive sont parfaits pour rencontrer des femmes qui te ressemblent près de chez toi." 
    },
    { 
      question: "Les séjours entre filles, comment ça marche ?", 
      answer: "2-3 fois par an, on organise des weekends ou séjours dans toute la France. Hébergement, activités, repas : tout est inclus à prix membre. Tu peux venir seule, tu repartiras avec des copines !" 
    },
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
                    <path d="M2 10C50 2 150 2 198 10" stroke="#E4D44C" strokeWidth="3" strokeLinecap="round"/>
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
                  ✨ Sans engagement • Résiliation en 1 clic
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
              Sans engagement • Résiliation en 1 clic • Support 7j/7
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
            Rejoins les 500+ femmes qui ont déjà dit STOP à la routine et OUI au kiff !
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
                Sans engagement
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                Résiliation en 1 clic
              </div>
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                500+ membres actives
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

            <Users className="w-4 h-4 mr-2" />
            Plus de 500 femmes nous font déjà confiance
          </div>
          
          <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 animate-fade-in-down ${scrollY > 50 ? 'opacity-0' : 'opacity-100'}`}>
            Stop à la charge mentale,{' '}
            <span className="text-primary block">place au kiff quotidien !</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-8 animate-fade-in-up">
            Rejoins une communauté de femmes qui s'entraident, partagent leurs bons plans et se soutiennent au quotidien. 
            Parce que tu mérites mieux qu'une vie en mode survie.
          </p>
          
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 max-w-2xl mx-auto mb-8">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary mb-1">12,99€</div>
                <div className="text-sm text-gray-600">1er mois découverte</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 mb-1">39,99€</div>
                <div className="text-sm text-gray-600">Puis accès premium</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 mb-1">120€+</div>
                <div className="text-sm text-gray-600">Valeur réelle/mois</div>
              </div>
            </div>
          </div>
          
          <Link to="#plans" className="inline-flex items-center px-8 py-4 rounded-full bg-primary text-white font-semibold hover:bg-primary-dark transform hover:scale-105 transition-all animate-bounce-slow">
            <Sparkles className="w-5 h-5 mr-2" />
            Je teste maintenant (sans risque)
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
              <h3 className="text-xl font-semibold mb-2">Libre comme l'air</h3>
              <p className="text-gray-600">Résilie en 1 clic quand tu veux. Le kiff, c'est zéro contrainte.</p>
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
            Ton kiff, ton style, dès aujourd'hui
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map((category, index) => (
              <div
                key={index}
                onClick={() => setSelectedCategory(category)}
                className="group relative h-80 rounded-2xl overflow-hidden animate-slide-up cursor-pointer"
                style={{ animationDelay: `${index * 0.1}s` }}
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
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Nouvelle Section : Aujourd'hui & Demain */}
      <div className="py-20 bg-[#FDF8F4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12 animate-fade-in">
            Ton kiff aujourd'hui, encore plus demain
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Aujourd'hui */}
            <div className="space-y-6 animate-slide-up">
              <h3 className="text-2xl font-bold text-gray-900">Aujourd'hui, tu as :</h3>
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
            Ta tribu t'attend déjà !
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
            onClick={() => alert('Rejoins-nous après ton inscription !')}
            className="mt-6 inline-flex items-center px-6 py-3 bg-primary text-white rounded-full font-semibold hover:bg-primary-dark transition-all"
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
                    <li className="flex items-center text-sm"><Check className="w-4 h-4 text-primary mr-2" />Rituels audio quotidiens (3-5 min)</li>
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
                    <li className="flex items-center text-sm"><Check className="w-4 h-4 text-primary mr-2" />Hotline SOS écrite (réponse sous 24h)</li>
                    <li className="flex items-center text-sm"><Check className="w-4 h-4 text-primary mr-2" />Sessions live hebdo + replay</li>
                    <li className="flex items-center text-sm"><Check className="w-4 h-4 text-primary mr-2" />Audiothèque complète (stress, émotions, sommeil)</li>
                    <li className="flex items-center text-sm"><Check className="w-4 h-4 text-primary mr-2" />2-3 événements premium par mois</li>
                    <li className="flex items-center text-sm"><Check className="w-4 h-4 text-primary mr-2" />Box surprise trimestrielle (valeur 30€)</li>
                    <li className="flex items-center text-sm"><Check className="w-4 h-4 text-primary mr-2" />Masterclass exclusives avec expertes</li>
                    <li className="flex items-center text-sm"><Check className="w-4 h-4 text-primary mr-2" />Consultation bien-être gratuite/trimestre</li>
                    <li className="flex items-center text-sm"><Check className="w-4 h-4 text-primary mr-2" />Carte interactive pour rencontrer des membres</li>
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
                    <span>Hotline SOS: 20€</span>
                    <span>Audio: 15€</span>
                    <span>Événements: 25€</span>
                    <span>Masterclass: 20€</span>
                    <span>Réductions: 40€+</span>
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