import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import toast from 'react-hot-toast';

interface CreateSquadModalProps {
    hubId: string;
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

interface SquadForm {
    title: string;
    description: string;
    location: string;
    external_link?: string;
    date_event: string;
    time_event: string;
    max_participants: number;
    whatsapp_temp_link: string;
    is_official?: boolean;
}

export const CreateSquadModal: React.FC<CreateSquadModalProps> = ({ hubId, isOpen, onClose, onCreated }) => {
    const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<SquadForm>();
    const { profile } = useAuth();

    if (!isOpen) return null;

    const onSubmit = async (data: SquadForm) => {
        try {
            if (!profile) return;

            const eventDate = new Date(`${data.date_event}T${data.time_event}`);

            const { data: squadData, error } = await supabase
                .from('micro_squads')
                .insert({
                    hub_id: hubId,
                    creator_id: profile.user_id,
                    title: data.title,
                    description: data.description,
                    location: data.location,
                    external_link: data.external_link,
                    date_event: eventDate.toISOString(),
                    max_participants: data.max_participants,
                    whatsapp_temp_link: data.whatsapp_temp_link,
                    max_participants: data.max_participants,
                    whatsapp_temp_link: data.whatsapp_temp_link,
                    status: 'open',
                    is_official: data.is_official || false
                } as any)
                .select()
                .single();

            if (error) throw error;

            // Auto-join the creator
            if (squadData) {
                await supabase.from('squad_members').insert({
                    squad_id: squadData.id,
                    user_id: profile.user_id
                });
            }

            toast.success("Sortie créée avec succès !");
            reset();
            onCreated();
            onClose();
        } catch (err) {
            console.error("Error creating squad:", err);
            toast.error("Erreur lors de la création de la sortie.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">Proposer une sortie</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Titre de la sortie</label>
                        <input
                            {...register('title', { required: 'Le titre est requis' })}
                            type="text"
                            placeholder="Ex: Brunch chez Kozy, Footing aux Tuileries..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                        />
                        {errors.title && <span className="text-red-500 text-xs">{errors.title.message}</span>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            {...register('description')}
                            placeholder="Dis-nous en plus sur le programme..."
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lieu / Adresse</label>
                        <input
                            {...register('location', { required: 'Le lieu est requis' })}
                            type="text"
                            placeholder="Ex: 79 Avenue Bosquet, 75007 Paris"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                        />
                        {errors.location && <span className="text-red-500 text-xs">{errors.location.message}</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                                {...register('date_event', { required: true })}
                                type="date"
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Heure</label>
                            <input
                                {...register('time_event', { required: true })}
                                type="time"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lien de l'événement (optionnel)</label>
                        <input
                            {...register('external_link')}
                            type="url"
                            placeholder="https://menu-restaurant.com, https://billetterie..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de places</label>
                        <input
                            {...register('max_participants', { required: true, min: 2, max: 20 })}
                            type="number"
                            defaultValue={8}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lien du groupe WhatsApp (Créé par toi)</label>
                        <input
                            {...register('whatsapp_temp_link', {
                                required: 'Le lien WhatsApp est requis',
                                pattern: {
                                    value: /^https:\/\/(chat\.whatsapp\.com|wa\.me)\/.+/,
                                    message: "Format de lien invalide (doit commencer par https://chat.whatsapp.com/)"
                                }
                            })}
                            type="url"
                            placeholder="https://chat.whatsapp.com/..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-green-50"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Crée un groupe WhatsApp temporaire et colle le lien d'invitation ici. Il ne sera visible qu'aux participantes validées.
                        </p>
                        {errors.whatsapp_temp_link && <span className="text-red-500 text-xs">{errors.whatsapp_temp_link.message}</span>}
                    </div>

                    {profile?.is_ambassador && (
                        <div className="flex items-center space-x-2 bg-pink-50 p-4 rounded-xl border border-pink-100">
                            <input
                                {...register('is_official')}
                                type="checkbox"
                                id="is_official"
                                className="h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded"
                            />
                            <label htmlFor="is_official" className="text-sm font-medium text-gray-900">
                                Demander le statut "Événement Officiel" 👑
                                <span className="block text-xs font-normal text-gray-500 mt-0.5">
                                    Ton événement sera mis en avant et gratuit pour les participantes (inclus dans l'abo).
                                </span>
                            </label>
                        </div>
                    )}

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors"
                        >
                            {isSubmitting ? 'Publication...' : 'Publier la sortie'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
