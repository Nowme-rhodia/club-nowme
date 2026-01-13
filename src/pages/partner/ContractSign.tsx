import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import MandateContractTemplate from '../../components/admin/MandateContractTemplate';
import { Loader, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PartnerContractSign() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [partner, setPartner] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [signing, setSigning] = useState(false);

    useEffect(() => {
        if (user) {
            loadPartner();
        }
    }, [user]);

    const loadPartner = async () => {
        // Determine which partner record belongs to this user
        // Assuming partner_id is in user_metadata or we query by contact_email/owner_id
        // But currently partners table doesn't have owner_id linked to auth.users strict FK often
        // We usually link via user_metadata.partner_id or email.
        // Let's assume user.id is NOT partner.id directly, but we might have stored it.
        // Based on previous files, we often look up partner by user_id if we added a column, 
        // OR we use the user's role metadata. 
        // Let's try to fetch partner where user_id matches OR if we have to look up.

        // Quick fix: User should be mapped. Let's try fetching by user properties or if we have a direct link.
        // Browsing recent code, we usually rely on `user.user_metadata.partner_id`.

        const partnerId = user?.user_metadata?.partner_id;

        if (!partnerId) {
            toast.error("Compte partenaire non lié.");
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from('partners')
            .select('*')
            .eq('id', partnerId)
            .single();

        if (error) {
            console.error('Error loading partner:', error);
            toast.error("Erreur chargement partenaire");
        } else {
            if (data.contract_signed_at) {
                // Already signed
                navigate('/partner/dashboard');
            }
            setPartner(data);
        }
        setLoading(false);
    };

    const handleSign = async () => {
        if (!permission) return;
        setSigning(true);

        try {
            const { error } = await supabase
                .from('partners')
                .update({
                    contract_signed_at: new Date().toISOString()
                })
                .eq('id', partner.id);

            if (error) throw error;

            toast.success("Contrat signé avec succès !");
            // Redirect to dashboard
            window.location.href = '/partner/dashboard'; // Force reload to refresh layout guards if needed
        } catch (e) {
            console.error("Signature error:", e);
            toast.error("Erreur lors de la signature.");
        } finally {
            setSigning(false);
        }
    };

    const [permission, setPermission] = useState(false);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!partner) return <div className="p-8 text-center">Partenaire introuvable.</div>;

    return (
        <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">

                <div className="bg-white shadow rounded-lg p-6">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">Validation de votre Compte Partenaire</h1>
                        <p className="mt-2 text-gray-600">
                            Pour activer votre accès au tableau de bord NOWME, veuillez prendre connaissance et signer le mandat de gestion ci-dessous.
                        </p>
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 h-[600px] overflow-y-auto mb-6 p-4 shadow-inner">
                        <div className="bg-white p-4 shadow-sm min-h-full">
                            <MandateContractTemplate partner={partner} />
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-start">
                            <div className="flex items-center h-5">
                                <input
                                    id="terms"
                                    type="checkbox"
                                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                                    checked={permission}
                                    onChange={(e) => setPermission(e.target.checked)}
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="terms" className="font-medium text-gray-700">
                                    J'ai lu et j'accepte les termes du Contrat de Mandat.
                                </label>
                                <p className="text-gray-500">En cochant cette case, je reconnais que ma validation vaut signature électronique.</p>
                            </div>
                        </div>

                        <button
                            onClick={handleSign}
                            disabled={!permission || signing}
                            className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white 
                 ${(!permission || signing) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}
               `}
                        >
                            {signing ? (
                                <>
                                    <Loader className="animate-spin -ml-1 mr-3 h-5 w-5" />
                                    Validation...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="-ml-1 mr-3 h-5 w-5" />
                                    Signer et Accéder au Dashboard
                                </>
                            )}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
