export interface CommunityHub {
    id: string;
    name: string;
    description: string | null;
    city: string | null;
    whatsapp_announcement_link?: string; // Only visible if active/admin
    is_read_only: boolean;
    created_at: string;
}

export interface SquadMember {
    user_id: string;
    joined_at: string;
    profile?: {
        first_name: string;
        avatar_url: string | null; // Use 'url' if from offer_media, but profile uses avatar_url usually
    };
}

export interface MicroSquad {
    id: string;
    hub_id: string;
    creator_id: string;
    title: string;
    description: string | null;
    location?: string;
    external_link?: string;
    date_event: string;
    max_participants: number;
    whatsapp_temp_link?: string | null; // Null if not joined/authorized
    status: 'open' | 'full' | 'finished';
    created_at: string;
    members_count?: number; // Calculated or joined
    members?: SquadMember[]; // For displaying avatars
    is_member?: boolean; // Convenience flag
    is_official?: boolean;
}
