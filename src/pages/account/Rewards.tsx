import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Gift, Lock, Unlock, Trophy, Star, ArrowRight, Wallet } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface RewardsState {
    points_balance: number;
    lifetime_points: number;
    credit_balance_eur: number;
    loading: boolean;
}

export default function Rewards() {
    const { user } = useAuth();
    const [state, setState] = useState<RewardsState>({
        points_balance: 0,
        lifetime_points: 0,
        credit_balance_eur: 0,
        loading: true
    });

    const fetchData = async () => {
        try {
            if (!user) return;

            const { data, error } = await supabase
                .from('member_rewards')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            const rewardsData = data as any;

            setState({
                points_balance: rewardsData?.points_balance || 0,
                lifetime_points: rewardsData?.lifetime_points || 0,
                credit_balance_eur: rewardsData?.credit_balance_eur || 0,
                loading: false
            });
        } catch (error) {
            console.error('Error fetching rewards:', error);
            setState(prev => ({ ...prev, loading: false }));
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const handleUnlock = async (thresholdId: 'level1' | 'level2' | 'level3') => {
        if (!confirm("Voulez-vous vraiment échanger vos points contre ce bon d'achat ?")) return;

        try {
            const toastId = toast.loading('Déblocage en cours...');

            const { data, error } = await supabase.functions.invoke('manage-rewards', {
                body: {
                    action: 'convert_points',
                    userId: user?.id,
                    rewardData: { thresholdId }
                }
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            toast.success('Félicitations ! Votre cagnotte a été créditée.', { id: toastId });
            fetchData(); // Refresh balance
        } catch (error: any) {
            console.error('Conversion Failed:', error);
            toast.error(error.message || 'Erreur lors du déblocage');
        }
    };

    const thresholds = [
        { id: 'level1', points: 200, reward: 15, label: 'Kiff Débutant', color: 'bg-bronze-100 border-bronze-300' },
        { id: 'level2', points: 400, reward: 40, label: 'Kiff Confirmé', color: 'bg-slate-100 border-slate-300' },
        { id: 'level3', points: 600, reward: 70, label: 'Jackpot Royal', color: 'bg-yellow-50 border-yellow-400' }
    ] as const;

    // Calculate progress to next level
    const nextTarget = thresholds.find(t => t.points > state.points_balance) || thresholds[thresholds.length - 1];
    const progressPercent = Math.min(100, (state.points_balance / 600) * 100);

    if (state.loading) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">

            {/* Header Stats */}
            <div className="bg-gradient-to-r from-primary to-pink-600 rounded-2xl p-8 text-white shadow-xl mb-10 overflow-hidden relative">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-center md:text-left">
                        <h1 className="text-3xl font-bold mb-2">Mes Récompenses</h1>
                        <p className="text-pink-100 text-lg">
                            Convertissez vos points en argent réel !
                        </p>
                    </div>
                    <div className="flex gap-6">
                        <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 text-center min-w-[120px]">
                            <div className="text-3xl font-bold">{state.points_balance}</div>
                            <div className="text-sm font-medium opacity-90">Points Dispo</div>
                        </div>
                        <div className="bg-white/90 text-primary rounded-xl p-4 text-center min-w-[120px] shadow-lg">
                            <div className="text-3xl font-bold">{state.credit_balance_eur}€</div>
                            <div className="text-sm font-bold">Cagnotte</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-10 border border-gray-100">
                <div className="flex justify-between text-sm font-medium text-gray-500 mb-2">
                    <span>Début</span>
                    <span>Objectif Jackpot (600 pts)</span>
                </div>
                <div className="h-6 bg-gray-100 rounded-full overflow-hidden relative">
                    <div
                        className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-1000 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    >
                        <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                    </div>
                </div>
                <p className="text-center mt-4 text-gray-600">
                    Encore <strong>{Math.max(0, 600 - state.points_balance)} points</strong> pour atteindre le Jackpot de 70€ ! 🚀
                </p>
            </div>

            {/* The Ladder */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
                {thresholds.map((t) => {
                    const isUnlockable = state.points_balance >= t.points;
                    // const isCompleted = state.lifetime_points ... logic complex if we allow multiple unlocks
                    // For now, simple "Can afford" logic.

                    return (
                        <div
                            key={t.id}
                            className={`relative rounded-xl border-2 p-6 transition-all duration-300 ${isUnlockable ? 'border-green-500 shadow-md transform hover:-translate-y-1' : 'border-gray-200 opacity-80'
                                } ${t.id === 'level3' ? 'bg-gradient-to-b from-yellow-50 to-white' : 'bg-white'}`}
                        >
                            {isUnlockable && (
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-1 rounded-full text-xs font-bold shadow-sm uppercase tracking-wider">
                                    Disponible
                                </div>
                            )}

                            <div className="flex justify-center mb-4">
                                {t.id === 'level3' ? (
                                    <div className="p-4 bg-yellow-100 rounded-full text-yellow-600">
                                        <Trophy className="w-8 h-8" />
                                    </div>
                                ) : (
                                    <div className={`p-4 rounded-full ${isUnlockable ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                        <Gift className="w-8 h-8" />
                                    </div>
                                )}
                            </div>

                            <h3 className="text-xl font-bold text-center mb-2">{t.reward}€ offerts</h3>
                            <p className="text-center text-gray-500 text-sm mb-6">
                                Coût : <span className="font-bold text-gray-900">{t.points} points</span>
                            </p>

                            <button
                                onClick={() => handleUnlock(t.id)}
                                disabled={!isUnlockable}
                                className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${isUnlockable
                                    ? 'bg-primary hover:bg-primary-dark text-white shadow-lg shadow-pink-200'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                {isUnlockable ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                {isUnlockable ? 'DÉBLOQUER' : 'Verrouillé'}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Rules */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Comment gagner des points ?
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-4">
                        <div className="bg-white p-3 rounded-lg shadow-sm text-2xl">🛍️</div>
                        <div>
                            <p className="font-bold text-gray-900">En kiffant</p>
                            <p className="text-sm text-gray-600">
                                Chaque euro dépensé sur le club vous rapporte <strong>1 point</strong>.
                                <br />
                                <span className="text-xs opacity-75">(Ex: Massage à 80€ = 80 points)</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="bg-white p-3 rounded-lg shadow-sm text-2xl">📅</div>
                        <div>
                            <p className="font-bold text-gray-900">En organisant</p>
                            <p className="text-sm text-gray-600">
                                Organisez une sortie (Squad) et gagnez <strong>50 points</strong> !
                                <br />
                                <span className="text-xs opacity-75">(Dès 3 participantes validées)</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
