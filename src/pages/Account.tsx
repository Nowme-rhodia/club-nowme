import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { useAuth } from '../lib/auth';
import { logger } from '../lib/logger';
import {
  User,
  Settings,
  CreditCard,
  History,
  Heart,
  LogOut,
  QrCode,
  Calendar
} from 'lucide-react';

export default function Account() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  useEffect(() => {
    logger.navigation.pageLoad('/account', { profile });
  }, [profile]);

  const handleLogout = async () => {
    logger.navigation.userAction('logout', { userId: profile?.user_id });
    await signOut();
    navigate('/');
  };

  const handleManageSubscription = async () => {
    try {
      console.log('🔍 Redirection vers Stripe Customer Portal...');

      // Vérifier si on a le stripe_customer_id
      let stripeCustomerId: string | undefined = profile?.stripe_customer_id;

      if (!stripeCustomerId) {
        console.log('⚠️ stripe_customer_id non trouvé dans le profil, récupération depuis user_profiles...');

        // Récupérer depuis user_profiles
        const { supabase } = await import('../lib/supabase');
        const { data: userData, error } = await supabase
          .from('user_profiles')
          .select('stripe_customer_id')
          .eq('user_id', profile?.user_id || '')
          .single() as any;

        if (error || !userData?.stripe_customer_id) {
          console.error('❌ Impossible de récupérer le stripe_customer_id:', error);
          alert('Erreur : Impossible de récupérer vos informations d\'abonnement. Veuillez réessayer.');
          return;
        }

        stripeCustomerId = userData.stripe_customer_id;
        console.log('✅ stripe_customer_id récupéré:', stripeCustomerId);
      }

      // Créer une session Stripe Customer Portal
      const apiUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      console.log('📡 Appel de l\'Edge Function create-portal-session...');

      const response = await fetch(`${apiUrl}/functions/v1/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          customerId: stripeCustomerId,
          returnUrl: window.location.origin + '/account'
        })
      });

      const data = await response.json();

      if (data.url) {
        console.log('✅ URL du portail reçue, redirection...');
        // Rediriger vers le portail Stripe
        window.location.href = data.url;
      } else {
        console.error('❌ Erreur lors de la création de la session portail:', data);
        alert('Erreur : Impossible de créer la session portail. Veuillez réessayer.');
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      alert('Erreur : Une erreur est survenue. Veuillez réessayer.');
    }
  };

  const menuItems = [
    {
      title: 'Mes réservations',
      icon: Calendar,
      href: '/my-bookings',
      description: 'Voir mes kiffs réservés et passés',
      onClick: null
    },
    {
      title: 'Mes informations',
      icon: User,
      href: '/account/profile',
      description: 'Gérer mes informations personnelles',
      onClick: null
    },
    {
      title: 'Mon abonnement',
      icon: CreditCard,
      href: '#',
      description: 'Gérer mon abonnement Stripe',
      onClick: handleManageSubscription
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
              <p className="text-gray-500 mb-2">
                Membre depuis {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                  : 'récemment'
                }
              </p>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                {profile?.subscription_status === 'active' ? 'Premium actif' : 'Compte actif'}
              </div>
            </div>
          </div>
        </div>

        {/* Informations d'abonnement détaillées */}
        <div className="bg-white rounded-xl shadow-soft p-6 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">Mon abonnement</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Type :</span>
                <span className="font-medium">
                  {profile?.subscription_type === 'discovery' ? 'Découverte (12,99€)' : 'Premium (39,99€)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Statut :</span>
                <span className="text-green-600 font-medium">Actif</span>
              </div>
              {profile?.subscription_type === 'discovery' && (
                <div className="mt-3 p-3 bg-primary/5 rounded-lg">
                  <p className="text-sm text-primary font-medium">
                    🎉 Prochain mois : Accès premium complet pour 39,99€
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Menu de navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {menuItems.map((item) => (
            item.onClick ? (
              <button
                key={item.title}
                onClick={item.onClick}
                className="bg-white rounded-xl p-6 shadow-soft hover:shadow-lg transition-all duration-300 group text-left w-full cursor-pointer"
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
              </button>
            ) : (
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
            )
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