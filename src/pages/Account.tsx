import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { useAuth } from '../lib/auth';
import { 
  User, 
  Settings, 
  CreditCard, 
  History, 
  Heart, 
  LogOut,
  QrCode
} from 'lucide-react';

export default function Account() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const menuItems = [
    {
      title: 'Mes informations',
      icon: User,
      href: '/account/profile',
      description: 'Gérer mes informations personnelles'
    },
    {
      title: 'Mon abonnement',
      icon: CreditCard,
      href: '/account/subscription',
      description: 'Voir les détails de mon abonnement'
    },
    {
      title: 'Mon QR Code',
      icon: QrCode,
      href: '/account/qr-code',
      description: 'Accéder à mon QR code personnel'
    },
    {
      title: 'Mes kiffs',
      icon: Heart,
      href: '/account/favorites',
      description: 'Voir mes activités favorites'
    },
    {
      title: 'Historique',
      icon: History,
      href: '/account/history',
      description: 'Consulter mes réservations passées'
    },
    {
      title: 'Paramètres',
      icon: Settings,
      href: '/account/settings',
      description: 'Gérer mes préférences'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F4] via-white to-[#FDF8F4] py-12">
      <SEO 
        title="Mon compte"
        description="Gérez votre compte Nowme, vos réservations et vos préférences."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête du compte */}
        <div className="bg-white rounded-2xl shadow-soft p-8 mb-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              {profile?.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt="Photo de profil"
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-12 h-12 text-primary" />
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-4 border-white">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {profile?.first_name} {profile?.last_name}
              </h1>
              <p className="text-gray-500 mb-2">Membre depuis janvier 2024</p>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                Abonnement actif
              </div>
            </div>
          </div>
        </div>

        {/* Menu de navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <a
              key={item.title}
              href={item.href}
              className="bg-white rounded-xl p-6 shadow-soft hover:shadow-lg transition-all duration-300 group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
                  <item.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Bouton de déconnexion */}
        <div className="mt-8 text-center">
          <button
            onClick={handleLogout}
            className="inline-flex items-center px-6 py-3 text-gray-700 hover:text-primary transition-colors"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}