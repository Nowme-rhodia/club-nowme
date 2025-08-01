// --- FICHIER COMPLET : Home.tsx corrigé ---

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { Sparkles, MapPin, ChevronRight, Star } from 'lucide-react';
import { SEO } from '../components/SEO';

export function Home() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: 'Users',
      title: 'Validé par des meufs comme toi',
      description: 'Chaque événement, chaque partenaire : testé et approuvé par notre communauté premium.'
    },
    {
      icon: 'Star',
      title: 'Plus de 120€ de valeur',
      description: 'Événements, box, masterclass, consultations : tout inclus pour 39,99€.'
    },
    {
      icon: 'Shield',
      title: 'Zéro stress, 100% liberté',
      description: 'Teste à 12,99€, résilie en 1 clic, kiffe quand tu veux.'
    },
    {
      icon: 'Search',
      title: 'Communauté premium',
      description: 'Masterclass, événements exclusifs, groupe privé : ta tribu t\'attend.'
    }
  ];

  const testimonials = [
    {
      name: "Marie L.",
      role: "Entrepreneuse",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150",
      quote: "Un apéro à 5 € qui m'a fait rire aux larmes. Nowme, c'est ma bouffée d'air !"
    },
    {
      name: "Sophie D.",
      role: "Maman active",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
      quote: "Enfin du temps pour moi sans culpabiliser. Les massages à -30%, un rêve !"
    },
    {
      name: "Léa P.",
      role: "Créative",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
      quote: "Un atelier poterie qui m'a reconnectée à moi-même. Merci Nowme !"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <SEO 
        title="Nowme - Ton kiff commence ici"
        description="Massages, sorties, ateliers : l'abonnement qui te redonne le contrôle en Île-de-France."
      />

      {/* Hero Section */}
      <div className="relative min-h-[90vh] bg-white flex items-center overflow-hidden border-b-4 border-pink-500">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1571388208497-71bedc66e932?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10 animate-subtle-zoom" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className={`text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight mb-6 animate-fade-in-down ${scrollY > 50 ? 'opacity-0' : 'opacity-100'}`}>Marre de juste survivre ?<span className="text-pink-500 block">Kiffe enfin TA vie !</span></h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto animate-fade-in-up">
              Communauté premium, événements exclusifs, masterclass expertes : Nowme Club, c'est TON abonnement pour reprendre le contrôle en Île-de-France.
            </p>
            <p className="text-lg text-pink-600 font-semibold mb-12 animate-pulse">
              Découverte : 1er mois à 12,99€, puis accès premium à 39,99€ !
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

      {/* Avantages */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-16">
            Pourquoi Nowme va changer ton quotidien
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = LucideIcons[feature.icon];
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 text-center shadow-md hover:shadow-lg transition-all animate-slide-up"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-100 mb-6">
                    {Icon && <Icon className="w-8 h-8 text-pink-500" />}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CTA rapide */}
      <div className="py-12 px-4 bg-yellow-50 border-t border-b border-yellow-200">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Rejoins les 500+ femmes qui ont décidé de kiffer
          </h2>
          <p className="text-gray-700 text-lg mb-6">
            Commence dès aujourd’hui. Sans engagement. Sans excuses.
          </p>
          <Link
            to="/subscription"
            className="inline-flex items-center px-6 py-3 bg-pink-500 text-white font-medium rounded-full hover:bg-pink-600 transition-all"
          >
            <ChevronRight className="w-5 h-5 mr-2" /> Je m’abonne
          </Link>
        </div>
      </div>

      {/* Témoignages */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-16">
            Elles kiffent déjà, et toi ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="bg-pink-50 rounded-xl p-6 hover:shadow-lg transition-all animate-slide-up"
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <img src={t.image} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{t.name}</h3>
                    <p className="text-sm text-gray-500">{t.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 italic">"{t.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
