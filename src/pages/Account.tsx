import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { useAuth } from '../lib/auth';
import { logger } from '../lib/logger';
import { supabase } from '../lib/supabase';
import {
  User,
  Settings,
  CreditCard,
  History,
  Heart,
  LogOut,
  QrCode,
  Calendar,
  Mail
} from 'lucide-react';

export default function Account() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  // Notification Preferences State
  const [notificationPrefs, setNotificationPrefs] = useState({
    sub_auto_recap: true,
    sub_newsletter: true
  });

  useEffect(() => {
    logger.navigation.pageLoad('/account', { profile });
    if (profile) {
      setNotificationPrefs({
        sub_auto_recap: profile.sub_auto_recap ?? true, // Default true if null
        sub_newsletter: profile.sub_newsletter ?? true
      });
    }
  }, [profile]);

  const handleLogout = async () => {
    logger.navigation.userAction('logout', { userId: profile?.user_id });
    await signOut();
    navigate('/');
  };

  const handleToggleNotification = async (key: 'sub_auto_recap' | 'sub_newsletter') => {
    if (!profile) return;

    const newValue = !notificationPrefs[key];

    // Optimistic Update
    setNotificationPrefs(prev => ({ ...prev, [key]: newValue }));

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ [key]: newValue })
        .eq('user_id', profile.user_id);

      if (error) throw error;
      console.log(`Updated ${key} to ${newValue}`);
    } catch (err) {
      console.error('Failed to update notification preference', err);
      // Revert on error
      setNotificationPrefs(prev => ({ ...prev, [key]: !newValue }));
      alert('Erreur lors de la mise à jour des préférences.');
    }
  };

  const handleManageSubscription = async () => {
    try {
      console.log('🔍 Redirection vers Stripe Customer Portal...');

      // Vérifier si on a le stripe_customer_id
      let stripeCustomerId: string | undefined = profile?.stripe_customer_id;

      if (!stripeCustomerId) {
        console.log('⚠️ stripe_customer_id non trouvé dans le profil, récupération depuis user_profiles...');

        // Récupérer depuis user_profiles
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

      // 5. Sanitize Customer ID (Hotfix for corrupted DB data)
      if (stripeCustomerId && typeof stripeCustomerId === 'string' && stripeCustomerId.trim().startsWith('{')) {
        console.warn('⚠️ Malformed stripe_customer_id detected (JSON), attempting to parse...');
        try {
          const parsed = JSON.parse(stripeCustomerId);
          if (parsed.id) {
            stripeCustomerId = parsed.id;
            console.log('✅ Corrected stripe_customer_id:', stripeCustomerId);
          }
        } catch (e) {
          console.error('Failed to parse malformed customer ID:', e);
        }
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


        {/* --- RESTRICTED VIEW FOR UNPAID USERS --- */}
        {profile?.subscription_status !== 'active' && !profile?.is_admin && (
          <div className="bg-white rounded-xl shadow-soft p-8 mb-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Votre abonnement n'est pas actif
            </h2>
            <p className="text-gray-600 mb-6 max-w-lg mx-auto">
              Vous avez créé votre compte mais n'avez pas encore finalisé votre abonnement.
              Pour accéder à tous vos avantages Nowme, veuillez finaliser votre paiement.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate(`/checkout?plan=${profile?.selected_plan || 'monthly'}`)}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-primary hover:bg-primary-dark transition-colors"
              >
                Finaliser mon abonnement
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Se déconnecter
              </button>
            </div>
          </div>
        )}

        {/* --- NORMAL DASHBOARD FOR ACTIVE USERS --- */}
        {(profile?.subscription_status === 'active' || profile?.is_admin) && (
          <>
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

            {/* Mes newsletter du kiff */}
            <div className="bg-white rounded-xl shadow-soft p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Mail className="w-5 h-5 mr-2 text-primary" />
                Mes newsletter du kiff
              </h3>
              <div className="space-y-4">
                {/* Le Récap des Kiffs */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Le Récap des Kiffs</p>
                    <p className="text-sm text-gray-500">Chaque mardi à 6h30, les nouveautés de la semaine.</p>
                  </div>
                  <button
                    onClick={() => handleToggleNotification('sub_auto_recap')}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${notificationPrefs.sub_auto_recap ? 'bg-primary' : 'bg-gray-200'
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${notificationPrefs.sub_auto_recap ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>

                {/* La Newsletter du Kiff */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">La Newsletter du Kiff</p>
                    <p className="text-sm text-gray-500">Chaque vendredi à 6h00, l'inspiration du moment.</p>
                  </div>
                  <button
                    onClick={() => handleToggleNotification('sub_newsletter')}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${notificationPrefs.sub_newsletter ? 'bg-primary' : 'bg-gray-200'
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${notificationPrefs.sub_newsletter ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </button>
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
          </>
        )}
      </div>
    </div >
  );
}