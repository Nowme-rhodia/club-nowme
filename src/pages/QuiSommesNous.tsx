import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Heart, Users, Gift, Paintbrush, Coffee, Calendar, Check, ChevronRight } from 'lucide-react';

export default function QuiSommesNous() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-white text-gray-800 overflow-hidden">
      {/* Hero */}
      <section className="bg-white py-20 px-6 text-center border-b-4 border-pink-500">
        <h1 className={`text-4xl md:text-6xl font-bold mb-6 text-gray-900 animate-fade-in-down ${scrollY > 50 ? 'opacity-0' : 'opacity-100'}`}>
          Ici, on kiffe sans s’excuser ✨
        </h1>
        <p className="text-xl md:text-2xl max-w-3xl mx-auto text-gray-600 animate-fade-in-up">
          Ras-le-bol de courir partout ? Le Nowme Club, c’est TON espace pour lâcher prise, rire à gorge déployée et vivre à fond.
        </p>
        <div className="mt-6 animate-bounce-slow">
          <Link to="/subscription" className="inline-flex items-center px-6 py-3 bg-pink-500 text-white font-semibold rounded-full hover:bg-pink-600 transition-all">
            <ChevronRight className="w-5 h-5 mr-2" />
            Je commence mon aventure !
          </Link>
        </div>
      </section>

      {/* Sections cards - Émotion et engagement */}
      <section className="max-w-5xl mx-auto px-4 py-16 grid gap-12 md:grid-cols-2">
        <Card title="Pourquoi on existe ?" color="border-l-4 border-pink-500">
          Parce qu’on n’en peut plus de se sacrifier. On veut des massages qui nous font fondre, des apéros qui nous font hurler de rire, et une bande de meufs qui nous comprennent. Ça te parle ?
        </Card>
        <Card title="Notre rêve fou 💫" color="border-l-4 border-yellow-400">
          Que tu te réveilles chaque jour avec une étincelle dans le ventre. On bosse pour que ton kiff devienne aussi essentiel que ton café du matin.
        </Card>
        <Card title="Ce qu’on fait pour toi 🎯" color="border-l-4 border-rose-500">
          On te dégote des plans qui claquent : -50% sur ton prochain massage, des soirées où tu danses jusqu’à minuit, et une tribu qui te pousse à être toi, sans filtre.
        </Card>
        <Card title="Comment ça marche 🧠" color="border-l-4 border-violet-500">
          On est ta BFF du kiff : des bons plans livrés sur un plateau, des événements qui te sortent de ta routine, et une communauté qui te dit "t’es assez, viens kiffer !"
        </Card>
      </section>

      {/* Ce qu’on te promet */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12 animate-fade-in">
            Avec nous, attends-toi à ça
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <Coffee className="w-12 h-12 text-pink-500 mx-auto mb-4 animate-pulse" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Du kiff à chaque coin de rue</h3>
              <p className="text-gray-600">Un spa à -30% après une journée pourrie ? Oui. Un apéro à 5 € avec des inconnues qui deviennent des potes ? Oui aussi.</p>
            </div>
            <div className="text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Heart className="w-12 h-12 text-rose-500 mx-auto mb-4 animate-pulse" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Une vibe qui te ressemble</h3>
              <p className="text-gray-600">Pas de jugement, juste des meufs qui rient trop fort, partagent leurs galères et célèbrent chaque victoire.</p>
            </div>
            <div className="text-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <Sparkles className="w-12 h-12 text-yellow-400 mx-auto mb-4 animate-pulse" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Ta révolution perso</h3>
              <p className="text-gray-600">Oublie la culpabilité. Ici, tu kiffes, tu brilles, et tu reprends les rênes de ta vie.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Rhodia - Émotionnelle et fun */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4 animate-fade-in">Moi, Rhodia, ta complice du kiff 💕</h2>
          <p className="text-lg text-gray-600 animate-fade-in-up">
            Teste à 12,99€, puis accès premium complet à 39,99€. Plus de 120€ de valeur chaque mois !
          </p>
        </div>
        <ul className="timeline space-y-12 relative border-l-4 border-pink-500 pl-8">
          {[
            { title: "La pote qui te secoue", text: "Celle qui te sort de ton canapé avec une blague débile et un plan fun.", icon: <Coffee className="w-8 h-8 text-pink-500" /> },
            { title: "La maman warrior", text: "Deux nanas à la maison, un agenda qui déborde, mais une furieuse envie de vivre.", icon: <Heart className="w-8 h-8 text-rose-500" /> },
            { title: "L’ex-carrée", text: "15 ans à bosser dur, jusqu’à ce que je dise : stop, on mérite mieux.", icon: <Calendar className="w-8 h-8 text-gray-600" /> },
            { title: "La reine des plans", text: "100+ soirées, ateliers, fous rires : je fais ça pour qu’on vibre ensemble.", icon: <Users className="w-8 h-8 text-violet-500" /> },
            { title: "La meuf qui ose", text: "Je chante, j’écris, je crée — et je veux te voir briller aussi fort que moi.", icon: <Paintbrush className="w-8 h-8 text-yellow-400" /> },
          ].map(({ title, text, icon }, i) => (
            <li key={i} className="relative animate-slide-up" style={{ animationDelay: `${i * 0.2}s` }}>
              <div className="absolute -left-10 top-0 w-12 h-12 bg-white rounded-full border-4 border-pink-500 flex items-center justify-center">
                {icon}
              </div>
              <div className="ml-6">
                <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
                <p className="text-gray-600">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA - Engagé et fun */}
      <section className="text-center py-20 px-6 bg-yellow-100">
        <h3 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900 animate-fade-in">
          T’en as pas marre de juste survivre ?
        </h3>
        <p className="text-xl text-gray-600 mb-8 animate-fade-in-up">
          Viens kiffer avec nous. Offre spéciale jusqu’au 15 avril — sois dans les premières à tout changer !
        </p>
        <Link
          to="/subscription"
          className="inline-flex items-center px-8 py-4 bg-pink-500 text-white text-lg font-semibold rounded-full hover:bg-pink-600 shadow-lg transition-all animate-bounce-slow"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Je signe pour le kiff !
        </Link>
      </section>
    </div>
  );
}

function Card({ title, children, color }) {
  return (
    <div className={`p-6 rounded-xl bg-white shadow-md ${color} animate-slide-up`}>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{children}</p>
    </div>
  );
}

// Animations
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
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
  .animate-fade-in { animation: fade-in-down 1s ease-out; }
  .animate-fade-in-up { animation: fade-in-up 1s ease-out; }
  .animate-slide-up { animation: slide-up 0.8s ease-out; }
  .animate-bounce-slow { animation: bounce-slow 2s infinite; }
  .animate-pulse { animation: pulse 1.5s infinite; }
`;