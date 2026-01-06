import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Star, MessageSquare, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Review {
    id: string;
    rating: number;
    comment: string;
    created_at: string;
    offer: {
        title: string;
    };
    user: {
        first_name: string;
        last_name: string;
    };
}

export default function PartnerReviews() {
    const { user } = useAuth();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ average: 0, total: 0 });

    useEffect(() => {
        if (user) {
            fetchReviews();
        }
    }, [user]);

    const fetchReviews = async () => {
        try {
            // First get partner ID
            // 1. Get partner_id from user_profiles
            const { data: profileData } = await supabase
                .from('user_profiles')
                .select('partner_id')
                .eq('user_id', user?.id || '')
                .single();

            if (!profileData?.partner_id) {
                console.error('Partner ID not found');
                setLoading(false);
                return;
            }

            const partnerId = profileData.partner_id;

            // 2. Fetch reviews for this partner's offers
            // We use !inner join to filter reviews that belong to offers of this partner
            const { data, error } = await supabase
                .from('reviews')
                .select(`
                    id,
                    rating,
                    comment,
                    created_at,
                    offer:offers!inner (
                        title,
                        partner_id
                    ),
                    user:user_profiles!reviews_user_id_fkey_profiles (
                        first_name,
                        last_name
                    )
                `)
                .eq('offer.partner_id', partnerId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // data is already filtered correctly
            setReviews(data as any);

            // Calculate stats
            if (myReviews.length > 0) {
                const totalRating = myReviews.reduce((acc: number, r: any) => acc + r.rating, 0);
                setStats({
                    average: totalRating / myReviews.length,
                    total: myReviews.length
                });
            }

        } catch (error) {
            console.error('Error fetching reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Mes Avis</h1>
                <p className="text-gray-500 mt-1">Découvrez ce que les membres pensent de vos kiffs</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-yellow-100 rounded-lg">
                            <Star className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Note moyenne</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.average.toFixed(1)}/5</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <MessageSquare className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total avis</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reviews List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 font-medium text-gray-900">
                    Derniers avis reçus
                </div>

                {reviews.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        Vous n'avez pas encore reçu d'avis.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {reviews.map((review) => (
                            <div key={review.id} className="p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="font-medium text-gray-900">
                                            {/* We might not get user name depending on privacy/query, default to 'Membre' */}
                                            {/* @ts-ignore */}
                                            {review.user?.first_name || 'Un membre'}
                                        </div>
                                        <span className="text-gray-300">•</span>
                                        <div className="text-sm text-gray-500 flex items-center">
                                            <Calendar className="w-3 h-3 mr-1" />
                                            {format(new Date(review.created_at), 'd MMMM yyyy', { locale: fr })}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                                key={star}
                                                className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-2 text-sm font-medium text-primary">
                                    Offre : {review.offer.title}
                                </div>

                                {review.comment && (
                                    <p className="text-gray-600 bg-gray-50 p-3 rounded-lg text-sm">
                                        "{review.comment}"
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
