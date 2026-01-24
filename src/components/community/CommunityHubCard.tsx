import React, { useState } from 'react';
import { Users, Lock } from 'lucide-react';
import { CommunityHub } from '../../types/community';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface CommunityHubCardProps {
    hub: CommunityHub;
}

export const CommunityHubCard: React.FC<CommunityHubCardProps> = ({ hub }) => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleJoinHub = async () => {
        if (!profile?.subscription_status || profile.subscription_status !== 'active') {
            toast.error("L'accès aux Hubs est réservé aux abonnées !");
            return;
        }

        setLoading(true);
        try {
            // Fetch link securely
            const { data, error } = await supabase
                .rpc('get_hub_link' as any, { hub_id_input: hub.id } as any);



            if (error) throw error;

            if (data) {
                window.open(data, '_blank');
            } else {
                toast.error("Lien non disponible.");
            }
        } catch (err) {
            console.error("Error getting hub link:", err);
            toast.error("Erreur d'accès au Hub.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
            <div className="mb-4 md:mb-0 w-full md:w-auto">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center flex-wrap gap-2">
                    {hub.name.split(' - ')[0]}
                    {hub.city && (
                        <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap">
                            {hub.city.split(' - ')[0]}
                        </span>
                    )}
                </h2>
                <p className="text-gray-600 mt-1 max-w-2xl">
                    {(hub.description || "").split(' - ')[0] || "Rejoins le groupe WhatsApp pour échanger avec les membres et ne rien rater des actus !"}
                </p>
            </div>

            <button
                onClick={handleJoinHub}
                disabled={loading}
                className="flex items-center px-6 py-3 bg-green-500 text-white rounded-full font-bold hover:bg-green-600 transition-colors shadow-sm hover:shadow-md w-full md:w-auto md:min-w-[200px] justify-center"
            >
                <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WA" className="w-5 h-5 mr-3 filter brightness-0 invert" />
                Rejoindre le Hub
            </button>
        </div>
    );
};
