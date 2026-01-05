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
    hubName?: string;
    hubCity?: string;
    showFilter?: boolean; // New prop for local filtering
}

export const MicroSquadList: React.FC<MicroSquadListProps> = ({ hubId, hubName, hubCity, showFilter }) => {
    const { profile } = useAuth();
    // Internal filter state
    const [localDeptFilter, setLocalDeptFilter] = useState<string>('all');
    const [availableDepts, setAvailableDepts] = useState<string[]>([]);

    const [squads, setSquads] = useState<MicroSquad[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchSquads = async () => {
        setLoading(true);
        try {
            // 1. Detect if this is a "Geo Hub" (e.g. contains 75, 92, Paris...)
            const textToScan = ((hubName || '') + ' ' + (hubCity || '')).toLowerCase();
            const deptMatches: string[] = textToScan.match(/\b(97\d|2A|2B|[0-9]{2})\b/g) || [];

            // Aliases
            if (textToScan.includes('paris')) deptMatches.push('75');
            if (textToScan.includes('est') || textToScan.includes('77') || textToScan.includes('91')) deptMatches.push('77', '91');
            if (textToScan.includes('ouest') || textToScan.includes('78') || textToScan.includes('95')) deptMatches.push('78', '95');

            const uniqueTargetDepts = [...new Set(deptMatches)];
            const isGeoHub = uniqueTargetDepts.length > 0;

            console.log(`[MicroSquadList] Hub: ${hubName} | IsGeo: ${isGeoHub} | Targets:`, uniqueTargetDepts);

            // 2. Fetch ALL open/future squads
            let query = supabase
                .from('micro_squads')
                .select(`
                  *,
                  members:squad_members(
                    user_id,
                    joined_at,
                    profile:user_profiles(first_name)
                  ),
                  hub:community_hubs(name)
                `)
                .eq('status', 'open')
                .gte('date_event', new Date().toISOString())
                .order('date_event', { ascending: true })
                .order('is_official', { ascending: false });

            // Optimization: If NOT a geo hub AND we are not in global "showFilter" mode (Agenda), strict filtering is fine.
            if (!isGeoHub && hubId && !showFilter) {
                query = query.eq('hub_id', hubId);
            }

            const { data: squadsData, error } = await query;
            if (error) throw error;

            if (squadsData) {
                let filtered = squadsData;

                // 3. Filter client-side for Geo Hubs
                if (isGeoHub && hubId) {
                    filtered = squadsData.filter((sq: any) => {
                        if (sq.hub_id === hubId) return true;

                        // Cross-posting for Geo Hubs
                        const location = sq.location || "";
                        const eventDeptMatch = location.match(/\b(97\d|2A|2B|[0-9]{2})[0-9]{3}\b/);
                        const eventDept = eventDeptMatch ? eventDeptMatch[1] : null;

                        if (eventDept && uniqueTargetDepts.includes(eventDept)) {
                            return true;
                        }
                        return false;
                    });
                }

                // Format squads
                const formattedSquads: MicroSquad[] = filtered.map((sq: any) => ({
                    ...sq,
                    members_count: sq.members?.length || 0,
                    is_member: sq.members?.some((m: any) => m.user_id === profile?.user_id),
                    members: sq.members || []
                }));

                setSquads(formattedSquads);

                // Extract departments for the filter
                const depts = new Set<string>();
                formattedSquads.forEach(sq => {
                    const loc = (sq.location || '').toLowerCase();
                    const match = (sq.location || '').match(/\b(97\d|2A|2B|[0-9]{2})[0-9]{3}\b/);
                    if (match) {
                        depts.add(match[1]);
                    } else if (loc.includes('paris')) {
                        depts.add('75');
                    }
                });
                setAvailableDepts(Array.from(depts).sort());
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
        if (!hubId && showFilter) {
            toast.error("Rendez-vous dans 'Le QG' pour proposer une sortie dans un cercle !");
            return;
        }
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

    // Apply local filter for rendering
    const displayedSquads = squads.filter(sq => {
        if (localDeptFilter === 'all') return true;

        const match = (sq.location || '').match(/\b(97\d|2A|2B|[0-9]{2})[0-9]{3}\b/);
        const dept = match ? match[1] : null;
        return dept === localDeptFilter;
    });

    return (
        <div className="mb-12">
            <div className="flex flex-wrap justify-between items-center mb-4 px-1 gap-4">
                <h3 className="text-lg font-bold text-gray-800">Sorties prévues</h3>

                <div className="flex items-center gap-3">
                    {/* Independent Filter UI */}
                    {showFilter && availableDepts.length > 0 && (
                        <div className="inline-flex items-center bg-white rounded-full shadow-sm p-1 border border-gray-200">
                            <span className="pl-3 text-xs text-gray-500 font-medium whitespace-nowrap">Filtrer :</span>
                            <select
                                value={localDeptFilter}
                                onChange={(e) => setLocalDeptFilter(e.target.value)}
                                className="border-none bg-transparent py-1 pl-2 pr-6 text-sm text-primary font-bold focus:ring-0 cursor-pointer outline-none"
                            >
                                <option value="all">Tous</option>
                                {availableDepts.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button
                        onClick={handleCreateClick}
                        className="flex items-center text-sm font-semibold text-primary hover:text-primary-dark transition-colors bg-orange-50 px-3 py-1.5 rounded-full"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Proposer une sortie
                    </button>
                </div>
            </div>

            <div className="relative">
                {loading ? (
                    <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="min-w-[280px] h-[200px] bg-gray-100 animate-pulse rounded-xl" />
                        ))}
                    </div>
                ) : displayedSquads.length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x">
                        {displayedSquads.map(squad => (
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
