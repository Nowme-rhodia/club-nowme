import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import toast from 'react-hot-toast';
import { Shield, Check, Heart, Users, Smile } from 'lucide-react';

interface CommunityRulesModalProps {
    onAccept: () => void;
}

export function CommunityRulesModal({ onAccept }: CommunityRulesModalProps) {
    const { profile } = useAuth();
    const [accepting, setAccepting] = useState(false);

    const handleAccept = async () => {
        if (!profile?.user_id) return;

        setAccepting(true);
        try {
            const { error } = await (supabase
                .from('user_profiles') as any)
                .update({ accepted_community_rules_at: new Date().toISOString() })
                .eq('user_id', profile.user_id);



            if (error) throw error;

            toast.success("Bienvenue dans le club ! 💖");
            onAccept();
        } catch (error) {
            console.error('Error accepting rules:', error);
            toast.error("Une erreur est survenue.");
        } finally {
            setAccepting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-center text-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <Shield className="w-12 h-12 mx-auto mb-4 text-white" />
                    <h2 className="text-3xl font-bold mb-2">La Charte du Club</h2>
                    <p className="text-purple-100">Avant d'entrer, promettons-nous quelques petites choses...</p>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">

                    <div className="flex gap-4">
                        <div className="bg-purple-100 p-3 rounded-2xl h-fit">
                            <Heart className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">Bienveillance & Respect</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Ici, on est entre nous. On se parle avec douceur, on respecte les avis de chacun, et on s'entraide.
                                Aucune forme de jugement ou de harcèlement n'est tolérée.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="bg-pink-100 p-3 rounded-2xl h-fit">
                            <Users className="w-6 h-6 text-pink-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">Confidentialité</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Ce qui se passe au club, reste au club. Les échanges privés et les partages personnels doivent rester
                                dans cet espace de confiance.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="bg-yellow-100 p-3 rounded-2xl h-fit">
                            <Smile className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">Authenticité & Good Vibes</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Soyez vous-mêmes ! On aime les vrais gens, les vrais sourires et les vraies histoires.
                                Apportez votre bonne humeur et votre énergie positive.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="bg-green-100 p-3 rounded-2xl h-fit">
                            <Check className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">Engagement & Motivation</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Si tu t'inscris à une sortie, viens ! C'est comme ça que la communauté prend vie.
                                On se motive mutuellement et on va kiffer ensemble. Ta présence compte !
                            </p>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-gray-500 text-center sm:text-left">
                        En rejoignant le club, vous acceptez ces règles de communauté.
                    </p>
                    <button
                        onClick={handleAccept}
                        disabled={accepting}
                        className="w-full sm:w-auto bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0 transition-all"
                    >
                        {accepting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Check className="w-5 h-5" />
                                Je m'engage 🤞
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
