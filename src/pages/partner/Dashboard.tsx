import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  variants: Database['public']['Tables']['offer_variants']['Row'][];
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
  const navigate = useNavigate();
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
  const [partnerReport, setPartnerReport] = useState<{
    total_bookings: number;
    gross_total: number;
    commission: number;
    net_total: number;
  } | null>(null);

  // 👉 Nouveaux dérivés
  const lowStockOffers = offers.filter(o => o.has_stock && (o.stock ?? 0) <= 5);
  const upcomingBookings = bookings
    .filter(b => b.status === 'confirmed')
    .slice(0, 5); // afficher seulement les 5 prochaines

  const [hasAgenda, setHasAgenda] = useState(false);
  const [globalCalendly, setGlobalCalendly] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>('Chargement...');

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Récupérer le partner_id depuis user_profiles
        const { data: profileData, error: profileError } = await (supabase
          .from('user_profiles') as any)
          .select('partner_id')
          .eq('user_id', user.id)
          .single();

        if (profileError || !profileData?.partner_id) {
          console.error('Partner ID not found:', profileError);
          setBusinessName('Partenaire non trouvé');
          setOffers([]);
          setRevenueStats({
            totalBookings: 0,
            totalRevenue: 0,
            nowmeCommission: 0,
            netAmount: 0,
            thisMonth: 0
          });
          setLoading(false);
          return;
        }

        console.log('Partner ID from profile:', profileData.partner_id);

        // 👉 Récupérer le partenaire
        const { data: partnerData, error: partnerError } = await (supabase
          .from('partners') as any)
          .select('id, calendly_url, business_name')
          .eq('id', profileData.partner_id)
          .single();

        if (partnerError || !partnerData) {
          console.error('Partner lookup error:', partnerError);
          setBusinessName('Erreur de chargement');
          setOffers([]);
          setRevenueStats({
            totalBookings: 0,
            totalRevenue: 0,
            nowmeCommission: 0,
            netAmount: 0,
            thisMonth: 0
          });
          setLoading(false);
          return;
        }

        const partnerId = partnerData.id;
        const businessNameValue = partnerData.business_name || 'Mon entreprise';

        console.log('Partner data loaded:', { partnerId, businessName: businessNameValue });

        setGlobalCalendly(partnerData.calendly_url || null);
        setBusinessName(businessNameValue);

        // 👉 Offres
        const { data: offersData } = await (supabase
          .from('offers') as any)
          .select(`
            *,
            variants:offer_variants(*)
          `)
          .eq('partner_id', partnerId)
          .order('created_at', { ascending: false });
        setOffers((offersData || []) as Offer[]);

        if (offersData?.some((o: any) => o.requires_agenda)) {
          setHasAgenda(true);
        }

        // 👉 Réservations enrichies
        const { data: bookingsData } = await (supabase
          .from('bookings') as any)
          .select(`
            *,
            offer:offers(title),
            user:user_profiles(first_name, last_name, email)
          `)
          .eq('partner_id', partnerId)
          .order('created_at', { ascending: false });
        setBookings((bookingsData || []) as Booking[]);

        // 👉 Payouts
        let grossTotal = 0;
        let netTotal = 0;
        let commissionTotal = 0;
        let netThisMonth = 0;

        const { data: payouts } = await (supabase
          .from('partner_payouts') as any)
          .select('gross_amount, net_amount, commission_amount, created_at')
          .eq('partner_id', partnerId);

        if (payouts) {
          grossTotal = (payouts as any).reduce((sum: number, p: any) => sum + (Number(p.gross_amount) || 0), 0);
          netTotal = (payouts as any).reduce((sum: number, p: any) => sum + (Number(p.net_amount) || 0), 0);
          commissionTotal = (payouts as any).reduce((sum: number, p: any) => sum + (Number(p.commission_amount) || 0), 0);

          const monthStart = startOfMonth(new Date());
          const monthEnd = endOfMonth(new Date());
          netThisMonth = (payouts as any)
            .filter((p: any) => {
              const d = new Date(p.created_at);
              return d >= monthStart && d <= monthEnd;
            })
            .reduce((sum: number, p: any) => sum + (Number(p.net_amount) || 0), 0);
        }

        setRevenueStats({
          totalBookings: bookingsData?.length || 0,
          totalRevenue: Math.round(grossTotal * 100) / 100,
          nowmeCommission: Math.round(commissionTotal * 100) / 100,
          netAmount: Math.round(netTotal * 100) / 100,
          thisMonth: Math.round(netThisMonth * 100) / 100
        });

        // 🔹 Rapport partenaire (via RPC)
        const { data: reportData, error: reportError } = await (supabase as any).rpc(
          "partner_payouts_report_by_partner",
          { partner_uuid: partnerId }
        );

        if (!reportError && reportData && reportData.length > 0) {
          setPartnerReport({
            total_bookings: reportData[0].total_bookings || 0,
            gross_total: reportData[0].gross_total || 0,
            commission: reportData[0].commission || 0,
            net_total: reportData[0].net_total || 0,
          });
        }

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
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{businessName}</h1>
          <p className="text-gray-600">Tableau de bord</p>
        </div>

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
            <p className={`text-xl font-bold ${revenueStats.nowmeCommission !== 0 ? 'text-red-600' : ''}`}>-{revenueStats.nowmeCommission} €</p>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <p className="text-sm text-gray-500">Revenu net</p>
            <p className="text-xl font-bold text-green-600">{revenueStats.netAmount} €</p>
            <p className="text-xs text-gray-400">Ce mois-ci : {revenueStats.thisMonth} €</p>
          </div>
        </div>
        {/* 👉 Rapport détaillé du partenaire */}
        {partnerReport && (
          <>
            <h2 className="text-xl font-bold mb-4">Rapport détaillé</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
              <div className="bg-white shadow rounded-lg p-4">
                <p className="text-sm text-gray-500">Réservations confirmées</p>
                <p className="text-xl font-bold">{partnerReport.total_bookings}</p>
              </div>
              <div className="bg-white shadow rounded-lg p-4">
                <p className="text-sm text-gray-500">Revenu brut</p>
                <p className="text-xl font-bold">
                  {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" })
                    .format(partnerReport.gross_total)}
                </p>
              </div>
              <div className="bg-white shadow rounded-lg p-4">
                <p className="text-sm text-gray-500">Commission Nowme</p>
                <p className={`text-xl font-bold ${partnerReport.commission !== 0 ? 'text-red-600' : ''}`}>
                  -{new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" })
                    .format(partnerReport.commission)}
                </p>
              </div>
              <div className="bg-white shadow rounded-lg p-4">
                <p className="text-sm text-gray-500">Revenu net</p>
                <p className="text-xl font-bold text-green-600">
                  {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" })
                    .format(partnerReport.net_total)}
                </p>
              </div>
            </div>
          </>
        )}

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
                    {offer.variants?.[0] && (
                      <div className="text-sm">
                        {offer.variants[0].discounted_price ? (
                          <>
                            <span className="text-gray-400 line-through mr-2">
                              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(offer.variants[0].price)}
                            </span>
                            <span className="font-bold text-primary">
                              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(offer.variants[0].discounted_price)}
                            </span>
                          </>
                        ) : (
                          <span className="font-bold text-gray-900">
                            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(offer.variants[0].price)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    {statusConfig[offer.status as keyof typeof statusConfig] && (
                      <span className={`px-2 py-1 rounded text-xs ${statusConfig[offer.status as keyof typeof statusConfig].className}`}>
                        {statusConfig[offer.status as keyof typeof statusConfig].label}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => navigate(`/partner/offers?edit_offer_id=${offer.id}`)}
                      className="text-blue-600 flex items-center gap-1"
                    >
                      <Edit3 className="w-4 h-4" /> Modifier
                    </button>
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
