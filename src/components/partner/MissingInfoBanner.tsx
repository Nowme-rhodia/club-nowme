
import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

export default function MissingInfoBanner() {
    const { user } = useAuth();
    const [missingFields, setMissingFields] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) checkPartnerInfo();
    }, [user]);

    const checkPartnerInfo = async () => {
        try {
            // 1. Get partner_id from profile
            const { data: userProfile } = await supabase
                .from('user_profiles')
                .select('partner_id')
                .eq('user_id', user?.id)
                .single();

            if (!userProfile?.partner_id) {
                setLoading(false);
                return;
            }

            const { data: partner } = await supabase
                .from('partners')
                .select('siret, payout_iban, address, business_name')
                .eq('id', userProfile.partner_id)
                .single();

            if (partner) {
                const missing = [];
                if (!partner.siret) missing.push('SIRET');
                if (!partner.payout_iban) missing.push('IBAN');
                if (!partner.address) missing.push('Adresse');
                if (!partner.business_name) missing.push('Nom entreprise');

                setMissingFields(missing);
            }
        } catch (err) {
            console.error('Error checking partner info:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading || missingFields.length === 0) return null;

    return (
        <div className="bg-orange-50 border-b border-orange-100 p-4">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-orange-800">
                            Informations manquantes : {missingFields.join(', ')}
                        </p>
                        <p className="text-sm text-orange-700 mt-1">
                            Vous devez compléter vos informations légales pour recevoir vos virements et publier des offres.
                        </p>
                    </div>
                </div>
                <div className="flex gap-3 whitespace-nowrap">
                    {missingFields.includes('IBAN') && (
                        <Link
                            to="/partner/settings/payments"
                            className="text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg flex items-center transition-colors"
                        >
                            Ajouter IBAN
                            <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                    )}
                    {!missingFields.includes('IBAN') && (
                        <Link
                            to="/partner/settings/general"
                            className="text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg flex items-center transition-colors"
                        >
                            Compléter mon profil
                            <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
