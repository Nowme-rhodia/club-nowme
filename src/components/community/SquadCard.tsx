import React, { useState } from 'react';
import { Calendar, Users, ExternalLink, MapPin, Info, Trash2, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MicroSquad } from '../../types/community';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface SquadCardProps {
    squad: MicroSquad;
    onJoin: () => void;
}

export const SquadCard: React.FC<SquadCardProps> = ({ squad, onJoin }) => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [revealedLink, setRevealedLink] = useState<string | null>(squad.whatsapp_temp_link || null);

    const isFull = (squad.members_count || 0) >= squad.max_participants;
    const isMember = squad.is_member;
    const isCreator = profile?.id === squad.creator_id || profile?.user_id === squad.creator_id;

    // Format date: "Sam 12 Jan - 14h00"
    const formattedDate = format(new Date(squad.date_event), 'EEE d MMM - HH:mm', { locale: fr });

    const handleJoin = async () => {
        if (loading) return;

        if (!profile?.subscription_status || profile.subscription_status !== 'active') {
            toast.error("Tu dois être abonnée pour rejoindre une sortie !");
            return;
        }

        setLoading(true);
        try {
            if (!isMember) {
                if (!profile?.user_id) {
                    toast.error("Erreur: Profil non trouvé.");
                    return;
                }

                // First join the squad
                const { error } = await supabase
                    .from('squad_members')
                    .insert({
                        squad_id: squad.id,
                        user_id: profile.user_id
                    } as any);

                if (error) throw error;
                toast.success("Tu as rejoint la sortie !");
                onJoin(); // Refresh list
            }

            // Now fetch the link securely
            const { data, error: rpcError } = await supabase
                .rpc('get_squad_link' as any, { squad_id_input: squad.id } as any);

            if (rpcError) throw rpcError;

            if (data) {
                setRevealedLink(data);
                window.open(data, '_blank');
            } else {
                toast.error("Impossible de récupérer le lien WhatsApp.");
            }

        } catch (err) {
            console.error("Error joining squad:", err);
            toast.error("Erreur lors de l'inscription.");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenLink = () => {
        if (revealedLink) {
            window.open(revealedLink, '_blank');
        } else {
            // Retry fetch if missing
            handleJoin();
        }
    };

    const handleCancel = async () => {
        if (!window.confirm("Es-tu sûre de vouloir annuler cette sortie ? Cela préviendra les participantes.")) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('micro_squads')
                .update({ status: 'cancelled' } as any)
                .eq('id', squad.id);
            if (error) throw error;
            toast.success("Sortie annulée.");
            onJoin();
        } catch (err) {
            console.error("Error cancelling squad:", err);
            toast.error("Erreur lors de l'annulation.");
        } finally {
            setLoading(false);
        }
    };

    const handleLeave = async () => {
        if (!window.confirm("Es-tu sûre de vouloir te désinscrire de cette sortie ?")) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('squad_members')
                .delete()
                .eq('squad_id', squad.id)
                .eq('user_id', profile?.user_id || '');
            if (error) throw error;
            toast.success("Tu t'es désinscrite.");
            onJoin();
        } catch (err) {
            console.error("Error leaving squad:", err);
            toast.error("Erreur lors de la désinscription.");
        } finally {
            setLoading(false);
        }
    };

    if (squad.status === 'cancelled') return null; // Or show cancelled state

    return (
        <div className="flex flex-col bg-white rounded-xl shadow-md border border-gray-100 min-w-[300px] w-[300px] p-5 hover:shadow-lg transition-shadow relative group">
            {/* Header: Date & Status */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center text-primary font-semibold text-sm bg-primary/10 px-2 py-1 rounded-md">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formattedDate}
                </div>
                {squad.is_official && (
                    <span className="text-[10px] font-bold text-white bg-gradient-to-r from-pink-500 to-purple-500 px-2 py-0.5 rounded-full shadow-sm ml-2 self-center">
                        👑 Host Officielle
                    </span>
                )}
                {isFull && !isMember && (
                    <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full ml-auto">
                        COMPLET
                    </span>
                )}
            </div>

            {/* Title */}
            <h3 className="text-gray-900 font-bold text-lg mb-1 line-clamp-2">
                {squad.title}
            </h3>

            {/* Location */}
            {squad.location && (
                <div className="flex items-start text-gray-500 text-xs mb-3">
                    <MapPin className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-1">{squad.location}</span>
                </div>
            )}

            {/* Description */}
            {squad.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-3 bg-gray-50 p-2 rounded-lg italic">
                    "{squad.description}"
                </p>
            )}

            {/* Link Preview Button (if exists) */}
            {squad.external_link && (
                <a
                    href={squad.external_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-xs text-blue-600 hover:underline mb-4"
                >
                    <Info className="w-3 h-3 mr-1" />
                    Voir les infos (Menu/Billetterie) &rarr;
                </a>
            )}

            {/* Members Avatars */}
            <div className="flex items-center mb-4 min-h-[32px]">
                <div className="flex -space-x-2 overflow-hidden">
                    {squad.members?.slice(0, 5).map((member, i) => (
                        <img
                            key={member.user_id}
                            className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                            src={member.profile?.avatar_url || `https://ui-avatars.com/api/?name=${member.profile?.first_name || 'U'}&background=random`}
                            alt={member.profile?.first_name}
                            title={member.profile?.first_name}
                        />
                    ))}
                    {/* Placeholder for remaining spots */}
                    {Array.from({ length: Math.max(0, squad.max_participants - (squad.members_count || 0)) }).slice(0, 3).map((_, i) => (
                        <div key={`empty-${i}`} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-300 text-xs">•</span>
                        </div>
                    ))}
                </div>
                <span className="ml-2 text-xs text-gray-500">
                    {(squad.members_count || 0)} / {squad.max_participants}
                </span>
            </div>

            {/* Action Button */}
            <div className="mt-auto space-y-2">
                {(isMember || isCreator) ? (
                    <>
                        <button
                            onClick={handleOpenLink}
                            className="w-full py-2 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center justify-center transition-colors font-medium"
                        >
                            <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WA" className="w-5 h-5 mr-2 filter brightness-0 invert" />
                            Ouvrir le groupe
                        </button>

                        {/* Cancellation / Leave Options */}
                        <div className="flex justify-center">
                            {isCreator ? (
                                <button
                                    onClick={handleCancel}
                                    disabled={loading}
                                    className="flex items-center text-xs text-red-500 hover:text-red-700 hover:underline opacity-60 hover:opacity-100 transition-all"
                                >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Annuler la sortie
                                </button>
                            ) : (
                                <button
                                    onClick={handleLeave}
                                    disabled={loading}
                                    className="flex items-center text-xs text-gray-400 hover:text-red-500 hover:underline transition-colors"
                                >
                                    <LogOut className="w-3 h-3 mr-1" />
                                    Se désinscrire
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    <button
                        onClick={handleJoin}
                        disabled={isFull || loading}
                        className={`w-full py-2 px-4 rounded-lg flex items-center justify-center transition-colors font-medium ${isFull
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-primary text-white hover:bg-primary-dark'
                            }`}
                    >
                        {loading ? '...' : 'Rejoindre la sortie'}
                    </button>
                )}
            </div>
        </div>
    );
};
