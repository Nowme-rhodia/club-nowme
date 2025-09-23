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
  partner_id: string;
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

  // 👉 Nouveaux dérivés
  const lowStockOffers = offers.filter(o => o.has_stock && (o.stock ?? 0) <= 5);
  const upcomingBookings = bookings
    .filter(b => b.status === 'confirmed')
    .slice(0, 5); // afficher seulement les 5 prochaines

  const [hasAgenda, setHasAgenda] = useState(false);
  const [globalCalendly, setGlobalCalendly] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const { data: partnerData, error: partnerError } = await supabase
          .from('partners')
          .select('id, calendly_url')
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
        setGlobalCalendly(partnerData.calendly_url || null);

        // 🔹 Offres
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

        if (offersData?.some(o => o.requires_agenda)) {
          setHasAgenda(true);
        }

        // 🔹 Réservations enrichies
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

        // 🔹 Payouts
        let grossTotal = 0;
        let netTotal = 0;
        let commissionTotal = 0;
        let netThisMonth = 0;

        const { data: payouts } = await supabase
          .from('partner_payouts')
          .select('gross_amount, net_amount, commission_amount, created_at')
          .eq('partner_id', partnerId);

        if (payouts) {
          grossTotal = payouts.reduce((sum, p) => sum + (Number(p.gross_amount) || 0), 0);
          netTotal = payouts.reduce((sum, p) => sum + (Number(p.net_amount) || 0), 0);
          commissionTotal = payouts.reduce((sum, p) => sum + (Number(p.commission_amount) || 0), 0);

          const monthStart = startOfMonth(new Date());
          const monthEnd = endOfMonth(new Date());
          netThisMonth = payouts
            .filter(p => {
              const d = new Date(p.created_at);
              return d >= monthStart && d <= monthEnd;
            })
            .reduce((sum, p) => sum + (Number(p.net_amount) || 0), 0);
        }

        setRevenueStats({
          totalBookings: bookingsData?.length || 0,
          totalRevenue: Math.round(grossTotal * 100) / 100,
          nowmeCommission: Math.round(commissionTotal * 100) / 100,
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-white shadow rounded-lg p-4">
            <p className="text-sm text-gray-500">Réservations</p>
            <p className="text-xl font-bold">{revenueStats.totalBookings}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <p className="text-sm text-gray-500">Revenu brut</p>
            <p className="text-xl font-bold">{revenueStats.totalRevenue} €</p>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <p className="text-sm text-gray-500">Commission Nowme</p>
            <p className="text-xl font-bold text-red-600">-{revenueStats.nowmeCommission} €</p>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <p className="text-sm text-gray-500">Revenu net</p>
            <p className="text-xl font-bold text-green-600">{revenueStats.netAmount} €</p>
            <p className="text-xs text-gray-400">Ce mois-ci : {revenueStats.thisMonth} €</p>
          </div>
        </div>
        {/* 👉 Widget Stock bas + Prochaines réservations */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
  {/* Stock bas */}
  <div className="bg-white shadow rounded-lg p-6">
    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
      <AlertCircle className="w-5 h-5 text-red-600" /> Stock bas
    </h2>
    {lowStockOffers.length === 0 ? (
      <p className="text-gray-500 text-sm">Aucune offre en rupture imminente.</p>
    ) : (
      <ul className="space-y-2">
        {lowStockOffers.map(o => (
          <li key={o.id} className="flex justify-between text-sm">
            <span>{o.title}</span>
            <span className="font-semibold text-red-600">
              {o.stock} restant{o.stock && o.stock > 1 ? 's' : ''}
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>

  {/* Prochaines réservations */}
  <div className="bg-white shadow rounded-lg p-6">
    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
      <Users className="w-5 h-5 text-primary" /> Prochaines réservations
    </h2>
    {upcomingBookings.length === 0 ? (
      <p className="text-gray-500 text-sm">Aucune réservation confirmée.</p>
    ) : (
      <ul className="space-y-2">
        {upcomingBookings.map(b => (
          <li key={b.id} className="flex justify-between text-sm">
            <span>
              {b.user ? `${b.user.first_name} ${b.user.last_name}` : 'Client'} — {b.offer?.title}
            </span>
            <span className="text-gray-600">
              {new Date(b.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
</div>
        {/* 👉 Section Agenda Calendly */}
        {hasAgenda && (
          <div className="mt-10 bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" /> Mon agenda
            </h2>
            <div className="w-full h-[700px]">
              <iframe
                src={globalCalendly || offers.find(o => o.requires_agenda)?.calendly_url || ''}
                width="100%"
                height="100%"
                frameBorder="0"
                title="Calendly Agenda"
              ></iframe>
            </div>
          </div>
        )}

        {/* 👉 Section Offres */}
        <div className="mt-10 bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" /> Mes offres
          </h2>
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher une offre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border rounded px-2 py-1 w-full"
            />
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="all">Toutes</option>
              <option value="draft">Brouillons</option>
              <option value="pending">En attente</option>
              <option value="approved">Approuvées</option>
              <option value="rejected">Refusées</option>
            </select>
          </div>

          {filteredOffers.length === 0 ? (
            <p className="text-gray-500">Aucune offre trouvée.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOffers.map((offer) => (
                <div key={offer.id} className="border rounded-lg p-4 shadow-sm bg-white">
                  <h3 className="font-bold">{offer.title}</h3>
                  <p className="text-sm text-gray-500 mb-2">{offer.description}</p>
                  <div className="flex items-center gap-2 mb-2">
                    {statusConfig[offer.status as keyof typeof statusConfig] && (
                      <span className={`px-2 py-1 rounded text-xs ${statusConfig[offer.status as keyof typeof statusConfig].className}`}>
                        {statusConfig[offer.status as keyof typeof statusConfig].label}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Link to={`/partner/offers/${offer.id}/edit`} className="text-blue-600 flex items-center gap-1">
                      <Edit3 className="w-4 h-4" /> Modifier
                    </Link>
                    <button onClick={() => handleDelete(offer.id)} className="text-red-600 flex items-center gap-1">
                      <Trash2 className="w-4 h-4" /> Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 👉 Section Réservations */}
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
