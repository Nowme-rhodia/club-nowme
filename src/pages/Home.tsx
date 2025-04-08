import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, MapPin, Users, Shield, Search, Star, ChevronRight } from 'lucide-react';
import { SEO } from '../components/SEO';

export function Home() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <SEO 
        title="Nowme - Ton kiff commence ici"
        description="Massages, sorties, ateliers : l’abonnement qui te redonne le contrôle en Île-de-France."
      />

      {/* Hero Section */}
      <div className="relative min-h-[90vh] bg-white flex items-center overflow-hidden border-b-4 border-pink-500">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1571388208497-71bedc66e932?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10 animate-subtle-zoom" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className={`text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight mb-6 animate-fade-in-down ${scrollY > 50 ? 'opacity-0' : 'opacity-100'}`}>
              Marre de juste survivre ?  
              <span className="text-pink-500 block">Kiffe enfin TA vie !</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto animate-fade-in-up">
              Massages à -30%, apéros entre meufs à 5 €, ateliers qui te réveillent : Nowme, c’est TON abonnement pour reprendre le contrôle en Île-de-France.
            </p>
            <p className="text-lg text-pink-600 font-semibold mb-12 animate-pulse">
              Offre lancement : 1er mois à 4,99 €, jusqu’au 15 avril !
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/subscription"
                className="inline-flex items-center px-8 py-4 rounded-full bg-pink-500 text-white font-semibold hover:bg-pink-600 transform hover:scale-105 transition-all animate-bounce-slow"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Je veux kiffer maintenant
              </Link>
              <Link
                to="/tous-les-kiffs"
                className="inline-flex items-center px-8 py-4 rounded-full bg-white text-pink-500 border-2 border-pink-500 font-semibold hover:bg-gray-50 transform hover:scale-105 transition-all"
              >
                <MapPin className="w-5 h-5 mr-2" />
                Voir les kiffs près de moi
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Avantages Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-16 animate-fade-in">
            Pourquoi Nowme va changer ton quotidien
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Users,
                title: "Validé par des meufs comme toi",
                description: "Chaque massage, chaque apéro : testé et approuvé par notre communauté."
              },
              {
                icon: Star,
                title: "Économise jusqu’à -50%",
                description: "Spa, sorties, ateliers : ton portefeuille respire, toi aussi."
              },
              {
                icon: Shield,
                title: "Zéro stress, 100% liberté",
                description: "Résilie en 1 clic, kiffe quand tu veux, sans pression."
              },
              {
                icon: Search,
                title: "Ton kiff à deux pas",
                description: "Des plans géniaux en Île-de-France, trouvés en un clin d’œil."
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 text-center shadow-md hover:shadow-lg transition-all animate-slide-up"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-100 mb-6">
                  <feature.icon className="w-8 h-8 text-pink-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 animate-fade-in">
              Ton kiff, à ta façon
            </h2>
            <p className="text-xl text-gray-600 animate-fade-in-up">
              Des expériences qui te parlent, prêtes à te faire vibrer
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Bien-être", description: "Massages à -30%, yoga doux", image: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&q=80&w=800" },
              { title: "Sorties", description: "Apéros à 5 €, soirées fun", image: "https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&q=80&w=800" },
              { title: "Créativité", description: "Peinture, poterie", image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=800" },
              { title: "Développement perso", description: "Coaching, méditation", image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800" },
              { title: "Shopping", description: "Ventes privées, mode", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800" },
              { title: "Beauté", description: "Soins, lifestyle", image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=800" },
            ].map((category, index) => (
              <Link
                key={index}
                to={`/tous-les-kiffs/${category.title.toLowerCase()}`}
                className="group relative h-80 rounded-2xl overflow-hidden animate-slide-up"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <img src={category.image} alt={category.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
                <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
                  <h3 className="text-2xl font-bold mb-2">{category.title}</h3>
                  <p className="text-white/90">{category.description}</p>
                  <span className="mt-2 inline-block px-4 py-1 bg-pink-500 text-white rounded-full text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    Découvre ça !
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Mission Section - Manifeste */}
      <div className="py-24 bg-pink-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 animate-fade-in">
            On dit stop au train-train, oui au kiff !
          </h2>
          <p className="text-lg text-gray-600 mb-8 animate-fade-in-up">
            Fini de courir après des miettes de bonheur entre deux corvées. Nowme, c’est la révolution des meufs qui veulent vivre, vibrer, et kiffer sans se justifier.
          </p>
          <p className="text-lg text-gray-600 font-semibold">
            Une plateforme faite par nous, pour nous. Rejoins le mouvement !
          </p>
        </div>
      </div>

      {/* Testimonials */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-16 animate-fade-in">
            Elles kiffent déjà, et toi ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { name: "Marie L.", role: "Entrepreneuse", image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150", quote: "Un apéro à 5 € qui m’a fait rire aux larmes. Nowme, c’est ma bouffée d’air !" },
              { name: "Sophie D.", role: "Maman active", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150", quote: "Enfin du temps pour moi sans culpabiliser. Les massages à -30%, un rêve !" },
              { name: "Léa P.", role: "Créative", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150", quote: "Un atelier poterie qui m’a reconnectée à moi-même. Merci Nowme !" },
            ].map((testimonial, index) => (
              <div
                key={index}
                className="bg-pink-50 rounded-xl p-6 hover:shadow-lg transition-all animate-slide-up"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <img src={testimonial.image} alt={testimonial.name} className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{testimonial.name}</h3>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />)}
                </div>
                <p className="text-gray-600 italic">"{testimonial.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="py-24 bg-pink-500 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 animate-fade-in">
            Prête à rejoindre les pionnières du kiff ?
          </h2>
          <p className="text-xl mb-8 animate-fade-in-up">
            Jusqu’au 15 avril : 1er mois à 4,99 € + accès VIP aux premiers événements. Ne rate pas le départ !
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/subscription"
              className="inline-flex items-center px-8 py-4 rounded-full bg-white text-pink-500 font-semibold hover:bg-gray-100 transform hover:scale-105 transition-all animate-bounce-slow"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Je m’abonne maintenant
            </Link>
            <Link
              to="/tous-les-kiffs"
              className="inline-flex items-center px-8 py-4 rounded-full bg-pink-700 text-white font-semibold hover:bg-pink-800 transform hover:scale-105 transition-all"
            >
              <MapPin className="w-5 h-5 mr-2" />
              Mes kiffs près de chez moi
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Animations (ajoute dans ton CSS global)
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
  @keyframes bounce-slow {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  @keyframes subtle-zoom {
    0% { transform: scale(1); }
    100% { transform: scale(1.05); }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  .animate-fade-in { animation: fade-in-down 1s ease-out; }
  .animate-fade-in-up { animation: fade-in-up 1s ease-out; }
  .animate-slide-up { animation: slide-up 0.8s ease-out; }
  .animate-bounce-slow { animation: bounce-slow 2s infinite; }
  .animate-subtle-zoom { animation: subtle-zoom 10s infinite alternate; }
  .animate-pulse { animation: pulse 1.5s infinite; }
`;