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
  pending_penalties?: number;
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
  const [monthlyReports, setMonthlyReports] = useState<PartnerReport[]>([]);

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
          .select('id, calendly_url, business_name, commission_rate, pending_penalties')
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


        // Calculate monthly history
        const monthlyStats = new Map<string, PartnerReport>();
        const commissionRate = partnerData.commission_rate ? partnerData.commission_rate / 100 : 0.15;

        (bookingsData || []).forEach((booking: any) => {
          const date = new Date(booking.created_at);
          const monthKey = format(date, 'yyyy-MM'); // Group by Year-Month

          if (!monthlyStats.has(monthKey)) {
            monthlyStats.set(monthKey, {
              total_bookings: 0,
              gross_total: 0,
              commission: 0,
              net_total: 0,
              count: 0,
              pending_penalties: 0,
              period_label: format(date, 'MMMM yyyy', { locale: fr })
            });
          }

          const stats = monthlyStats.get(monthKey)!;

          // Add Revenue & Commission for valid sales
          if (booking.status === 'confirmed' || booking.status === 'paid') {
            const amount = parseFloat(booking.amount) || 0;
            const comm = amount * commissionRate;
            const tvaOnComm = comm * 0.20;

            stats.count! += 1;
            stats.total_bookings += 1;
            stats.gross_total += amount;
            stats.commission += (comm + tvaOnComm);
            stats.net_total += (amount - (comm + tvaOnComm));
          }

          // Add Penalties for cancellations in this month
          // Check if it was cancelled by partner and has a penalty amount
          // If legacy cancellation (no penalty_amount stored), allow fallback if we know the date
          if (booking.status === 'cancelled' && booking.cancelled_by_partner && booking.cancelled_at) {
            const cancelDate = new Date(booking.cancelled_at);
            // Ensure we attribute penalty to the month of CANCELLATION, not booking creation? 
            // Accounting-wise, usually debt is recognized when incurred.
            // The user asked for "History month by month". 
            // If I cancel in Feb a Jan booking, the penalty belongs to Feb.
            // My loop is iterating bookings by *created_at*. This is tricky.
            // To be precise, I should iterate cancellation events. 
            // But simpler approach: Attribute to month of the event.
            // Since I'm looping bookings, I need to check if cancellation month matches this group? 
            // No, I should initialize months based on range and put events in them.

            // SIMPLIFICATION: Display stats based on Booking Date (Revenue) 
            // AND display Penalties based on Booking Date for now, unless valid 'cancelled_at' shifts it.
            // Actually, sticking to Booking Date is safer for "Sales Report".
            // Let's attribute penalty to the Booking's month for simplicity of "Projected Net" for that batch of sales.
            // Valid logic: "For bookings made in Jan, X were cancelled, costing Y".

            const penalty = booking.penalty_amount ? parseFloat(booking.penalty_amount) : 0;
            // Fallback for legacy if needed: 5.00 + (booking.amount * 0.015 + 0.25)
            const estimatedPenalty = penalty > 0 ? penalty : (5.00 + (parseFloat(booking.amount || 0) * 0.015 + 0.25));

            stats.pending_penalties = (stats.pending_penalties || 0) + estimatedPenalty;
          }
        });

        // Convert Map to Array and Sort
        const history = Array.from(monthlyStats.values()).sort((a, b) => {
          // Sort by label (month) descending
          // Need original key to sort correctly, but Map iteration order is insertion order usually.
          // Better to re-parse date from label or use key. 
          // Let's just rely on insertion order if we processed desc? NO.
          return 0; // We'll sort via keys step.
        });

        // Actually let's use Array from start or sort keys.
        const sortedKeys = Array.from(monthlyStats.keys()).sort().reverse();
        const reports = sortedKeys.map(key => monthlyStats.get(key)!);

        setMonthlyReports(reports);

        // Default to latest report if available
        if (reports.length > 0) {
          setPartnerReport(reports[0]);
        } else {
          // ... Fallback for empty ...
          /* If empty filtering logic above is used, it might be stale. 
             But 'monthlyStats' covers all periods. 
             If no bookings at all, we fall to catch block or empty.
          */
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

              {/* Penalties Card - Only show if there are penalties */}
              {(partnerReport.pending_penalties || 0) > 0 && (
                <div className="bg-white shadow rounded-lg p-4">
                  <p className="text-sm text-gray-500">Pénalités (Annulations)</p>
                  <p className="text-xl font-bold text-red-600">
                    -{new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" })
                      .format(partnerReport.pending_penalties || 0)}
                  </p>
                </div>
              )}

              <div className="bg-white shadow rounded-lg p-4">
                <p className="text-sm text-gray-500">Revenu net estimé</p>
                <p className="text-xl font-bold text-green-600">
                  {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" })
                    .format(partnerReport.net_total - (partnerReport.pending_penalties || 0))}
                </p>
              </div>
            </div>

            {/* HISTORIQUE MENSUEL */}
            <h2 className="text-xl font-bold mb-4 mt-8">Historique Mensuel</h2>
            <div className="space-y-4">
              {monthlyReports.map((report, idx) => (
                <div key={idx} className="bg-white shadow rounded-lg p-6 border border-gray-100">
                  <h3 className="text-lg font-bold mb-4 capitalize">{report.period_label}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Ventes</p>
                      <p className="font-semibold">{report.count} réservations</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">CA Brut</p>
                      <p className="font-semibold">{new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(report.gross_total)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Pénalités</p>
                      <p className={`font-semibold ${(report.pending_penalties || 0) > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        -{new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(report.pending_penalties || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Net Estimé</p>
                      <p className="font-bold text-green-600">
                        {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(report.net_total - (report.pending_penalties || 0))}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
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
