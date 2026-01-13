import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import MandateContractTemplate from '../../components/admin/MandateContractTemplate';
import { Loader, Printer, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PartnerContractView() {
    const { user, profile } = useAuth();
    const [partner, setPartner] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) loadPartner();
    }, [user]);

    const loadPartner = async () => {
        // Similar logic to layout/sign page to find partner
        let partnerId = profile?.partner_id;

        if (!partnerId) {
            const { data: profileData } = await (supabase
                .from("user_profiles") as any)
                .select("partner_id")
                .eq("user_id", user?.id)
                .single();
            partnerId = profileData?.partner_id;
        }

        if (partnerId) {
            const { data, error } = await supabase
                .from('partners')
                .select('*')
                .eq('id', partnerId)
                .single();

            if (!error) setPartner(data);
        }
        setLoading(false);
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader className="animate-spin text-blue-600" /></div>;
    if (!partner) return <div className="p-8">Partenaire introuvable.</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Mon Contrat de Mandat</h1>
                    <p className="text-sm text-green-600 flex items-center mt-1">
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Signé électroniquement le {partner.contract_signed_at ? format(new Date(partner.contract_signed_at), 'dd MMMM yyyy à HH:mm', { locale: fr }) : 'Non signé'}
                    </p>
                </div>
                <button
                    onClick={() => window.print()}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimer / PDF
                </button>
            </div>

            <div className="bg-white shadow rounded-lg p-8 print:shadow-none print:p-0">
                <MandateContractTemplate partner={partner} />
            </div>

            <style>{`
        @media print {
            body { background: white; }
            nav, header, button { display: none !important; }
            .print\\:shadow-none { box-shadow: none !important; }
            .print\\:p-0 { padding: 0 !important; }
        }
      `}</style>
        </div>
    );
}
