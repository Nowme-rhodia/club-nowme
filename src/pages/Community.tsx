import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Heart, 
  Users, 
  MessageCircle, 
  Calendar, 
  Gift, 
  Star,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Coffee,
  MapPin,
  MapPin,
  Shield,
  X,
  Play,
  Camera,
  Music,
  Palette,
  Utensils
} from 'lucide-react';
import { SEO } from '../components/SEO';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const Community: React.FC = () => {
  const [selectedModal, setSelectedModal] = useState<string | null>(null);

  const experiences = [
    {
      id: 'spa',
      title: 'Spa & Bien-être',
      image: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=800',
      description: 'Massages à -30%, spas d\'exception, soins visage... Prends soin de toi sans te ruiner !',
      examples: ['Massage relaxant 1h → 50€ au lieu de 80€', 'Soin visage premium → 45€ au lieu de 70€', 'Accès spa journée → 25€ au lieu de 40€']
    },
    {
      id: 'sorties',
      title: 'Sorties & Apéros',
      image: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&q=80&w=800',
      description: 'Apéros à 5€, soirées VIP, événements exclusifs... Kiffe sans compter !',
      examples: ['Apéro découverte → 5€', 'Soirée networking → 15€', 'Événement VIP → Gratuit pour les membres']
    },
    {
      id: 'ateliers',
      title: 'Ateliers Créatifs',
      image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=800',
      description: 'Poterie, peinture, cuisine... Réveille ta créativité avec des expertes !',
      examples: ['Atelier poterie → 25€ au lieu de 45€', 'Cours de cuisine → 30€ au lieu de 55€', 'Peinture intuitive → 20€ au lieu de 40€']
    }
  ];

  const testimonials = [
    {
      name: "Sarah, 34 ans",
      role: "Maman de 2 enfants",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
      quote: "Grâce à Nowme, j'ai découvert un spa incroyable à -40% et j'ai rencontré 3 super copines lors de l'apéro mensuel ! Maintenant on se fait des sorties ensemble chaque semaine.",
      highlight: "3 nouvelles amitiés"
    },
    {
      name: "Emma, 28 ans", 
      role: "Entrepreneuse",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150",
      quote: "La box du dernier trimestre était dingue ! Des produits que je n'aurais jamais découverts sinon. Et les réductions partenaires me font économiser 150€/mois minimum.",
      highlight: "150€ économisés/mois"
    },
    {
      name: "Julie, 42 ans",
      role: "Cadre + maman",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150", 
      quote: "Les événements Nowme sont toujours au top ! Atelier poterie, dégustation de vins, soirée salsa... J'ai enfin un agenda qui me fait vibrer ! Et les séjours entre filles, un rêve !",
      highlight: "Agenda qui pétille"
    }
  ];

  const Modal = ({ id, onClose }: { id: string; onClose: () => void }) => {
    const experience = experiences.find(exp => exp.id === id);
    if (!experience) return null;

    return (
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
            <img
              src={experience.image}
              alt={experience.title}
              className="w-full h-64 object-cover"
            />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="absolute bottom-4 left-4">
              <h3 className="text-2xl font-bold text-white drop-shadow-lg">
                {experience.title}
              </h3>
            </div>
          </div>
          
          <div className="p-8">
            <p className="text-gray-600 mb-6 text-lg">
              {experience.description}
            </p>
            
            <h4 className="font-bold text-gray-900 mb-4">Exemples de tarifs membres :</h4>
            <ul className="space-y-3 mb-8">
              {experience.examples.map((example, index) => (
                <li key={index} className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-primary mr-3" />
                  <span className="text-gray-700">{example}</span>
                </li>
              ))}
            </ul>
            
            <Link
              to="/subscription"
              className="block w-full text-center px-6 py-3 bg-primary text-white rounded-full font-semibold hover:bg-primary-dark transition-colors"
            >
              Je veux ces tarifs ! (12,99€)
            </Link>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 overflow-hidden">
      <SEO 
        title="Rejoins la communauté Nowme"
        description="Une communauté de femmes qui s'entraident, partagent et kiffent ensemble. Rejoins-nous !"
      />

      {/* Hero Section - Design asymétrique */}
      <motion.section
        className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-br from-[#FDF8F4] to-white"
        initial="initial"
        whileInView="whileInView"
        viewport={{ once: true }}
      >
        {/* Formes décoratives */}
        <div className="absolute top-20 right-10 w-32 h-32 bg-primary/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 left-10 w-24 h-24 bg-secondary/10 rounded-full blur-lg"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Texte à gauche */}
            <motion.div {...fadeInUp}>
              <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full text-primary font-semibold mb-6">
                <Heart className="w-4 h-4 mr-2" />
                Plus de 500 femmes nous font déjà confiance
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Enfin une communauté qui{' '}
                <span className="text-primary relative">
                  kiffe comme toi
                  <svg className="absolute -bottom-2 left-0 w-full h-3" viewBox="0 0 200 12" fill="none">
                    <path d="M2 10C50 2 150 2 198 10" stroke="#E4D44C" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                </span>
              </h1>
              
              <p className="text-lg sm:text-xl text-gray-700 mb-8 leading-relaxed">
                Fini de galérer à trouver des plans sympas ! Ici, on partage nos découvertes, 
                nos coups de cœur, et surtout... on kiffe ensemble des expériences qui nous ressemblent.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/subscription"
                  className="inline-flex items-center px-8 py-4 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-semibold text-lg hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Je teste à 12,99€
                </Link>
                <p className="text-sm text-gray-600 self-center">
                  ✨ Premier mois découverte, puis accès premium complet
                </p>
              </div>
            </motion.div>

            {/* Image décalée à droite */}
            <motion.div 
              className="relative"
              {...fadeInUp}
              transition={{ delay: 0.3 }}
            >
              <div className="relative transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <img
                  src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=600"
                  alt="Femmes qui rient ensemble"
                  className="rounded-2xl shadow-2xl"
                />
                <div className="absolute -bottom-4 -left-4 bg-white p-4 rounded-xl shadow-lg">
                  <p className="text-sm font-semibold text-gray-900">💕 "Enfin des copines qui me comprennent !"</p>
                  <p className="text-xs text-gray-600">- Marie, membre depuis 6 mois</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Section problèmes/solutions - Design en zigzag */}
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

          {/* Design en zigzag */}
          <div className="space-y-20">
            {/* Problème 1 - Image à gauche */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div {...fadeInUp}>
                <img
                  src="https://images.unsplash.com/photo-1551836022-deb4988cc6c0?auto=format&fit=crop&q=80&w=600"
                  alt="Femme stressée"
                  className="rounded-2xl shadow-lg transform -rotate-2 hover:rotate-0 transition-transform duration-500"
                />
              </motion.div>
              <motion.div {...fadeInUp} transition={{ delay: 0.2 }}>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  😩 "Je galère à trouver des plans sympas"
                </h3>
                <p className="text-gray-600 mb-6">
                  Entre les avis bidons sur internet et les recommandations de ta belle-mère, 
                  tu ne sais plus où donner de la tête. Tu finis toujours dans les mêmes endroits...
                </p>
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                  <p className="text-red-700 font-semibold">
                    ✗ Résultat : Tu t'ennuies et tu passes à côté de pépites près de chez toi
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Solution 1 - Image à droite */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div className="lg:order-2" {...fadeInUp}>
                <img
                  src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=600"
                  alt="Femmes heureuses"
                  className="rounded-2xl shadow-lg transform rotate-2 hover:rotate-0 transition-transform duration-500"
                />
              </motion.div>
              <motion.div className="lg:order-1" {...fadeInUp} transition={{ delay: 0.2 }}>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  ✨ Avec Nowme : Des plans testés et approuvés
                </h3>
                <p className="text-gray-600 mb-6">
                  500+ femmes qui partagent leurs découvertes et te donnent les vrais bons plans. 
                  Chaque expérience est validée par la communauté !
                </p>
                <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
                  <p className="text-green-700 font-semibold">
                    ✓ Résultat : Tu découvres des pépites et tu kiffes à chaque sortie
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Problème 2 - Image à gauche */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div {...fadeInUp}>
                <img
                  src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600"
                  alt="Femme seule"
                  className="rounded-2xl shadow-lg transform -rotate-1 hover:rotate-0 transition-transform duration-500"
                />
              </motion.div>
              <motion.div {...fadeInUp} transition={{ delay: 0.2 }}>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  😔 "Je n'ai personne avec qui sortir"
                </h3>
                <p className="text-gray-600 mb-6">
                  Tes copines sont occupées, ton mec n'est pas chaud pour tes activités... 
                  Tu finis par rester chez toi et scroller sur ton canapé.
                </p>
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                  <p className="text-red-700 font-semibold">
                    ✗ Résultat : Tu t'isoles et tu rates des moments de bonheur
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Solution 2 - Image à droite */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div className="lg:order-2" {...fadeInUp}>
                <img
                  src="https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&q=80&w=600"
                  alt="Groupe d'amies"
                  className="rounded-2xl shadow-lg transform rotate-1 hover:rotate-0 transition-transform duration-500"
                />
              </motion.div>
              <motion.div className="lg:order-1" {...fadeInUp} transition={{ delay: 0.2 }}>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  🎉 Avec Nowme : Toujours des copines dispo
                </h3>
                <p className="text-gray-600 mb-6">
                  Communauté active, événements organisés, carte interactive pour trouver 
                  des membres près de chez toi... Fini la galère pour trouver quelqu'un !
                </p>
                <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
                  <p className="text-green-700 font-semibold">
                    ✓ Résultat : Tu as toujours des copines pour t'accompagner
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Section expériences - Grille asymétrique */}
      <motion.section className="py-20 bg-white" {...fadeInUp}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Concrètement, qu'est-ce que tu auras ?
            </motion.h2>
            <motion.p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Pas de blabla, que du concret pour transformer ton quotidien.
            </motion.p>
          </div>

          {/* Grille asymétrique */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {experiences.map((experience, index) => (
              <motion.div
                key={experience.id}
                className={`
                  relative group cursor-pointer
                  ${index === 0 ? 'md:col-span-2 lg:col-span-1' : ''}
                  ${index === 1 ? 'lg:col-span-2' : ''}
                `}
                {...fadeInUp}
                transition={{ delay: index * 0.2 }}
                onClick={() => setSelectedModal(experience.id)}
                whileHover={{ scale: 1.02 }}
              >
                <div className="relative h-80 rounded-2xl overflow-hidden shadow-lg">
                  <img
                    src={experience.image}
                    alt={experience.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  
                  {/* Badge flottant */}
                  <div className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Jusqu'à -70%
                  </div>
                  
                  {/* Contenu */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <h3 className="text-2xl font-bold mb-2">{experience.title}</h3>
                    <p className="text-white/90 mb-4">{experience.description}</p>
                    <div className="flex items-center text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-4 h-4 mr-2" />
                      Voir les exemples
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Section "Ce que tu auras chaque mois" - Design en cartes flottantes */}
      <motion.section className="py-20 bg-gradient-to-br from-primary/5 to-secondary/5" {...fadeInUp}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Ce que tu auras chaque mois
            </motion.h2>
            <motion.p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Un programme pensé pour des femmes actives qui veulent kiffer sans prise de tête.
            </motion.p>
          </div>

          {/* Cartes flottantes en disposition libre */}
          <div className="relative">
            {/* Carte 1 - Apéros mensuels */}
            <motion.div
              className="absolute top-0 left-0 w-80 bg-white rounded-2xl p-6 shadow-xl transform rotate-3 hover:rotate-0 transition-transform duration-500"
              {...fadeInUp}
            >
              <div className="flex items-center mb-4">
                <Coffee className="w-8 h-8 text-primary mr-3" />
                <h3 className="text-xl font-bold text-gray-900">Apéro mensuel en ligne</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Chaque mois, on se retrouve pour partager nos découvertes, rigoler et organiser nos prochaines sorties !
              </p>
              <div className="bg-primary/10 rounded-lg p-3">
                <p className="text-primary font-semibold text-sm">
                  🗓️ Dernier vendredi du mois à 19h
                </p>
              </div>
            </motion.div>

            {/* Carte 2 - Box trimestrielle */}
            <motion.div
              className="absolute top-20 right-0 w-80 bg-white rounded-2xl p-6 shadow-xl transform -rotate-2 hover:rotate-0 transition-transform duration-500"
              {...fadeInUp}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center mb-4">
                <Gift className="w-8 h-8 text-secondary mr-3" />
                <h3 className="text-xl font-bold text-gray-900">Box partenaires</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Produits lifestyle, bons de réduction, surprises... Une box de 30€ de valeur livrée chez toi !
              </p>
              <div className="bg-secondary/10 rounded-lg p-3">
                <p className="text-secondary font-semibold text-sm">
                  📦 Tous les 3 mois dans ta boîte aux lettres
                </p>
              </div>
            </motion.div>

            {/* Carte 3 - Événements */}
            <motion.div
              className="absolute top-40 left-20 w-80 bg-white rounded-2xl p-6 shadow-xl transform rotate-1 hover:rotate-0 transition-transform duration-500"
              {...fadeInUp}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center mb-4">
                <Calendar className="w-8 h-8 text-primary mr-3" />
                <h3 className="text-xl font-bold text-gray-900">Événements exclusifs</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Ateliers, sorties, séjours entre filles... 2-3 événements par mois à tarifs préférentiels !
              </p>
              <div className="bg-primary/10 rounded-lg p-3">
                <p className="text-primary font-semibold text-sm">
                  🎉 Accès prioritaire + réductions membres
                </p>
              </div>
            </motion.div>

            {/* Carte 4 - Carte interactive */}
            <motion.div
              className="absolute top-60 right-20 w-80 bg-white rounded-2xl p-6 shadow-xl transform -rotate-1 hover:rotate-0 transition-transform duration-500"
              {...fadeInUp}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-center mb-4">
                <MapPin className="w-8 h-8 text-secondary mr-3" />
                <h3 className="text-xl font-bold text-gray-900">Carte interactive</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Trouve des membres près de chez toi pour un café, une sortie ou partager un bon plan !
              </p>
              <div className="bg-secondary/10 rounded-lg p-3">
                <p className="text-secondary font-semibold text-sm">
                  📍 Rencontres IRL facilitées
                </p>
              </div>
            </motion.div>

            {/* Spacer pour éviter le chevauchement */}
            <div className="h-96"></div>
          </div>
        </div>
      </motion.section>

      {/* Témoignages - Design en mosaïque */}
      <motion.section className="py-20 bg-white" {...fadeInUp}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Elles ont osé franchir le pas...
            </motion.h2>
            <motion.p className="text-xl text-gray-600">
              Et maintenant, elles kiffent leur vie ! 
            </motion.p>
          </div>

          {/* Mosaïque de témoignages */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                className={`
                  bg-gradient-to-br from-primary/5 to-secondary/5 p-6 rounded-2xl relative
                  ${index === 1 ? 'md:transform md:translate-y-8' : ''}
                  ${index === 2 ? 'lg:transform lg:-translate-y-4' : ''}
                `}
                {...fadeInUp}
                transition={{ delay: index * 0.2 }}
                whileHover={{ scale: 1.02, rotate: index % 2 === 0 ? 1 : -1 }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name} 
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md" 
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
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA final - Design immersif */}
      <motion.section className="py-20 bg-gradient-to-r from-primary to-secondary text-white relative overflow-hidden" {...fadeInUp}>
        {/* Éléments décoratifs */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2 className="text-3xl md:text-4xl font-bold mb-6">
            Prête à reprendre le contrôle de ta vie ?
          </motion.h2>
          
          <motion.p className="text-xl mb-8 opacity-90">
            Rejoins les 500+ femmes qui ont déjà dit STOP à la routine et OUI au kiff !
          </motion.p>

          <motion.div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold mb-2">12,99€</div>
                <div className="text-sm opacity-90">Premier mois découverte</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">39,99€</div>
                <div className="text-sm opacity-90">Puis accès premium complet</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">120€+</div>
                <div className="text-sm opacity-90">Valeur réelle mensuelle</div>
              </div>
            </div>
          </motion.div>

          <motion.div className="space-y-4">
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
        {selectedModal && (
          <Modal id={selectedModal} onClose={() => setSelectedModal(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Community;