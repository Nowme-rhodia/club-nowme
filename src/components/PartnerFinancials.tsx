import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function PartnerFinancials() {
    const [partner, setPartner] = useState<any>(null);
    const [payouts, setPayouts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();

        // Check for success/refresh URL params from Stripe redirect
        const url = new URL(window.location.href);
        if (url.searchParams.get('success')) {
            alert('Informations bancaires mises à jour avec succès !');
        }
    }, []);

    async function loadData() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get Partner
            const { data: profile } = await supabase.from('user_profiles').select('partner_id').eq('user_id', user.id).single();

            if (profile?.partner_id) {
                const { data: partnerData } = await supabase
                    .from('partners')
                    .select('*')
                    .eq('id', profile.partner_id)
                    .single();
                setPartner(partnerData);

                // 2. Get Payouts
                const { data: payoutsData } = await supabase
                    .from('payouts')
                    .select('*')
                    .eq('partner_id', profile.partner_id)
                    .order('period_start', { ascending: false });

                setPayouts(payoutsData || []);
            }
        } catch (error) {
            console.error('Error loading financials:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleConfigurePayouts() {
        try {
            setLoading(true);
            const { data, error } = await supabase.functions.invoke('create-connect-account', {
                method: 'POST',
            });

            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url;
            }
        } catch (error: any) {
            console.error('Error creating connect account:', error);
            // Try to extract the error message from the response if possible (Supabase functions sometimes return it in specific ways)
            const message = error?.context?.json?.error || error?.message || "Erreur inconnue";
            alert(`Erreur Stripe : ${message}`);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="p-8 text-center">Chargement...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-xl font-semibold mb-1">Virements Automatiques</h2>
                    <p className="text-gray-600 text-sm">Gérez vos coordonnées bancaires pour recevoir vos gains.</p>
                </div>

                {partner?.stripe_charges_enabled ? (
                    <div className="flex items-center text-green-600 font-medium bg-green-50 px-4 py-2 rounded-full">
                        <span className="mr-2">✓</span> Compte relié (Stripe Express)
                    </div>
                ) : (
                    <button
                        onClick={handleConfigurePayouts}
                        className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
                    >
                        Configurer mes virements
                    </button>
                )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-semibold">Historique des Virements</h3>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 text-sm">
                        <tr>
                            <th className="px-6 py-3">Période</th>
                            <th className="px-6 py-3">Montant Net</th>
                            <th className="px-6 py-3">Statut</th>
                            <th className="px-6 py-3">Document</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {payouts.map(payout => (
                            <tr key={payout.id}>
                                <td className="px-6 py-4 text-sm">
                                    {new Date(payout.period_start).toLocaleDateString()} - {new Date(payout.period_end).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 font-medium">
                                    {payout.net_payout_amount} €
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${payout.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {payout.status === 'paid' ? 'Payé' : 'En attente'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {payout.statement_url ? (
                                        <a
                                            href={payout.statement_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-purple-600 hover:text-purple-800 underline flex items-center gap-1"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                            PDF
                                        </a>
                                    ) : (
                                        '-'
                                    )}
                                </td>
                            </tr>
                        ))}
                        {payouts.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm">
                                    Aucun virement pour le moment.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
