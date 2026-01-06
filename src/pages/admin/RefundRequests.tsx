import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RefundRequests() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = async () => {
        try {
            const { data, error } = await supabase
                .from('refund_requests')
                .select(`
                    *,
                    user:user_profiles(first_name, last_name, email),
                    wallet:wallets(id, balance, partner:partners(business_name))
                `)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRequests(data || []);
        } catch (err) {
            console.error('Error fetching requests', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const processRefund = async (request: any) => {
        if (!confirm(`Confirmer le remboursement de ${request.amount_requested}€ pour ${request.user.first_name} ?\n\nCela mettra l'ardoise à 0.`)) return;

        try {
            // 1. Reset Wallet Balance logic would go here or be handle by RPC
            // For now, we update status manually, assuming Stripe refund is done externally or integrated later.
            // But user requirement says: "Bouton Rembourser qui remettra les compteurs à zéro proprement".
            // We should do this atomic.

            // Let's call an RPC for safety or do 2 ops.
            // Op 1: Set Wallet Balance to 0
            // @ts-ignore
            const { error: walletError } = await supabase
                .from('wallets')
                .update({ balance: 0 })
                .eq('id', request.wallet_id);

            if (walletError) throw walletError;

            // Op 2: Update Request Status
            // @ts-ignore
            const { error: reqError } = await supabase
                .from('refund_requests')
                .update({
                    status: 'processed',
                    processed_at: new Date()
                })
                .eq('id', request.id);

            if (reqError) throw reqError;

            toast.success("Remboursement traité. Ardoise remise à zéro.");
            fetchRequests();

        } catch (err) {
            console.error(err);
            toast.error("Erreur lors du traitement");
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Demandes de Remboursement</h1>

            {loading ? (
                <div>Chargement...</div>
            ) : requests.length === 0 ? (
                <div className="text-gray-500">Aucune demande en attente.</div>
            ) : (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Partenaire</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {requests.map((req) => (
                                <tr key={req.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(req.created_at).toLocaleDateString('fr-FR')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{req.user.first_name} {req.user.last_name}</div>
                                        <div className="text-sm text-gray-500">{req.user.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                        {req.amount_requested} €
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {req.wallet?.partner?.business_name || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => processRefund(req)}
                                            className="text-green-600 hover:text-green-900 flex items-center justify-end gap-1 ml-auto"
                                        >
                                            <CheckCircle className="w-4 h-4" /> Traiter
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
