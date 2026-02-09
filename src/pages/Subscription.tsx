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
import { useAuth } from '../lib/auth';
import { PRICING_TIERS, YEARLY_SAVINGS } from '../data/pricing';
import { EventGallery } from '../components/EventGallery';
// import { VideoTestimonials } from '../components/VideoTestimonials';

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

  const faqItems = [
    {
      question: "Pourquoi 12,99€ puis 39,99€ ?",
      answer: "Le 1er mois est un cadeau de bienvenue pour te laisser tester l'ambiance sans engagement. Ensuite, les 39,99€ financent l'animation de la communauté, la recherche de partenaires (réductions), l'organisation des events et le développement de l'app. C'est un investissement sur ton épanouissement !"
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

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Sticky Top Banner */}
      <div className="sticky top-0 z-50 bg-red-50 border-b border-red-100 text-red-800 text-center py-4 px-6 text-base md:text-lg font-bold shadow-sm">
        📍 Actuellement ouvert en Île-de-France — Bientôt partout en France !
      </div>
      <SEO
        title="Sorties entre filles & Club Privé - Nowme"
        description="Rejoins le club n°1 des sorties entre filles en Île-de-France. Événements, amitié et bons plans !"
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
                Déjà plus de 2000 membres !
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

              <p className="text-lg sm:text-xl text-gray-700 mb-8 leading-relaxed font-medium">
                Rejoins le 1er Club privé pour femmes : sorties, nouvelles amies et réductions exclusives.
                <br />
                Ton pass pour kiffer non stop.
              </p>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    to={getActionLink('monthly')}
                    className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-bold text-lg hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    {getActionText('Je profite de mon cadeau à 12,99€')}
                  </Link>
                </div>

                {/* Anti-panic & Reassurance */}
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    ✨ 12,99€ le 1er mois • Sans engagement • Annulable en 1 clic
                  </p>

                  {/* 3 Bullets "Tout de suite" */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100 inline-block shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Tu as accès tout de suite :</p>
                    <ul className="grid grid-cols-1 gap-2">
                      <li className="flex items-center text-gray-700 text-sm font-medium">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" /> Agenda des sorties membres
                      </li>
                      <li className="flex items-center text-gray-700 text-sm font-medium">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" /> Groupe WhatsApp privé
                      </li>
                      <li className="flex items-center text-gray-700 text-sm font-medium">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" /> <strong>100+ Partenaires IDF (-50% Restos, Soins, Sport...)</strong>
                      </li>
                    </ul>
                  </div>
                </div>
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
                    src="https://plus.unsplash.com/premium_photo-1730157540298-82994f9336f4?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
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
                  <p className="text-xs text-gray-600">- Marie, Participante depuis 6 mois</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Section "Concrètement" (Feature Grid) - RESTORED */}
      <motion.section className="py-16 bg-white" {...fadeInUp}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto mb-12">
            <span className="inline-block px-4 py-1 rounded-full bg-blue-100 text-blue-600 font-bold text-sm mb-4">💎 Tout compris</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Ce qui est inclus dans ton abonnement
            </h2>
            <p className="text-xl text-gray-600">
              Un seul pass pour accéder à tout l'univers Nowme.
            </p>
          </div>

          {/* Marquee des Kiffs - Updated to Savings */}
          <div className="relative mb-12 overflow-hidden mask-linear-fade">
            <div className="flex gap-4 animate-scroll whitespace-nowrap">
              {['🍸 Cocktails -50%', '💆‍♀️ Massages -30%', '🧘‍♀️ Yoga -20%', '🥗 Brunchs Offerts', '💅 Manucure -15%', '🎭 Théâtre -50%', '🏋️‍♀️ Salle de Sport -20%', '🌿 Naturopathe -30%', '🛍️ Mode -15%'].map((kiff, i) => (
                <span key={i} className="inline-block px-6 py-2 bg-green-50 rounded-full border border-green-200 text-green-800 font-bold">
                  {kiff}
                </span>
              ))}
              {['🍸 Cocktails -50%', '💆‍♀️ Massages -30%', '🧘‍♀️ Yoga -20%', '🥗 Brunchs Offerts', '💅 Manucure -15%', '🎭 Théâtre -50%', '🏋️‍♀️ Salle de Sport -20%', '🌿 Naturopathe -30%', '🛍️ Mode -15%'].map((kiff, i) => (
                <span key={i} className="inline-block px-6 py-2 bg-green-50 rounded-full border border-green-200 text-green-800 font-bold">
                  {kiff}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 6 (Réductions) - Distinct Style - NOW FIRST & FULL WIDTH */}
            <div className="md:col-span-3 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-8 border-2 border-yellow-200 shadow-lg transform hover:scale-102 transition-all relative overflow-hidden group mb-4">
              <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-4 py-1 rounded-bl-xl shadow-sm">
                HOT 🔥 - LE PRÉFÉRÉ DES MEMBRES
              </div>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mb-4 md:mb-0 text-white shadow-md group-hover:rotate-12 transition-transform shrink-0">
                  <Heart className="w-8 h-8" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">100+ Partenaires : Tes Kiffs à -50%</h3>
                  <p className="text-gray-700 text-base mb-2">
                    On a cherché pour toi les meilleures adresses (Restos, Soins, Sport...) pour que tu puisses kiffer sans compter.
                    <br /><span className="text-sm text-gray-500">Plus besoin de chercher, on a rassemblé des partenaires qui veulent te gâter !</span>
                  </p>
                  <div className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold border border-orange-200">
                    <Euro className="w-3 h-3 mr-1" /> Econonomise 200€+/mois rien qu'avec ça
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 1 */}
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4 text-white">
                <Star className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Événements & Séjours</h3>
              <p className="text-gray-600 text-sm">
                Accès prioritaire aux événements officiels Nowme (Masterclass, Ateliers...) et aux séjours.
              </p>
            </div>

            {/* Feature 5 (Sorties) */}
            <div className="bg-green-50 rounded-2xl p-6 border border-green-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mb-4 text-white">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Sorties entre filles</h3>
              <p className="text-gray-600 text-sm">
                Trouve ta squad pour aller boire un verre, au ciné ou en rando près de chez toi.
              </p>
            </div>

            {/* Feature 6 (Réductions) MOVED TO TOP */}

            {/* Feature 2 (Apéros) */}
            <div className="bg-purple-50 rounded-2xl p-6 border border-purple-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-4 text-white">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Apéros & Discussions</h3>
              <p className="text-gray-600 text-sm">
                Rencontres mensuelles (en ligne ou physique) et accès au groupe privé pour papoter h24.
              </p>
            </div>

            {/* Feature 3 (Business) */}
            <div className="bg-pink-50 rounded-2xl p-6 border border-pink-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-pink-500 rounded-xl flex items-center justify-center mb-4 text-white">
                <Coffee className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Réseau Pro</h3>
              <p className="text-gray-600 text-sm">
                Élargis ton cercle, rencontre des femmes inspirantes et booste tes projets (Networking bienveillant).
              </p>
            </div>

            {/* Feature 4 (Box) */}
            <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center mb-4 text-white">
                <Gift className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Cadeaux & Programme Fidélité</h3>
              <p className="text-gray-600 text-sm">
                Concours trimestriels (Box valeur 100€) et surtout : <strong>Plus tu kiffes, plus tu es récompensée !</strong>
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Event Gallery */}
      <EventGallery />

      {/* Problem / Solution Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">On a toutes vécu ça...</h2>
            <p className="text-xl text-gray-600">Mais maintenant, on a trouvé la solution ensemble.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {/* Colonne Problème */}
            <div className="space-y-8">
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 opacity-80 hover:opacity-100 transition-opacity">
                <div className="flex items-start gap-4">
                  <span className="text-3xl grayscale">😩</span>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">"Je galère à trouver des plans sympas"</h3>
                    <p className="text-gray-600 text-sm">
                      Entre les avis bidons sur internet et les recommandations de ta belle-mère, tu ne sais plus où donner de la tête. Tu finis toujours dans les mêmes endroits...
                    </p>
                    <div className="mt-3 flex items-center text-red-500 font-bold text-sm">
                      <X className="w-4 h-4 mr-2" />
                      Résultat : Tu t'ennuies et tes weekends se ressemblent
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 opacity-80 hover:opacity-100 transition-opacity">
                <div className="flex items-start gap-4">
                  <span className="text-3xl grayscale">😔</span>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">"Je n'ai personne avec qui sortir"</h3>
                    <p className="text-gray-600 text-sm">
                      Tes copines sont occupées, en couple, ou casanières. Toi tu veux bouger, mais aller au resto seule, c'est pas ton truc.
                    </p>
                    <div className="mt-3 flex items-center text-red-500 font-bold text-sm">
                      <X className="w-4 h-4 mr-2" />
                      Résultat : Tu t'isoles et tu rates des moments de bonheur
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Colonne Solution (Nowme) */}
            <div className="space-y-8 relative">
              {/* Flèche de transition (Desktop only) */}
              <div className="hidden md:block absolute top-1/2 -left-6 transform -translate-y-1/2 -translate-x-1/2 z-10">
                <div className="bg-primary text-white p-2 rounded-full shadow-lg">
                  <ArrowRight className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-green-50 rounded-2xl p-6 border border-green-100 shadow-sm transform hover:scale-105 transition-transform duration-300">
                <div className="flex items-start gap-4">
                  <span className="text-3xl">✨</span>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">Avec Nowme : Des pépites validées</h3>
                    <p className="text-gray-600 text-sm">
                      2000+ femmes partagent leurs meilleures adresses. Chaque expérience est testée et approuvée par la communauté. Fini les mauvaises surprises !
                    </p>
                    <div className="mt-3 flex items-center text-green-600 font-bold text-sm">
                      <Check className="w-4 h-4 mr-2" />
                      Résultat : Tu découvres des lieux incroyables à chaque sortie
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-pink-50 rounded-2xl p-6 border border-pink-100 shadow-sm transform hover:scale-105 transition-transform duration-300">
                <div className="flex items-start gap-4">
                  <span className="text-3xl">👯‍♀️</span>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">Avec Nowme : Une bande de copines prête</h3>
                    <p className="text-gray-600 text-sm">
                      Poste une envie de sortie : tu as 5 copines motivées dans l'heure. Rejoins un événement : tu es accueillie comme une amie de toujours.
                    </p>
                    <div className="mt-3 flex items-center text-pink-600 font-bold text-sm">
                      <Check className="w-4 h-4 mr-2" />
                      Résultat : Tu te crées des souvenirs et des amitiés fortes
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Section "Concrètement" (Feature Grid) - RESTORED */}


      {/* Section "Pour qui ?" (Self-Selection) */}
      <motion.section className="py-16 bg-gray-50" {...fadeInUp}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block px-4 py-1 rounded-full bg-pink-100 text-pink-600 font-bold text-sm mb-4">👯‍♀️ L'esprit Club</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-10">
            Cet abonnement est fait pour toi si...
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transform hover:scale-105 transition-all duration-300">
              <div className="text-3xl mb-4">💃</div>
              <h3 className="font-bold text-gray-900 mb-2">Tu veux bouger</h3>
              <p className="text-gray-600 text-sm">
                Tu as envie de sortir, de tester des restos, des spés, des ateliers... mais tes copines sont souvent occupées ou casanières.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transform hover:scale-105 transition-all duration-300">
              <div className="text-3xl mb-4">🤝</div>
              <h3 className="font-bold text-gray-900 mb-2">Tu cherches du vrai lien</h3>
              <p className="text-gray-600 text-sm">
                Tu veux rencontrer des femmes bienveillantes, dans une ambiance 0 jugement, pour échanger, rire et te soutenir.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transform hover:scale-105 transition-all duration-300">
              <div className="text-3xl mb-4">💡</div>
              <h3 className="font-bold text-gray-900 mb-2">Tu es curieuse</h3>
              <p className="text-gray-600 text-sm">
                Tu aimes découvrir de nouvelles choses, apprendre, t'inspirer et tu n'as pas peur de sortir de ta zone de confort (un peu).
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transform hover:scale-105 transition-all duration-300">
              <div className="text-3xl mb-4">🚀</div>
              <h3 className="font-bold text-gray-900 mb-2">Tu veux évoluer</h3>
              <p className="text-gray-600 text-sm">
                Que ce soit pro ou perso, tu crois en la force du réseau féminin pour avancer plus vite et plus loin ensemble.
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Section "Ce mois-ci dans le Club" (AGENDA) */}
      <motion.section className="py-16 bg-white" {...fadeInUp}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1 rounded-full bg-purple-100 text-purple-600 font-bold text-sm mb-4">🗓️ Agenda Exclusif</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Ce mois-ci dans le Club...
            </h2>
            <p className="text-lg text-gray-600">
              Voici un aperçu de ce qui t'attend (et bien plus encore !)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Event 1 */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all group">
              <div className="h-48 overflow-hidden relative">
                <img src="https://images.unsplash.com/photo-1682760631807-71067eeea033?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="Cours de Danse" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute top-3 right-3 bg-white/90 px-3 py-1 rounded-full text-xs font-bold text-purple-600 shadow-sm">
                  18 Participants
                </div>
              </div>
              <div className="p-6">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">14 Février • 19h00</div>
                <h3 className="font-bold text-xl text-gray-900 mb-2">Cours de Bachata & Apéro</h3>
                <p className="text-gray-600 text-sm mb-4">Paris 11ème • Débutante bienvenue !</p>
                <div className="flex items-center text-primary font-bold text-sm">
                  <Star className="w-4 h-4 mr-1 fill-current" />
                  Gratuit abonnés <span className="text-gray-400 font-normal line-through ml-2">25€</span>
                </div>
              </div>
            </div>

            {/* Event 2 */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all group">
              <div className="h-48 overflow-hidden relative">
                <img src="https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=600" alt="Brunch" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute top-3 right-3 bg-white/90 px-3 py-1 rounded-full text-xs font-bold text-green-600 shadow-sm">
                  Complet
                </div>
              </div>
              <div className="p-6">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">16 Février • 11h30</div>
                <h3 className="font-bold text-xl text-gray-900 mb-2">Brunch & Talk "Confiance en soi"</h3>
                <p className="text-gray-600 text-sm mb-4">Le Marais • Avec coach invitée</p>
                <div className="flex items-center text-primary font-bold text-sm">
                  <Star className="w-4 h-4 mr-1 fill-current" />
                  35€ abonnés <span className="text-gray-400 font-normal line-through ml-2">55€</span>
                </div>
              </div>
            </div>

            {/* Event 3 */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all group">
              <div className="h-48 overflow-hidden relative">
                <img src="https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="Karaoke" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute top-3 right-3 bg-white/90 px-3 py-1 rounded-full text-xs font-bold text-pink-600 shadow-sm">
                  Reste 3 places
                </div>
              </div>
              <div className="p-6">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">20 Février • 20h00</div>
                <h3 className="font-bold text-xl text-gray-900 mb-2">Soirée Karaoké Privée</h3>
                <p className="text-gray-600 text-sm mb-4">Châtelet • Salle rien que pour nous</p>
                <div className="flex items-center text-primary font-bold text-sm">
                  <Star className="w-4 h-4 mr-1 fill-current" />
                  15€ abonnés <span className="text-gray-400 font-normal line-through ml-2">30€</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link
              to={getActionLink('monthly')}
              className="inline-flex items-center text-primary font-bold hover:underline"
            >
              Voir tout l'agenda <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Section "Partner Reductions" (Replaces Scientific Fact) */}
      <motion.section className="py-16 bg-gradient-to-br from-[#FDF8F4] to-white relative overflow-hidden" {...fadeInUp}>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1 rounded-full bg-pink-100 text-pink-600 font-bold text-sm mb-4">🎁 Rentabilisé Immédiatement</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Tes avantages exclusifs</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              En tant que membre, tu accèdes à des réductions qui remboursent ton abonnement.
              Juste en utilisant 2 codes promo, tu as déjà gagné de l'argent.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {/* Catégorie 1 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🧖‍♀️</div>
              <h3 className="font-bold text-gray-900 mb-1">Bien-être & Spa</h3>
              <p className="text-sm text-gray-500 mb-3">Massages, soins...</p>
              <div className="inline-block bg-green-100 text-green-700 font-bold text-xs px-2 py-1 rounded">-30% à -50%</div>
            </div>

            {/* Catégorie 2 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">👗</div>
              <h3 className="font-bold text-gray-900 mb-1">Mode & Beauté</h3>
              <p className="text-sm text-gray-500 mb-3">Marques créateurs</p>
              <div className="inline-block bg-green-100 text-green-700 font-bold text-xs px-2 py-1 rounded">-15% à -30%</div>
            </div>

            {/* Catégorie 3 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🥗</div>
              <h3 className="font-bold text-gray-900 mb-1">Food & Brunchs</h3>
              <p className="text-sm text-gray-500 mb-3">Restos partenaires</p>
              <div className="inline-block bg-green-100 text-green-700 font-bold text-xs px-2 py-1 rounded">-20% sur l'addition</div>
            </div>

            {/* Catégorie 4 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✈️</div>
              <h3 className="font-bold text-gray-900 mb-1">Voyages</h3>
              <p className="text-sm text-gray-500 mb-3">Séjours Nowme</p>
              <div className="inline-block bg-green-100 text-green-700 font-bold text-xs px-2 py-1 rounded">-100€ / séjour</div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              to={getActionLink('monthly')}
              className="inline-flex items-center px-8 py-4 bg-white border-2 border-primary text-primary rounded-full font-bold text-lg hover:bg-primary hover:text-white transform hover:scale-105 transition-all duration-300 shadow-lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {getActionText('Je veux mes réductions')}
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Section Nowme Philosophy */}
      <motion.section className="relative pt-20 pb-20 overflow-hidden" {...fadeInUp}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              <span className="text-primary">Nowme</span> = <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent italic">Maintenant Moi</span>.<br />
            </h1>
            <p className="text-xl text-gray-700 font-medium">
              C'est ton moment. Tu mérites de kiffer à fond, sans culpabiliser.
              <br /><span className="text-gray-500 text-lg font-normal">On s'occupe de tout, tu n'as plus qu'à profiter.</span>
            </p>
          </div>
        </div>
      </motion.section>

      {/* Second IDF Warning */}
      <div className="bg-yellow-50 border-t border-b border-yellow-100 text-yellow-800 text-center py-4 px-4 text-base font-semibold shadow-sm">
        📍 Actuellement concentré en Île-de-France — On arrive très vite près de chez toi !
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

      {/* Video Testimonials */}
      {/* <VideoTestimonials /> */}

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
          <motion.p className="text-xl text-gray-600 mb-6">
            Teste d'abord, kiffe ensuite ! Premier mois découverte puis accès à tout le premium.
          </motion.p>

          {/* Bloc "Pourquoi 39,99€" */}
          <div className="mb-12 bg-blue-50/50 rounded-xl p-6 border border-blue-100 inline-block text-left text-sm md:text-base">
            <p className="font-bold text-blue-800 mb-2 text-center">💡 Pourquoi 39,99€/mois ?</p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start"><Check className="w-4 h-4 text-blue-500 mr-2 mt-1" /> <strong>C'est le prix d'un seul resto</strong>, mais ça t'ouvre des dizaines d'opportunités.</li>
              <li className="flex items-start"><Check className="w-4 h-4 text-blue-500 mr-2 mt-1" /> <strong>C'est vite rentabilisé</strong> : 2 codes promos bien-être et c'est remboursé.</li>
              <li className="flex items-start"><Check className="w-4 h-4 text-blue-500 mr-2 mt-1" /> <strong>C'est la garantie qualité</strong> d'un club privé modéré et sécurisé.</li>
            </ul>
          </div>

          {/* Deux options claires: Mensuel vs Annuel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">

            {/* Option Mensuelle */}
            <motion.div
              className="bg-white rounded-3xl p-8 border-2 border-primary/20 relative flex flex-col hover:shadow-xl transition-shadow duration-300"
              whileHover={{ y: -5 }}
            >
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <span className="px-4 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wide">
                  Sans engagement • Liberté
                </span>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">Offre Mensuelle</h3>
              <div className="text-4xl font-bold text-gray-900 mb-1">12,99€</div>
              <div className="text-sm text-gray-500 mb-6 font-medium">le 1er mois (Cadeau), puis 39,99€/mois</div>

              {/* Value Stack Visual */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Ta valeur ajoutée chaque mois :</div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Events & Séjours</span>
                  <span className="font-semibold text-gray-900">50€ à 200€</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Concours Box</span>
                  <span className="font-semibold text-gray-900">100€ / 3 mois</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Réductions Partenaires</span>
                  <span className="font-semibold text-gray-900">50€+</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Communauté & Apéros</span>
                  <span className="font-semibold text-gray-900">Inestimable</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between items-center mt-2">
                  <span className="font-bold text-primary">Valeur Totale</span>
                  <span className="font-bold text-primary text-lg">200€+/mois</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start text-sm"><Check className="w-5 h-5 text-green-500 mr-2 shrink-0" /> <span className="font-bold">Accès complet immédiat</span></li>
                <li className="flex items-start text-sm"><Check className="w-5 h-5 text-green-500 mr-2 shrink-0" /> <span>Annulable à tout moment en 1 clic</span></li>
                <li className="flex items-start text-sm"><Check className="w-5 h-5 text-green-500 mr-2 shrink-0" /> <span className="font-bold text-pink-600">Programme Fidélité inclus</span></li>
                <li className="flex items-start text-sm"><Check className="w-5 h-5 text-green-500 mr-2 shrink-0" /> <span>Communauté WhatsApp & Apéros</span></li>
              </ul>

              <Link
                to={getActionLink('monthly')}
                className="block w-full text-center px-6 py-3 rounded-full bg-white border-2 border-primary text-primary font-bold hover:bg-primary hover:text-white transition-all"
              >
                {isSubscriber ? 'Voir mon compte' : isAuthenticated ? 'Choisir le Pass Liberté' : 'Je teste (12,99€)'}
              </Link>
            </motion.div>

            {/* Option Annuelle */}
            <motion.div
              className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl p-8 border-2 border-primary relative flex flex-col hover:shadow-2xl transition-all duration-300 transform scale-105 z-10"
              whileHover={{ y: -5 }}
            >
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full text-center">
                <span className="px-6 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-full text-sm font-bold shadow-lg animate-pulse">
                  ✨ OFFRE VIP ✨
                </span>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">Offre Annuelle</h3>
              <div className="text-4xl font-bold text-primary mb-1">399€</div>
              <div className="text-sm text-gray-600 mb-6 font-medium">
                par an (soit <span className="text-green-600 font-bold">2 mois offerts !</span>)
              </div>

              {/* Value Stack Visual */}
              <div className="bg-white/60 rounded-xl p-4 mb-6 space-y-3">
                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Ta valeur ajoutée annuelle :</div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Events & Séjours (x12)</span>
                  <span className="font-semibold text-gray-900">600€ à 2400€</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Concours Box (x4)</span>
                  <span className="font-semibold text-gray-900">400€</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Réductions Partenaires</span>
                  <span className="font-semibold text-gray-900">600€+</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Bonus Séjours</span>
                  <span className="font-semibold text-green-600">+100€ OFF</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between items-center mt-2">
                  <span className="font-bold text-primary">Valeur Totale</span>
                  <span className="font-bold text-primary text-xl">2500€+ / an</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-start text-sm"><Check className="w-5 h-5 text-primary mr-2 shrink-0" /> <span className="font-bold">Tout du plan mensuel inclus</span></li>
                <li className="flex items-start text-sm"><Check className="w-5 h-5 text-primary mr-2 shrink-0" /> <span className="font-bold">100€ de réduction sur les séjours</span></li>
                <li className="flex items-start text-sm"><Check className="w-5 h-5 text-primary mr-2 shrink-0" /> <span>Cadeau d'anniversaire exclusif</span></li>
                <li className="flex items-start text-sm"><Check className="w-5 h-5 text-primary mr-2 shrink-0" /> <span>Invitations événements VIP</span></li>
              </ul>

              <Link
                to={getActionLink('yearly')}
                className="block w-full text-center px-6 py-4 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-bold text-lg hover:shadow-lg transition-all hover:scale-105"
              >
                {isSubscriber ? 'Passer en Annuel' : isAuthenticated ? 'Profiter des 1620€ de valeur' : 'Je rejoins le VIP'}
              </Link>
              <div className="text-center mt-3 text-xs text-gray-500">
                Paiement 100% sécurisé via Stripe
              </div>
            </motion.div>

          </div>


        </div>
      </motion.section >

      {/* FAQ Section */}
      < motion.section className="py-20 bg-gray-50" {...fadeInUp}>
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
      </motion.section >



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

    </div>
  );
}