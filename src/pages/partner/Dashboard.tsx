import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Plus, 
  Search, 
  Filter,
  Edit3,
  Trash2,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  Euro,
  TrendingUp,
  Calendar,
  Users
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/supabase';

type Offer = Database['public']['Tables']['offers']['Row'] & {
  prices: Database['public']['Tables']['offer_prices']['Row'][];
  media: Database['public']['Tables']['offer_media']['Row'][];
};

type Booking = {
  id: string;
  offer_id: string;
  user_id: string;
  date: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  offer?: { title: string };
  user?: { first_name: string; last_name: string; email: string };
};

const statusConfig = {
  draft: {
    label: 'Brouillon',
    icon: Clock,
    className: 'bg-gray-100 text-gray-700'
  },
  pending: {
    label: 'En attente',
    icon: AlertCircle,
    className: 'bg-yellow-100 text-yellow-700'
  },
  approved: {
    label: 'Approuvée',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-700'
  },
  rejected: {
    label: 'Refusée',
    icon: XCircle,
    className: 'bg-red-100 text-red-700'
  }
};

export default function Dashboard() {
  const { user } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [revenueStats, setRevenueStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    nowmeCommission: 0,
    netAmount: 0,
    thisMonth: 0
  });

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const { data: partnerData, error: partnerError } = await supabase
          .from('partners')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (partnerError || !partnerData) {
          console.error('Partner lookup error:', partnerError);
          setOffers([]);
          setRevenueStats({
            totalBookings: 0,
            totalRevenue: 0,
            nowmeCommission: 0,
            netAmount: 0,
            thisMonth: 0
          });
          return;
        }

        const partnerId = partnerData.id;

        // Offres
        const { data: offersData } = await supabase
          .from('offers')
          .select(`
            *,
            prices:offer_prices(*),
            media:offer_media(*)
          `)
          .eq('partner_id', partnerId)
          .order('created_at', { ascending: false });
        setOffers((offersData || []) as Offer[]);

        // Réservations enrichies
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select(`
            *,
            offer:offers(title),
            user:user_profiles(first_name, last_name, email)
          `)
          .eq('partner_id', partnerId)
          .order('created_at', { ascending: false });
        setBookings((bookingsData || []) as Booking[]);

        // Payouts
        let netTotal = 0;
        let netThisMonth = 0;
        const { data: payouts } = await supabase
          .from('partner_payouts')
          .select('amount, created_at')
          .eq('partner_id', partnerId);

        if (payouts) {
          netTotal = payouts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
          const monthStart = startOfMonth(new Date());
          const monthEnd = endOfMonth(new Date());
          netThisMonth = payouts
            .filter(p => {
              const d = new Date(p.created_at);
              return d >= monthStart && d <= monthEnd;
            })
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        }

        const totalRevenue = netTotal > 0 ? netTotal / 0.8 : 0;
        const nowmeCommission = totalRevenue - netTotal;

        setRevenueStats({
          totalBookings: bookingsData?.length || 0,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          nowmeCommission: Math.round(nowmeCommission * 100) / 100,
          netAmount: Math.round(netTotal * 100) / 100,
          thisMonth: Math.round(netThisMonth * 100) / 100
        });
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const filteredOffers = offers
    .filter(offer => {
      const matchesSearch = offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          offer.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || offer.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc'
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else {
        return sortOrder === 'desc'
          ? b.title.localeCompare(a.title)
          : a.title.localeCompare(b.title);
      }
    });

  const handleDelete = async (offerId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette offre ?')) return;
    try {
      await supabase.from('offers').delete().eq('id', offerId);
      setOffers(offers.filter(o => o.id !== offerId));
    } catch (err) {
      console.error('Error deleting offer:', err);
    }
  };

  if (loading) {
    return <p className="p-6">Chargement...</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">Tableau de bord</h1>

        {/* 👉 Section stats revenus */}
        {/* (ton code complet des revenus ici, inchangé) */}

        {/* 👉 Section Offres */}
        {/* (ton code complet des offres ici, inchangé) */}

        {/* 👉 Nouvelle section Réservations */}
        <div className="mt-10 bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Mes réservations</h2>
          {bookings.length === 0 ? (
            <p className="text-gray-500">Aucune réservation pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Client</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Offre</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Date</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bookings.map((b) => (
                    <tr key={b.id}>
                      <td className="px-4 py-2">
                        {b.user
                          ? `${b.user.first_name} ${b.user.last_name} (${b.user.email})`
                          : b.user_id}
                      </td>
                      <td className="px-4 py-2">{b.offer ? b.offer.title : b.offer_id}</td>
                      <td className="px-4 py-2">{new Date(b.date).toLocaleString("fr-FR")}</td>
                      <td className="px-4 py-2">
                        {b.status === 'pending' && <span className="text-yellow-600">En attente</span>}
                        {b.status === 'confirmed' && <span className="text-green-600">Confirmée</span>}
                        {b.status === 'cancelled' && <span className="text-red-600">Annulée</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
