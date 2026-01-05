import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Loader2, PartyPopper } from 'lucide-react';
import toast from 'react-hot-toast';

interface WelcomeFormProps {
    onComplete: () => void;
}

export function WelcomeForm({ onComplete }: WelcomeFormProps) {
    const { profile, refreshProfile } = useAuth();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        phone: profile?.phone || '',
        birth_date: '',
        acquisition_source: '',
        signup_goal: '',
    });

    // Sync state with profile (in case it loads after mount)
    React.useEffect(() => {
        if (profile) {
            setFormData(prev => ({
                ...prev,
                phone: prev.phone || profile.phone || '',
                birth_date: prev.birth_date || profile.birth_date || '',
                acquisition_source: prev.acquisition_source || profile.acquisition_source || '',
                signup_goal: prev.signup_goal || profile.signup_goal || '',
            }));
        }
    }, [profile]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.user_id) return;

        // Basic validation
        if (!formData.phone || !formData.birth_date || !formData.acquisition_source || !formData.signup_goal) {
            toast.error('Merci de répondre à toutes les questions !');
            return;
        }

        try {
            setLoading(true);

            const { error } = await supabase
                .from('user_profiles')
                .update({
                    phone: formData.phone,
                    birth_date: formData.birth_date,
                    acquisition_source: formData.acquisition_source,
                    signup_goal: formData.signup_goal,
                } as any)
                .eq('user_id', profile.user_id);

            if (error) throw error;

            await refreshProfile();
            toast.success('Profil complété ! Merci 🎉');
            onComplete();
        } catch (error: any) {
            console.error('Error updating profile:', error);
            toast.error("Erreur lors de l'enregistrement. Réessayez.");
        } finally {
            setLoading(false);
        }
    };

    const ACQUISITION_SOURCES = [
        'Instagram',
        'Facebook',
        'Google',
        'Bouche à oreille / Amis',
        'Publicité en ligne',
        'Autre'
    ];


    const SIGNUP_GOALS = [
        'Kiffer encore plus la vie',
        'Faire partie d\'une communauté de kiffeuses',
        'Profiter des bons plans',
        'Sortir de chez moi',
        'Grandir ensemble',
        'Autre'
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="bg-gradient-to-r from-primary to-primary-dark p-8 text-center text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4">
                            <PartyPopper className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold mb-2">Bienvenue !</h2>
                        <p className="text-white/90">
                            Pour que ton expérience soit parfaite, on a besoin de mieux te connaitre.
                        </p>
                    </div>
                    {/* Decorative circles */}
                    <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">

                    <div className="space-y-4">
                        {/* Identity (Read-onlyish) */}
                        <div className="grid grid-cols-2 gap-4 opacity-75 grayscale bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div>
                                <label className="text-xs font-semibold uppercase text-gray-500 mb-1 block">Prénom</label>
                                <div className="font-medium text-gray-800">{profile?.first_name || '...'}</div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold uppercase text-gray-500 mb-1 block">Nom</label>
                                <div className="font-medium text-gray-800">{profile?.last_name || '...'}</div>
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs font-semibold uppercase text-gray-500 mb-1 block">Email</label>
                                <div className="font-medium text-gray-800 truncate">{profile?.email || '...'}</div>
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Ton numéro de téléphone <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="tel"
                                required
                                placeholder="06 12 34 56 78"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        {/* Birth Date */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Ta date d'anniversaire <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-gray-700"
                                value={formData.birth_date}
                                onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                            />
                            <p className="text-xs text-gray-500 mt-1">On prépare des surprises pour ton jour spécial 🎁</p>
                        </div>

                        {/* Source */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Comment nous as-tu connu ? <span className="text-red-500">*</span>
                            </label>
                            <select
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none bg-white"
                                value={formData.acquisition_source}
                                onChange={e => setFormData({ ...formData, acquisition_source: e.target.value })}
                            >
                                <option value="">Sélectionne une option...</option>
                                {ACQUISITION_SOURCES.map(source => (
                                    <option key={source} value={source}>{source}</option>
                                ))}
                            </select>
                        </div>

                        {/* Goal */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Ton objectif principal ici ? <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {SIGNUP_GOALS.map(goal => (
                                    <button
                                        key={goal}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, signup_goal: goal })}
                                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all border text-left flex items-center ${formData.signup_goal === goal
                                            ? 'bg-primary/10 border-primary text-primary'
                                            : 'bg-white border-gray-200 text-gray-600 hover:border-primary/50 hover:bg-gray-50'
                                            }`}
                                    >
                                        <span className={`w-4 h-4 rounded-full border mr-2 flex items-center justify-center ${formData.signup_goal === goal ? 'border-primary' : 'border-gray-300'
                                            }`}>
                                            {formData.signup_goal === goal && <div className="w-2 h-2 bg-primary rounded-full"></div>}
                                        </span>
                                        {goal}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-dark transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-primary/30 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                Enregistrement...
                            </>
                        ) : (
                            'C’est parti ! 🚀'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
