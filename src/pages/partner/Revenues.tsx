import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Euro, TrendingUp, Calendar, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Revenues() {
    // Fix Typescript errors by defining interfaces locally or ignoring for quick iteration
    interface Partner {
        id: string;
        commission_rate?: number;
    }

    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [bookings, setBookings] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        platformFees: 0,
        netRevenue: 0,
        pendingPayout: 0
    });

    const [partnerCommissionRate, setPartnerCommissionRate] = useState(15);

    useEffect(() => {
        if (user) fetchRevenues();
    }, [user]);

    const fetchRevenues = async () => {
        try {
            // 1. Get Partner ID and Commission Rate
            const { data: profile } = await supabase
                .from('user_profiles')
                .select(`
                    partner_id
                `)
                .eq('user_id', user!.id)
                .single() as { data: { partner_id: string } | null, error: any };

            if (!profile?.partner_id) return;

            // Fetch partner details including commission_rate
            const { data: partnerData } = await (supabase
                .from('partners') as any) // Cast to any to avoid TS error if types not updated
                .select('commission_rate')
                .eq('id', profile!.partner_id)
                .single() as { data: { commission_rate: number } | null, error: any };

            // Default to 15 if not set (or column missing during migration transition)
            const rate = partnerData?.commission_rate ?? 15;
            setPartnerCommissionRate(rate);

            // 2. Fetch Paid Bookings for this Partner's Offers
            const { data: offers } = await supabase
                .from('offers')
                .select('id, title, price') // Assuming price is on offer or variants, simplified here
                .eq('partner_id', profile!.partner_id);

            const offerIds = offers?.map(o => o.id) || [];

            if (offerIds.length === 0) {
                setLoading(false);
                return;
            }

            const { data: bookingsData, error } = await (supabase
                .from('bookings') as any) // Cast for bookings
                .select(`
                    id,
                    booking_date,
                    status,
                    offer:offers (title),
                    offer_variants (price)
                `)
                .in('offer_id', offerIds)
                .in('status', ['paid', 'confirmed']) as { data: any[] | null, error: any };

            // Refined fetch for Revenue: only 'paid' status matters for actual money.
            // But if we want to show projected revenue from "confirmed" (pay on site?), prompts implied Stripe payment.

            const revenueBookings = bookingsData?.filter(b => b.status === 'paid') || [];

            // Calculate stats
            // Use Partner's Commission Rate
            const COMMISSION_RATE = partnerCommissionRate / 100;

            // We need price. If not in booking, getting it from offer (simplified)
            // Ideally booking should snapshot the price paid.
            // For MVP: fetch offers with prices.

            const { data: offersWithPrice } = await supabase
                .from('offers')
                .select('id, offer_variants(price, discounted_price)')
                .in('id', offerIds);

            const priceMap = new Map();
            offersWithPrice?.forEach(o => {
                const p = o.offer_variants?.[0]; // Take first variant
                const finalPrice = p?.discounted_price || p?.price || 0;
                priceMap.set(o.id, finalPrice);
            });

            const enrichedBookings = revenueBookings.map((b: any) => {
                const amount = priceMap.get(b.offer?.id) || 0; // Or b.offer_id
                const fee = amount * COMMISSION_RATE;
                return {
                    ...b,
                    amount,
                    fee,
                    net: amount - fee
                };
            });

            const total = enrichedBookings.reduce((sum: number, b: any) => sum + b.amount, 0);
            const fees = enrichedBookings.reduce((sum: number, b: any) => sum + b.fee, 0);

            setStats({
                totalRevenue: total,
                platformFees: fees,
                netRevenue: total - fees,
                pendingPayout: total - fees // Assuming all unpaid to partner yet
            });

            setBookings(enrichedBookings);
            setLoading(false);

        } catch (error) {
            console.error(error);
            toast.error("Erreur chargement revenus");
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8">Chargement...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-8">Mes Revenus</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 font-medium">Chiffre d'affaires</h3>
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Euro className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalRevenue.toFixed(2)}€</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 font-medium">Commissions ({partnerCommissionRate}%)</h3>
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-orange-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">-{stats.platformFees.toFixed(2)}€</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 font-medium">Net à reverser</h3>
                        <div className="p-2 bg-green-50 rounded-lg">
                            <Euro className="w-5 h-5 text-green-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-green-600">{stats.netRevenue.toFixed(2)}€</p>
                    <p className="text-xs text-gray-400 mt-2">Prochain virement : le 15 du mois</p>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="font-semibold text-gray-900">Dernières transactions</h2>
                    <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary">
                        <Download className="w-4 h-4" />
                        Exporter
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Offre</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Com.</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {bookings.map((booking) => (
                                <tr key={booking.id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(booking.booking_date).toLocaleDateString('fr-FR')}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        {booking.offer?.title}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                                        {booking.amount.toFixed(2)}€
                                    </td>
                                    <td className="px-6 py-4 text-sm text-red-500 text-right">
                                        -{booking.fee.toFixed(2)}€
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-green-600 text-right">
                                        {booking.net.toFixed(2)}€
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Payé
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {bookings.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        Aucune transaction pour le moment.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
