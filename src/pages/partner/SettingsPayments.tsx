import React, { useState, useEffect } from 'react';
import { CreditCard, Calendar, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

export default function SettingsPayments() {
  const location = useLocation();
  const { user } = useAuth();
  const [iban, setIban] = useState('');
  const [stripeId, setStripeId] = useState('');
  const [calendlyUrl, setCalendlyUrl] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStripe, setLoadingStripe] = useState(false);

  const handleConnectStripe = async () => {
    try {
      setLoadingStripe(true);
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        method: 'POST',
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('Error creating connect account:', err);
      const message = err?.context?.json?.error || err?.message || "Erreur inconnue";
      setError(`Erreur Stripe : ${message}`);
    } finally {
      setLoadingStripe(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      // 1. Get partner_id from profile (or user_profiles if needed)
      let partnerId = null;

      // Try fetching from user_profiles to be sure
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('partner_id')
        .eq('user_id', user.id)
        .single();

      if ((userProfile as any)?.partner_id) {
        partnerId = (userProfile as any).partner_id;
      }

      if (!partnerId) return;

      const { data, error } = await supabase
        .from('partners')
        .select('payout_iban, stripe_account_id, calendly_url')
        .eq('id', partnerId)
        .single();

      if (!error && data) {
        setIban((data as any).payout_iban || '');
        setStripeId((data as any).stripe_account_id || '');
        setCalendlyUrl((data as any).calendly_url || '');
      }
    };
    loadData();
  }, [user]);

  const handleSave = async () => {
    try {
      if (!user) return;
      // Resolve partner_id again (or store it in state, but lookup is safer for now)
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('partner_id')
        .eq('user_id', user.id)
        .single();

      if (!(userProfile as any)?.partner_id) throw new Error("Partenaire introuvable");

      const { error } = await supabase
        .from('partners')
        .update({
          payout_iban: iban,
          stripe_account_id: stripeId,
          calendly_url: calendlyUrl
        } as any)
        .eq('id', (userProfile as any).partner_id);

      if (error) throw error;
      setSuccess('Paramètres de paiement mis à jour');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Erreur lors de la mise à jour");
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Paramètres</h1>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 mb-8 bg-white rounded-t-lg px-4 pt-2 shadow-sm">
          <Link
            to="/partner/settings/general"
            className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm transition-all ${location.pathname.includes("general")
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
          >
            Général & Profil
          </Link>
          <Link
            to="/partner/settings/payments"
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-all ${location.pathname.includes("payments")
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
          >
            Paiements & Agenda
          </Link>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-center animate-in fade-in">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <p className="text-sm font-medium text-green-800">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-center animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Paiements */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="bg-primary/10 p-2.5 rounded-lg w-fit">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Paiements & Facturation</h2>
                <p className="text-sm text-gray-500">Gérez vos encaissements et vos mandats.</p>
              </div>
            </div>

            {/* Mandat de Facturation Alert */}
            <div className="px-6 pt-6">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className="text-xl">📜</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Mandat de Facturation Activé</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        En utilisant Nowme pour vos réservations, vous nous donnez mandat pour émettre les factures en votre nom et pour votre compte (Article 289 du CGI).
                      </p>
                      <p className="mt-2">
                        <strong>Ce que cela signifie :</strong>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          <li>Nowme génère automatiquement la facture client avec VOS informations légales.</li>
                          <li>Vous n'avez pas besoin de refaire une facture pour le client.</li>
                          <li>Vous recevez chaque mois un relevé de reddition de comptes récapitulant vos ventes.</li>
                        </ul>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">IBAN</label>
                <input
                  type="text"
                  placeholder="FR76 ...."
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary transition-shadow"
                />
                <p className="text-xs text-gray-500 mt-1">Sert uniquement de référence. Les virements sont gérés via le compte Stripe connecté.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Identifiant de compte Stripe (Connecté)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Non connecté"
                    value={stripeId}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 bg-gray-50 text-gray-500 rounded-lg shadow-sm font-mono text-sm cursor-not-allowed"
                  />
                  {stripeId ? (
                    <span className="inline-flex items-center px-4 py-2 rounded-lg bg-green-100 text-green-800 font-medium text-sm">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Actif
                    </span>
                  ) : (
                    <button
                      onClick={handleConnectStripe}
                      disabled={loadingStripe}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition text-sm font-medium whitespace-nowrap disabled:opacity-50"
                    >
                      {loadingStripe ? 'Connexion en cours...' : 'Connecter Stripe'}
                    </button>
                  )}

                  {/* Tooltip Info */}
                  <div className="relative group flex items-center">
                    <Info className="w-5 h-5 text-gray-400 cursor-help hover:text-primary transition-colors" />
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 text-center shadow-lg">
                      Ceci est une passerelle de paiement sécurisée pour recevoir vos gains directement sur votre compte bancaire. Ce n'est pas un compte Stripe classique : aucune gestion ni action n'est requise de votre part.
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Nécessaire pour recevoir vos fonds automatiquement après chaque réservation.
                </p>
              </div>
            </div>
          </section>

          {/* Agenda global */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="bg-primary/10 p-2.5 rounded-lg w-fit">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Lien de réservation par défaut</h2>
                <p className="text-sm text-gray-500">
                  Ce lien sera utilisé par défaut si vous ne spécifiez pas de lien différent pour chaque offre.
                  (Ex: Doctolib, Planity, Calendly, Google Agenda...)
                </p>
              </div>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Votre lien d'agenda</label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://simulation-agenda.com/..."
                  value={calendlyUrl}
                  onChange={(e) => setCalendlyUrl(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary transition-shadow"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Historique des reversements */}
        <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-900">Historique des reversements</h2>
          </div>
          <div className="p-6">
            <PayoutHistory />
          </div>
        </div>
      </div>

      {/* Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 md:pl-64">
        <div className="max-w-4xl mx-auto flex justify-end">
          <button
            onClick={handleSave}
            className="px-8 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all shadow-lg hover:shadow-primary/25 transform active:scale-95 flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

function PayoutHistory() {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadPayouts();
  }, [user]);

  const loadPayouts = async () => {
    try {
      // 1. Get partner_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('partner_id')
        .eq('user_id', user?.id as any)
        .single();

      if (!(profile as any)?.partner_id) return;

      // 2. Get payouts
      const { data, error } = await supabase
        .from('payouts')
        .select('*')
        .eq('partner_id', (profile as any).partner_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayouts(data || []);
    } catch (err) {
      console.error("Error loading payouts:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Chargement...</p>;

  if (payouts.length === 0) {
    return <p className="text-gray-500 text-center py-4">Aucun reversement pour le moment.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Période</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Montant Net</th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Statut</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Document</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {payouts.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-3 text-sm text-gray-700">
                {new Date(p.period_start).toLocaleDateString()} - {new Date(p.period_end).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(p.net_payout_amount)}
              </td>
              <td className="px-4 py-3 text-center">
                {p.status === 'paid' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Payé
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    En attente
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {p.statement_url ? (
                  <a
                    href={p.statement_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary-dark text-sm font-medium"
                  >
                    Télécharger
                  </a>
                ) : (
                  <span className="text-gray-400 text-sm">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
