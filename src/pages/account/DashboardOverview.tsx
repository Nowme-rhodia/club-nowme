import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Calendar, Wallet, ArrowRight, Clock, MapPin, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function DashboardOverview() {
    const { profile } = useAuth();
    const [nextBooking, setNextBooking] = useState<any>(null);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile) {
            fetchDashboardData();
        }
    }, [profile]);

    const fetchDashboardData = async () => {
        if (!profile?.user_id) return;

        try {
            const today = new Date().toISOString();

            // 1. Fetch Official Bookings
            const { data: bookingsData } = await supabase
                .from('bookings')
                .select(`
                    id,
                    booking_date,
                    scheduled_at,
                    offer:offers (
                        title,
                        image_url,
                        city,
                        offer_media(url)
                    )
                `)
                .eq('user_id', profile.user_id)
                .gte('booking_date', today) // Basic filter, refine in JS
                .order('booking_date', { ascending: true });

            // 2. Fetch Community Squads
            const { data: squadData } = await supabase
                .from('squad_members')
                .select(`
                    squad:micro_squads (
                        id,
                        title,
                        date_event,
                        location,
                        description
                    )
                `)
                .eq('user_id', profile.user_id)
                .gte('squad.date_event', today); // This might not work perfectly with inner join filter, filtering in JS is safer

            // 3. Normalize and Merge
            const normalizedBookings = (bookingsData || []).map((b: any) => ({
                id: b.id,
                title: b.offer?.title,
                date: b.scheduled_at || b.booking_date,
                image: b.offer?.image_url || b.offer?.offer_media?.[0]?.url,
                location: b.offer?.city,
                type: 'official'
            }));

            // Filter out null squads (if filtered by inner join) and normalize
            const normalizedSquads = (squadData || [])
                .map((s: any) => s.squad)
                .filter((s: any) => s && new Date(s.date_event) > new Date()) // Ensure future
                .map((s: any) => ({
                    id: s.id,
                    title: s.title,
                    date: s.date_event,
                    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80', // Generic placeholder for squads
                    location: s.location,
                    type: 'community'
                }));

            const allEvents = [...normalizedBookings, ...normalizedSquads].sort((a, b) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
            );

            // Set the very next event
            setNextBooking(allEvents[0] || null);

            // 4. Fetch Wallet Balance
            const { data: dataWallets, error: walletError } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', profile.user_id)
                .gt('balance', 0);

            if (walletError) console.error(walletError);

            const wallets = dataWallets as { balance: number }[] | null;
            const totalBalance = wallets?.reduce((acc, w) => acc + (w.balance || 0), 0) || 0;
            setWalletBalance(totalBalance);

        } catch (error) {
            console.error('Error loading dashboard data', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Bonjour, {profile?.first_name} ! 👋
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Prête pour votre prochaine expérience Nowme ?
                    </p>
                </div>
                <Link
                    to="/tous-les-kiffs"
                    className="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/25 hover:bg-primary-dark transition-all hover:-translate-y-0.5"
                >
                    Découvrir les offres
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Wallet Widget */}
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white text-center md:text-left shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-white/20 transition-all"></div>

                    <div className="relative z-10">
                        <div className="p-3 bg-white/20 w-fit rounded-xl mb-4 backdrop-blur-sm">
                            <Wallet className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-indigo-100 font-medium mb-1">Mon Ardoise</p>
                        <h3 className="text-4xl font-bold mb-4">{walletBalance.toFixed(2)} €</h3>
                        <Link
                            to="/account/wallet"
                            className="inline-flex items-center text-sm font-semibold text-white/90 hover:text-white hover:underline"
                        >
                            Voir les détails <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                    </div>
                </div>

                {/* Next Booking Widget */}
                <div className="md:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" />
                            Prochaine sortie
                        </h3>
                        {/* Link destination depends on type, or generic bookings page if both are listed there? 
                            Ideally should go to specific list. For now, general bookings page or toggle.
                            Using /account/bookings for now.
                         */}
                        <Link
                            to={nextBooking?.type === 'community' ? '/account/squads' : '/account/bookings'}
                            className="text-sm text-primary font-medium hover:underline"
                        >
                            Tout voir
                        </Link>
                    </div>

                    {nextBooking ? (
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 bg-gray-50 rounded-xl border border-gray-100 transition-colors hover:bg-gray-100">
                            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                                <img
                                    src={nextBooking.image}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-gray-900 truncate pr-4">
                                        {nextBooking.title}
                                    </h4>
                                    {nextBooking.type === 'community' && (
                                        <span className="text-[10px] uppercase font-bold text-white bg-orange-400 px-2 py-0.5 rounded-full">
                                            Sortie
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-4 h-4" />
                                        {nextBooking.date
                                            ? format(new Date(nextBooking.date), "d MMM 'à' HH'h'mm", { locale: fr })
                                            : "Date à confirmer"
                                        }
                                    </div>
                                    {nextBooking.location && (
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-4 h-4" />
                                            {/* Truncate location if too long */}
                                            <span className="truncate max-w-[200px]">
                                                {nextBooking.location}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <p className="text-gray-500 text-sm mb-3">Aucune sortie à venir</p>
                            <Link to="/tous-les-kiffs" className="text-primary font-medium text-sm hover:underline">
                                Réserver mon prochain kiff
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions / Recommendations */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Raccourcis</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Link to="/account/profile" className="p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-all flex flex-col items-center text-center gap-2 group">
                        <div className="w-10 h-10 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <User className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-gray-700 text-sm">Mon Profil</span>
                    </Link>
                    {/* Add more shortcuts if needed */}
                </div>
            </div>
        </div>
    );
}
