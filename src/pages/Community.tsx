import React from 'react';
import { motion } from 'framer-motion';
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
  Lightbulb,
  Shield
} from 'lucide-react';
import { SEO } from '../components/SEO';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const Community: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDF8F4] to-[#FFFFFF] text-gray-800">
      <SEO 
        title="Rejoins la communauté Nowme"
        description="Une communauté de femmes qui s'entraident, partagent et kiffent ensemble. Rejoins-nous !"
      />

      {/* Hero Section - Plus impactant */}
      <motion.section
        className="relative py-20 md:py-28 overflow-hidden"
        initial="initial"
        whileInView="whileInView"
        viewport={{ once: true }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#BF2778]/10 to-[#E4D44C]/10"></div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full text-primary font-semibold mb-6"
            {...fadeInUp}
          >
            <Heart className="w-4 h-4 mr-2" />
            Plus de 500 femmes nous ont déjà rejointes
          </motion.div>
          
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6"
            {...fadeInUp}
          >
            Enfin une communauté qui{' '}
            <span className="text-primary relative">
              kiffe comme toi
              <svg className="absolute -bottom-2 left-0 w-full h-3" viewBox="0 0 200 12" fill="none">
                <path d="M2 10C50 2 150 2 198 10" stroke="#E4D44C" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </span>
          </motion.h1>
          
          <motion.p
            className="text-lg sm:text-xl md:text-2xl text-gray-700 mb-8 max-w-4xl mx-auto leading-relaxed"
            {...fadeInUp}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Fini de galérer à trouver des plans sympas ! Ici, on partage nos découvertes, 
            nos coups de cœur, et surtout... on kiffe ensemble des expériences qui nous ressemblent.
          </motion.p>
          
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            {...fadeInUp}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <Link
              to="/subscription"
              className="inline-flex items-center px-8 py-4 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-semibold text-lg hover:shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Je rejoins la communauté (12,99€)
            </Link>
            <p className="text-sm text-gray-600">
              ✨ Premier mois découverte, puis accès premium complet
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Section problèmes/solutions - Inspirée de Fabuleuses */}
      <motion.section className="py-20 bg-white" {...fadeInUp}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Tu te reconnais dans ces situations ?
            </motion.h2>
            <motion.p className="text-xl text-gray-600 max-w-3xl mx-auto">
              On a toutes vécu ça... Mais maintenant, on a trouvé la solution ensemble.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Problèmes */}
            <div className="space-y-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center md:text-left">
                😩 Avant Nowme...
              </h3>
              
              {[
                {
                  problem: "Tu galères à trouver des plans sympas",
                  description: "Entre les avis bidons sur internet et les recommandations de ta belle-mère, tu ne sais plus où donner de la tête."
                },
                {
                  problem: "Tu finis toujours dans les mêmes endroits",
                  description: "Le même resto, le même spa, les mêmes sorties... Tu tournes en rond et tu t'ennuies."
                },
                {
                  problem: "Tu paies plein pot pour tout",
                  description: "Massage à 80€, atelier à 50€... Ton budget loisirs explose et tu te prives."
                },
                {
                  problem: "Tu n'as personne avec qui sortir",
                  description: "Tes copines sont occupées, ton mec n'est pas chaud... Tu finis par rester chez toi."
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className="flex items-start space-x-4 p-4 bg-red-50 rounded-lg border-l-4 border-red-400"
                  {...fadeInUp}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-red-600 font-bold">✗</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">{item.problem}</h4>
                    <p className="text-gray-600 text-sm">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Solutions */}
            <div className="space-y-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center md:text-left">
                ✨ Avec Nowme...
              </h3>
              
              {[
                {
                  solution: "Tu as des plans testés et approuvés",
                  description: "500+ femmes qui partagent leurs découvertes et te donnent les vrais bons plans."
                },
                {
                  solution: "Tu découvres des pépites près de chez toi",
                  description: "Activités inédites, lieux secrets, expériences qu'on ne trouve nulle part ailleurs."
                },
                {
                  solution: "Tu économises un max avec style",
                  description: "Réductions jusqu'à -70%, bons plans exclusifs... Tu kiffes sans te ruiner."
                },
                {
                  solution: "Tu as toujours des copines pour t'accompagner",
                  description: "Communauté active, événements organisés... Fini la galère pour trouver quelqu'un !"
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className="flex items-start space-x-4 p-4 bg-green-50 rounded-lg border-l-4 border-green-400"
                  {...fadeInUp}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">{item.solution}</h4>
                    <p className="text-gray-600 text-sm">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Section "Concrètement, qu'est-ce que tu auras ?" */}
      <motion.section className="py-20 bg-gradient-to-r from-primary/5 to-secondary/5" {...fadeInUp}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Concrètement, qu'est-ce que tu auras ?
            </motion.h2>
            <motion.p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Pas de blabla, que du concret pour transformer ton quotidien.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: MapPin,
                title: "Découvertes exclusives",
                description: "Activités inédites testées par la communauté. Fini les plans moyens !",
                highlight: "Expériences validées"
              },
              {
                icon: Users,
                title: "Communauté active",
                description: "500+ femmes qui partagent leurs bons plans et organisent des sorties.",
                highlight: "Toujours des copines dispo"
              },
              {
                icon: Gift,
                title: "Réductions de folie",
                description: "Jusqu'à -70% chez nos partenaires sélectionnés. Kiffe sans te ruiner !",
                highlight: "Économies garanties"
              },
              {
                icon: Calendar,
                title: "Événements premium",
                description: "Apéros, ateliers, sorties... 2-3 événements par mois organisés pour toi.",
                highlight: "Agenda toujours plein"
              },
              {
                icon: MessageCircle,
                title: "Apéros en ligne mensuels",
                description: "Retrouve la communauté chaque mois pour partager et découvrir ensemble.",
                highlight: "Rendez-vous convivial"
              },
              {
                icon: Coffee,
                title: "Box partenaires",
                description: "Produits lifestyle et bons plans découverte livrés chez toi chaque trimestre.",
                highlight: "Surprises à domicile"
              }
            ].map((benefit, index) => (
              <motion.div
                key={index}
                className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
                {...fadeInUp}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600 mb-3">{benefit.description}</p>
                <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm font-semibold rounded-full">
                  {benefit.highlight}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Témoignages authentiques */}
      <motion.section className="py-20 bg-white" {...fadeInUp}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Elles ont osé franchir le pas...
            </motion.h2>
            <motion.p className="text-xl text-gray-600">
              Et maintenant, elles kiffent leur vie ! 
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah, 34 ans",
                role: "Maman de 2 enfants",
                image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
                quote: "Grâce à Nowme, j'ai découvert un spa incroyable à -40% et j'ai rencontré 3 super copines lors de l'apéro en ligne ! Maintenant on se fait des sorties ensemble.",
                highlight: "A créé de vraies amitiés"
              },
              {
                name: "Emma, 28 ans", 
                role: "Entrepreneuse",
                image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150",
                quote: "La box du dernier trimestre était dingue ! Des produits que je n'aurais jamais découverts sinon. Et les réductions partenaires me font économiser 100€/mois minimum.",
                highlight: "Découvre et économise"
              },
              {
                name: "Julie, 42 ans",
                role: "Cadre + maman",
                image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150", 
                quote: "Les événements Nowme sont toujours au top ! Atelier poterie, dégustation de vins, soirée salsa... J'ai enfin un agenda qui me fait vibrer !",
                highlight: "Agenda qui pétille"
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                className="bg-gradient-to-br from-primary/5 to-secondary/5 p-6 rounded-xl relative"
                {...fadeInUp}
                transition={{ delay: index * 0.2 }}
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

      {/* Section objections - Très importante */}
      <motion.section className="py-20 bg-gray-50" {...fadeInUp}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              "Oui mais..."
            </motion.h2>
            <motion.p className="text-xl text-gray-600">
              On connaît tes hésitations, on les a toutes eues aussi !
            </motion.p>
          </div>

          <div className="space-y-8">
            {[
              {
                objection: "Je n'ai pas le temps pour encore une communauté",
                response: "Justement ! Pas d'obligation, tu participes quand tu veux. L'apéro mensuel dure 1h, les événements sont optionnels. Tu reçois juste les bons plans par WhatsApp quand ça t'arrange !"
              },
              {
                objection: "39,99€/mois, c'est cher pour moi",
                response: "Un massage coûte 80€, un atelier 50€. Avec nos réductions à -70%, tu économises déjà 100€+/mois ! Sans compter la box (30€ de valeur) et les événements inclus. Tu es gagnante dès le 1er mois !"
              },
              {
                objection: "Je ne suis pas sûre que ça soit pour moi",
                response: "C'est pour ça qu'on propose 12,99€ le premier mois ! Tu testes les réductions, la communauté, les événements... Si ça ne te convient pas, tu résiles en 1 clic. Zéro risque !"
              },
              {
                objection: "J'ai peur de ne pas m'intégrer",
                response: "Notre communauté est modérée activement pour garder une ambiance bienveillante. Taille humaine, pas de jugement. Et les apéros en ligne sont parfaits pour faire connaissance en douceur !"
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                className="bg-white p-6 rounded-xl shadow-md"
                {...fadeInUp}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-600 font-bold">?</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">"{item.objection}"</h3>
                    <p className="text-gray-700">{item.response}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA final - Plus persuasif */}
      <motion.section className="py-20 bg-gradient-to-r from-primary to-secondary text-white" {...fadeInUp}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
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

      {/* Section urgence/scarcité */}
      <motion.section className="py-16 bg-yellow-50 border-t-4 border-yellow-400" {...fadeInUp}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h3 className="text-2xl font-bold text-gray-900 mb-4">
            ⚡ Offre spéciale jusqu'au 31 mars
          </motion.h3>
          <motion.p className="text-lg text-gray-700 mb-6">
            Premier mois à 12,99€ au lieu de 19,99€. Après, tu décides si tu continues ou pas.
            <br />
            <strong>Mais attention : cette offre ne durera pas éternellement...</strong>
          </motion.p>
          <motion.p className="text-sm text-gray-600">
            💡 <strong>Astuce :</strong> Même si tu hésites, teste maintenant. 
            Tu peux toujours annuler avant la fin du mois si ça ne te convient pas.
          </motion.p>
        </div>
      </motion.section>
    </div>
  );
};

export default Community;