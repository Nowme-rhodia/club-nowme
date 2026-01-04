import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { MicroSquad, SquadMember } from '../../types/community';
import { SquadCard } from './SquadCard';
import { CreateSquadModal } from './CreateSquadModal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import toast from 'react-hot-toast';

interface MicroSquadListProps {
    hubId?: string;
}

export const MicroSquadList: React.FC<MicroSquadListProps> = ({ hubId }) => {
    const { profile } = useAuth();
    const [squads, setSquads] = useState<MicroSquad[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchSquads = async () => {
        setLoading(true);
        try {
            // Fetch squads
            let query = supabase
                .from('micro_squads')
                .select(`
          *,
          members:squad_members(
            user_id,
            joined_at,
            profile:user_profiles(first_name)
          )
        `)
                .eq('status', 'open')
                .gte('date_event', new Date().toISOString()) // Only future events
                .order('is_official', { ascending: false })
                .order('date_event', { ascending: true });

            // Apply hub filter only if hubId is provided
            if (hubId) {
                query = query.eq('hub_id', hubId);
            }

            const { data: squadsData, error } = await query;

            if (error) throw error;

            if (squadsData) {
                // Transform data to fit types (handle array joins)
                const formattedSquads: MicroSquad[] = squadsData.map((sq: any) => ({
                    ...sq,
                    members_count: sq.members?.length || 0,
                    is_member: sq.members?.some((m: any) => m.user_id === profile?.user_id),
                    // Clean up members array structure if needed
                    members: sq.members || []
                }));
                setSquads(formattedSquads);
            }
        } catch (err) {
            console.error("Error fetching squads:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSquads();
    }, [hubId, profile?.id]);

    const handleCreateClick = () => {
        if (!hubId) {
            toast.error("Rendez-vous dans 'Le QG' -> 'Vos Cercles' pour choisir un groupe et proposer une sortie !");
            return;
        }
        if (profile?.subscription_status !== 'active') {
            toast.error("Seules les abonnées actives peuvent proposer des sorties !");
            return;
        }
        setIsCreateModalOpen(true);
    };

    return (
        <div className="mb-12">
            <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="text-lg font-bold text-gray-800">Sorties prévues</h3>
                <button
                    onClick={handleCreateClick}
                    className="flex items-center text-sm font-semibold text-primary hover:text-primary-dark transition-colors bg-orange-50 px-3 py-1.5 rounded-full"
                >
                    <Plus className="w-4 h-4 mr-1" />
                    Proposer une sortie
                </button>
            </div>

            <div className="relative">
                {loading ? (
                    <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="min-w-[280px] h-[200px] bg-gray-100 animate-pulse rounded-xl" />
                        ))}
                    </div>
                ) : squads.length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x">
                        {squads.map(squad => (
                            <div key={squad.id} className="snap-start">
                                <SquadCard squad={squad} onJoin={fetchSquads} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <p className="text-gray-500 mb-2">Aucune sortie prévue pour le moment.</p>
                        <button
                            onClick={handleCreateClick}
                            className="text-primary font-medium hover:underline text-sm"
                        >
                            Sois la première à en proposer une !
                        </button>
                    </div>
                )}
            </div>

            {hubId && (
                <CreateSquadModal
                    hubId={hubId}
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreated={fetchSquads}
                />
            )}
        </div>
    );
};
