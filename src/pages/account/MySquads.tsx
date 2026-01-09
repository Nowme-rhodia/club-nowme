import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { MicroSquad } from '../../types/community';
import { SquadCard } from '../../components/community/SquadCard';

import { PreLaunchBlocker } from '../../components/PreLaunchBlocker';

export default function MySquads() {
    const { user, isAdmin } = useAuth();

    // Pre-launch Blocking Logic
    const isAllowed = isAdmin || user?.email === 'nowme.club@gmail.com' || user?.email === 'rhodia@nowme.fr';

    const [squads, setSquads] = useState<MicroSquad[]>([]);
    const [loading, setLoading] = useState(true);

    if (!loading && !isAllowed) {
        return <PreLaunchBlocker />;
    }

    useEffect(() => {
        if (user) {
            fetchSquads();
        }
    }, [user]);

    const fetchSquads = async () => {
        try {
            setLoading(true);
            const { data: squadData, error: squadError } = await supabase
                .from('squad_members')
                .select(`
                    squad:micro_squads (
                        *,
                        members:squad_members(
                            user_id,
                            joined_at,
                            profile:user_profiles(first_name, avatar_url:photo_url)
                        ),
                        hub:community_hubs(name)
                    )
                `)
                .eq('user_id', user?.id);

            if (squadError) throw squadError;

            // Normalize squads
            const formattedSquads: MicroSquad[] = (squadData || [])
                .map((item: any) => item.squad)
                .filter((s: any) => s) // Remove nulls
                .map((sq: any) => ({
                    ...sq,
                    members_count: sq.members?.length || 0,
                    is_member: true,
                    members: sq.members || []
                }))
                .sort((a: any, b: any) => new Date(a.date_event).getTime() - new Date(b.date_event).getTime());

            setSquads(formattedSquads);
        } catch (error) {
            console.error('Error fetching squads:', error);
            toast.error('Erreur lors du chargement des sorties');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                    <Sparkles className="w-8 h-8 text-orange-500" />
                    Mes Sorties Club
                </h1>

                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-8">
                    <h2 className="text-orange-800 font-bold flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        Vos sorties communautaires
                    </h2>
                    <p className="text-sm text-orange-700 mt-1">
                        Ici, retrouvez toutes les sorties proposées par les membres auxquelles vous participez.
                    </p>
                </div>

                {squads.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Sparkles className="w-10 h-10 text-orange-500" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            Aucune sortie prévue
                        </h2>
                        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                            Rejoignez d'autres membres pour des sorties informelles et sympas !
                        </p>
                        <Link
                            to="/community"
                            className="inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-full font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/25"
                        >
                            Rejoindre le QG
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {squads.map(squad => (
                            <SquadCard
                                key={squad.id}
                                squad={squad}
                                onJoin={fetchSquads}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
