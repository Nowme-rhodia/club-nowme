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

export default function Community() {
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
      answer: "Paris et Île-de-France pour l'instant, avec extension prévue dans toute la France ! Dis-nous ta région pour être prévenue en priorité quand on arrive chez toi." 
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
              to="/subscription"
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
        title="Communauté Nowme - Rejoins la tribu qui kiffe"
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
                  to="/subscription"
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

      {/* CTA Final */}
      <motion.section className="py-20 bg-gradient-to-r from-primary to-secondary text-white relative overflow-hidden" {...fadeInUp}>
        <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2 className="text-3xl md:text-4xl font-bold mb-6">
            Prête à rejoindre l'aventure ?
          </motion.h2>
          
          <motion.p className="text-xl mb-8 opacity-90">
            Rejoins les 500+ femmes qui ont déjà dit STOP à la routine et OUI au kiff !
          </motion.p>

          <motion.div className="space-y-6">
            <Link
              to="/subscription"
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