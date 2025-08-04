import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { CreditCard, Calendar, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

interface SubscriptionInfo {
  status: string;
  type: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
}

export function SubscriptionManager() {
  const { profile, user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setSubscription({
        status: profile.subscription_status || 'inactive',
        type: profile.subscription_type || 'none',
        stripe_customer_id: profile.stripe_customer_id,
        stripe_subscription_id: profile.stripe_subscription_id
      });
      setLoading(false);
    }
  }, [profile]);

  const handleManageSubscription = async () => {
    if (!subscription?.stripe_customer_id) {
      toast.error('Informations d\'abonnement manquantes');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            customerId: subscription.stripe_customer_id,
            returnUrl: window.location.href
          })
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la création de la session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de l\'ouverture du portail de gestion');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription?.stripe_subscription_id) {
      toast.error('Informations d\'abonnement manquantes');
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir annuler votre abonnement ?')) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-subscription`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            subscriptionId: subscription.stripe_subscription_id,
            userId: user?.id
          })
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de l\'annulation');
      }

      toast.success('Abonnement annulé. Il restera actif jusqu\'à la fin de la période.');
      
      // Recharger les données
      window.location.reload();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de l\'annulation');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'past_due': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'cancelled': return 'Annulé';
      case 'past_due': return 'Paiement en retard';
      case 'pending': return 'En attente';
      default: return status;
    }
  };

  const getPlanLabel = (type: string) => {
    switch (type) {
      case 'monthly': return 'Mensuel (27€ puis 39,99€)';
      case 'yearly': return 'Annuel (399€)';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-soft p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-soft p-6">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold text-gray-900">Mon abonnement</h2>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Plan :</span>
          <span className="font-medium">{getPlanLabel(subscription?.type || 'none')}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Statut :</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(subscription?.status || 'inactive')}`}>
            {getStatusLabel(subscription?.status || 'inactive')}
          </span>
        </div>

        {subscription?.current_period_end && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Prochaine facturation :</span>
            <span className="font-medium">
              {new Date(subscription.current_period_end).toLocaleDateString('fr-FR')}
            </span>
          </div>
        )}

        {subscription?.cancel_at_period_end && (
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Abonnement en cours d'annulation</span>
            </div>
            <p className="text-sm text-orange-600 mt-1">
              Votre abonnement se terminera le {new Date(subscription.current_period_end!).toLocaleDateString('fr-FR')}
            </p>
          </div>
        )}

        <div className="pt-4 border-t border-gray-200 space-y-3">
          {subscription?.status === 'active' && !subscription?.cancel_at_period_end && (
            <>
              <button
                onClick={handleManageSubscription}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                {actionLoading ? 'Chargement...' : 'Gérer mon abonnement'}
              </button>
              
              <button
                onClick={handleCancelSubscription}
                disabled={actionLoading}
                className="w-full px-4 py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                Annuler mon abonnement
              </button>
            </>
          )}

          {subscription?.status !== 'active' && (
            <a
              href="/subscription"
              className="block w-full text-center px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Reprendre mon abonnement
            </a>
          )}
        </div>
      </div>
    </div>
  );
}