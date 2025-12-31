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
import PartnerFinancials from '../../components/PartnerFinancials';

type Offer = Database['public']['Tables']['offers']['Row'] & {
  variants: Database['public']['Tables']['offer_variants']['Row'][];
  media: Database['public']['Tables']['offer_media']['Row'][];
  requires_agenda?: boolean;
};

type PartnerReport = {
  total_bookings: number;
  gross_total: number;
  commission: number;
  net_total: number;
  count?: number;
  period_label?: string;
};

type Booking = {
  id: string;
  offer_id: string;
  partner_id: string;
  user_id: string;
  date: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'paid';
  created_at: string;
  offer?: { title: string };
  user?: { first_name: string; last_name: string; email: string };
  amount: number;
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
  const [partnerReport, setPartnerReport] = useState<PartnerReport | null>(null);

  // 👉 Nouveaux dérivés


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
          .select('id, calendly_url, business_name, commission_rate')
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

        // Calculate from bookings
        const paidBookings = (bookingsData || []).filter((b: any) => b.status === 'paid' || b.status === 'confirmed');

        let grossTotal = 0;
        let commissionTotal = 0;
        let netTotal = 0;
        let netThisMonth = 0;
        const commissionRate = partnerData.commission_rate ? partnerData.commission_rate / 100 : 0.15;

        // Fetch latest payout for consistency
        const { data: latestPayouts } = await (supabase
          .from('payouts') as any)
          .select('total_amount_collected, commission_amount, commission_tva, net_payout_amount, period_start, period_end')
          .eq('partner_id', partnerId)
          .order('period_start', { ascending: false })
          .limit(1);

        const latestPayout = latestPayouts?.[0];

        if (latestPayout) {
          setPartnerReport({
            count: (bookingsData || []).filter((b: any) => {
              return (b.status === 'paid' || b.status === 'confirmed') && b.created_at >= latestPayout.period_start && b.created_at <= latestPayout.period_end;
            }).length,
            total_bookings: (bookingsData || []).filter((b: any) => {
              return (b.status === 'paid' || b.status === 'confirmed') && b.created_at >= latestPayout.period_start && b.created_at <= latestPayout.period_end;
            }).length,
            gross_total: latestPayout.total_amount_collected,
            commission: (latestPayout.commission_amount + latestPayout.commission_tva),
            net_total: latestPayout.net_payout_amount,
            period_label: `Dernier virement (${new Date(latestPayout.period_start).toLocaleDateString()} - ${new Date(latestPayout.period_end).toLocaleDateString()})`
          });
        } else {
          // Fallback to live current month stats
          const now = new Date();
          const startOfCurrentMonth = startOfMonth(now);
          const endOfCurrentMonth = endOfMonth(now);
          const currentMonthBookings = paidBookings.filter((b: any) => {
            const d = new Date(b.created_at);
            return d >= startOfCurrentMonth && d <= endOfCurrentMonth;
          });
          // ... [existing live calc logic] ...
          let monthGross = 0;
          let monthComm = 0;
          let monthNet = 0;
          currentMonthBookings.forEach((b: any) => {
            const amount = b.amount ? parseFloat(b.amount) : 0;
            if (amount > 0) {
              const comm = amount * commissionRate;
              const tvaOnComm = comm * 0.20;
              const net = amount - (comm + tvaOnComm);
              monthGross += amount;
              monthComm += (comm + tvaOnComm);
              monthNet += net;
            }
          });

          setPartnerReport({
            count: currentMonthBookings.length,
            total_bookings: currentMonthBookings.length,
            gross_total: monthGross,
            commission: monthComm,
            net_total: monthNet,
            period_label: "Activités du mois (Estimation en cours)"
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
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-4">Mes Finances</h2>
          <PartnerFinancials />
        </div>
        {/* 👉 Rapport détaillé du partenaire */}
        {partnerReport && (
          <>
            <h2 className="text-xl font-bold mb-4">{partnerReport.period_label}</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
              <div className="bg-white shadow rounded-lg p-4">
                <p className="text-sm text-gray-500">Réservations confirmées</p>
                <p className="text-xl font-bold">{partnerReport.count}</p>
              </div>
              <div className="bg-white shadow rounded-lg p-4">
                <p className="text-sm text-gray-500">Revenu brut</p>
                <p className="text-xl font-bold">
                  {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" })
                    .format(partnerReport.gross_total)}
                </p>
              </div>
              <div className="bg-white shadow rounded-lg p-4">
                <p className="text-sm text-gray-500">Commission Nowme (HT + TVA 20%)</p>
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
      </div>
    </div>
  );
}
