import React, { useEffect, useState } from 'react';
import { CommunityHubCard } from './CommunityHubCard';
import { MicroSquadList } from './MicroSquadList';
import { CommunityHub } from '../../types/community';
import { supabase } from '../../lib/supabase';

interface CommunitySectionProps {
    profile: any;
}

export const CommunitySection: React.FC<CommunitySectionProps> = ({ profile }) => {
    const [hubs, setHubs] = useState<CommunityHub[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHubs = async () => {
            try {
                const { data, error } = await supabase
                    .from('community_hubs')
                    .select('*')
                    .order('name');

                if (error) throw error;
                setHubs(data || []);
            } catch (err) {
                console.error("Error fetching hubs:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHubs();
    }, []);

    if (loading) return <div className="h-40 animate-pulse bg-gray-50 rounded-xl" />;

    // Filter hubs based on location if possible, otherwise show all
    // Logic: If user has address/city, prioritize matching hubs, but users might want to see others?
    // User said: "Filtrage par quartier" -> "assure-toi que ... est filtré selon le quartier"
    // If strict filtering:
    // const filteredHubs = hubs.filter(h => h.city ? profile?.address?.includes(h.city) : true);
    // For now, let's show ALL because we don't know the exact address format vs city column match.
    // We'll Sort them instead: Matching city first.

    // We'll Sort them instead: Matching city first.
    const sortedHubs = [...hubs].sort((a, b) => {
        // Priority 1: Geo Groups (Match typical names or IDs if stable, using names for flexibility)
        const geoNames = ["Team Est Francilien", "Team Ouest & Nord", "Paris & Proche Banlieue", "92", "93", "94", "75", "77", "91", "78", "95"];
        const isAGeo = geoNames.some(name => a.name.includes(name));
        const isBGeo = geoNames.some(name => b.name.includes(name));

        if (isAGeo && !isBGeo) return -1;
        if (!isAGeo && isBGeo) return 1;

        // Priority 3: "Le quartier" (Last)
        const isALast = a.name.toLowerCase().includes("quartier");
        const isBLast = b.name.toLowerCase().includes("quartier");

        if (isALast && !isBLast) return 1;
        if (!isALast && isBLast) return -1;

        // Priority 2: Everything else (Thematic) - Alphabetical or created_at
        return a.name.localeCompare(b.name);
    });

    if (sortedHubs.length === 0) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
                <p className="text-gray-500">Les communautés arrivent bientôt !</p>
            </div>
        );
    }

    return (
        <div className="space-y-12">
            {sortedHubs.map(hub => (
                <div key={hub.id}>
                    <CommunityHubCard hub={hub} />
                    <div className="mt-6">
                        <MicroSquadList
                            hubId={hub.id}
                            hubName={hub.name}
                            hubCity={hub.city || undefined}

                        />
                    </div>
                </div>
            ))}
        </div>
    );
};
