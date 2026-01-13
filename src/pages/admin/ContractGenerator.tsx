import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import MandateContractTemplate from '../../components/admin/MandateContractTemplate';
import { Loader } from 'lucide-react';

export default function ContractGenerator() {
    const { partnerId } = useParams<{ partnerId: string }>();
    const [partner, setPartner] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (partnerId) {
            loadPartner();
        }
    }, [partnerId]);

    const loadPartner = async () => {
        const { data, error } = await supabase
            .from('partners')
            .select('*')
            .eq('id', partnerId)
            .single();

        if (error) {
            console.error('Error loading partner:', error);
        } else {
            setPartner(data);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!partner) {
        return <div className="p-8 text-center text-red-600">Partenaire introuvable</div>;
    }

    return (
        <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:p-0">
            <div className="max-w-[21cm] mx-auto mb-4 print:hidden flex justify-between items-center">
                <h1 className="text-xl font-bold">Aperçu du Contrat</h1>
                <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
                >
                    Imprimer / PDF
                </button>
            </div>

            <MandateContractTemplate partner={partner} />

            <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; }
          @page { margin: 0; size: A4; }
        }
      `}</style>
        </div>
    );
}
