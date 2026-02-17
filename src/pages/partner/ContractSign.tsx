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
    const [permission, setPermission] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            loadPartner();
        }
    }, [user]);

    const loadPartner = async () => {
        let partnerId = user?.user_metadata?.partner_id;

        // Fallback: Si pas de partner_id dans les métadonnées, on cherche dans user_profiles
        if (!partnerId && user?.id) {
            try {
                const { data: profileData } = await supabase
                    .from('user_profiles' as any)
                    .select('partner_id')
                    .eq('user_id', user.id)
                    .single();

                if (profileData?.partner_id) {
                    partnerId = profileData.partner_id;
                    console.log("Partner ID found via user_profiles:", partnerId);
                }
            } catch (err) {
                console.error("Error fetching user profile:", err);
            }
        }

        if (!partnerId) {
            toast.error("Compte partenaire non lié.");
            setLoading(false);
            setFetchError("Compte utilisateur non lié à un partenaire (metadata.partner_id manquant et pas de profil trouvé).");
            return;
        }

        const { data, error } = await supabase
            .from('partners' as any)
            .select('*')
            .eq('id', partnerId)
            .single();

        if (error) {
            console.error('Error loading partner:', error);
            setFetchError(error.message);
            toast.error("Erreur chargement partenaire: " + error.message);
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
                .from('partners' as any)
                .update({
                    contract_signed_at: new Date().toISOString()
                })
                .eq('id', partner.id);

            if (error) throw error;

            toast.success("Contrat signé avec succès !");
            // Redirect to dashboard
            window.location.href = '/partner/dashboard';
        } catch (e: any) {
            console.error("Signature error:", e);
            toast.error("Erreur lors de la signature.");
        } finally {
            setSigning(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!partner) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
                <h2 className="text-xl font-bold text-red-600 mb-2">Partenaire introuvable</h2>
                <p className="text-gray-600 mb-4">Impossible de charger les informations du partenaire.</p>
                {fetchError && (
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-left text-sm font-mono text-red-700 overflow-x-auto">
                        <strong>Erreur technique :</strong><br />
                        {fetchError}
                    </div>
                )}
                <div className="mt-6 border-t pt-4">
                    <p className="text-xs text-gray-400">User ID: {user?.id}</p>
                    <p className="text-xs text-gray-400">Metadata Partner ID: {user?.user_metadata?.partner_id || 'N/A'}</p>
                </div>
            </div>
        </div>
    );

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
                                    className="focus:ring-blue-500 h-5 w-5 text-blue-600 border-gray-300 rounded cursor-pointer"
                                    checked={permission}
                                    onChange={(e) => setPermission(e.target.checked)}
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="terms" className="font-medium text-gray-700 cursor-pointer block py-1">
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
