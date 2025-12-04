import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, ArrowRight } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { SEO } from '../../components/SEO';

export default function ClubDashboard() {
  const { profile } = useAuth();

  const clubFeatures = [
    {
      title: 'Événements',
      description: 'Tous les événements du club',
      icon: Calendar,
      path: '/club/events',
      available: true,
      highlight: 'Apéros, ateliers, sorties'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F4] via-white to-[#FDF8F4] py-12">
      <SEO 
        title="Mon Club Nowme"
        description="Accédez à tous vos avantages club : événements, masterclasses, consultations et plus"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Bienvenue dans ton Club Nowme ! 
          </h1>
          <p className="text-gray-600 text-lg">
            Découvre tous les événements et rejoins la communauté
          </p>
        </div>

        {/* Grille des fonctionnalités */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {clubFeatures.map((feature) => (
            <div
              key={feature.title}
              className={`
                relative bg-white rounded-2xl shadow-lg p-8 transition-all duration-300
                ${feature.available 
                  ? 'hover:shadow-xl hover:-translate-y-1 cursor-pointer' 
                  : 'opacity-75'
                }
              `}
            >
              {!feature.available && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                  Premium requis
                </div>
              )}

              <div className="flex items-start gap-6">
                <div className={`
                  p-4 rounded-xl
                  ${feature.available ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}
                `}>
                  <feature.icon className="w-8 h-8" />
                </div>

                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 mb-3">
                    {feature.description}
                  </p>
                  <p className="text-sm text-primary font-medium mb-4">
                    {feature.highlight}
                  </p>

                  {feature.available ? (
                    <Link
                      to={feature.path}
                      className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary-dark transition-colors"
                    >
                      Accéder
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  ) : (
                    <Link
                      to="/subscription"
                      className="inline-flex items-center px-6 py-3 border-2 border-primary text-primary rounded-full font-medium hover:bg-primary/5 transition-colors"
                    >
                      Débloquer
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Section communauté */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Rejoins la communauté !
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Partage tes expériences, trouve des copines pour tes sorties, et découvre les bons plans de la communauté.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://chat.whatsapp.com/nowme-club"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-green-500 text-white rounded-full font-medium hover:bg-green-600 transition-colors"
            >
              <Users className="w-5 h-5 mr-2" />
              Groupe WhatsApp
            </a>
            <Link
              to="/communaute"
              className="inline-flex items-center px-6 py-3 border-2 border-primary text-primary rounded-full font-medium hover:bg-primary/5 transition-colors"
            >
              En savoir plus
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}