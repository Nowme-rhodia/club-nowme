import React, { useState, useEffect } from 'react';
import { CreditCard, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
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

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      const { data, error } = await supabase
        .from('partners')
        .select('payout_iban, stripe_account_id, calendly_url')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setIban(data.payout_iban || '');
        setStripeId(data.stripe_account_id || '');
        setCalendlyUrl(data.calendly_url || '');
      }
    };
    loadData();
  }, [user]);

  const handleSave = async () => {
    try {
      if (!user) return;
      const { error } = await supabase
        .from('partners')
        .update({
          payout_iban: iban,
          stripe_account_id: stripeId,
          calendly_url: calendlyUrl
        })
        .eq('user_id', user.id);

      if (error) throw error;
      setSuccess('Paramètres de paiement mis à jour');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Erreur lors de la mise à jour");
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Paramètres</h1>

        {/* Onglets */}
        <div className="flex border-b mb-6">
          <Link
            to="/partner/settings/general"
            className={`px-4 py-2 -mb-px border-b-2 ${
              location.pathname.includes("general")
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Général
          </Link>
          <Link
            to="/partner/settings/payments"
            className={`ml-6 px-4 py-2 -mb-px border-b-2 ${
              location.pathname.includes("payments")
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Paiements & Agenda
          </Link>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Paiements */}
          <div className="bg-white rounded-xl p-6 shadow-soft">
            <div className="flex items-center gap-3 mb-6">
              <CreditCard className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">
                Paiements
              </h2>
            </div>
            <input
              type="text"
              placeholder="IBAN"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              className="w-full mb-4 px-4 py-3 border rounded-lg"
            />
            <input
              type="text"
              placeholder="Stripe Account ID"
              value={stripeId}
              onChange={(e) => setStripeId(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg"
            />
          </div>

          {/* Agenda global */}
          <div className="bg-white rounded-xl p-6 shadow-soft">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">
                Agenda global (Calendly)
              </h2>
            </div>
            <input
              type="url"
              placeholder="https://calendly.com/votre-agenda"
              value={calendlyUrl}
              onChange={(e) => setCalendlyUrl(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg"
            />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
