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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // ✅ stats calculées réellement (plus de mock)
  const [revenueStats, setRevenueStats] = useState({
    totalBookings: 0,  // nombre de réservations (bookings)
    totalRevenue: 0,   // CA brut estimé (= net / 0.8 si commission 20%)
    nowmeCommission: 0,// commission Nowme (20%)
    netAmount: 0,      // net dû au partenaire (= somme de partner_payouts.amount)
    thisMonth: 0       // net ce mois
  });

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // 1) Récupérer le partner_id depuis le user_id
        const { data: partnerData, error: partnerError } = await supabase
          .from('partners')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (partnerError || !partnerData) {
          console.error('Partner lookup error:', partnerError);
          // Pas de partner → on termine proprement
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

        // 2) Offres du partenaire (avec prix + médias)
        const { data: offersData, error: offersError } = await supabase
          .from('offers')
          .select(`
            *,
            prices:offer_prices(*),
            media:offer_media(*)
          `)
          .eq('partner_id', partnerId)
          .order('created_at', { ascending: false });

        if (offersError) {
          console.error('Error loading offers:', offersError);
          setOffers([]);
        } else {
          setOffers((offersData || []) as Offer[]);
        }

        // 3) Stats de réservations (si la table existe)
        let totalBookings = 0;
        try {
          const bookingsCountReq = await supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('partner_id', partnerId);

          totalBookings = bookingsCountReq.count || 0;
        } catch (err) {
          // table bookings absente → on garde 0
          console.warn('bookings count skipped:', err);
          totalBookings = 0;
        }

        // 4) Payouts du partenaire (net)
        let netTotal = 0;
        let netThisMonth = 0;
        try {
          const { data: payouts, error: payoutsError } = await supabase
            .from('partner_payouts')
            .select('amount, created_at')
            .eq('partner_id', partnerId);

          if (payoutsError) {
            console.warn('payouts fetch error:', payoutsError);
          } else {
            const all = payouts || [];
            netTotal = all.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

            const monthStart = startOfMonth(new Date());
            const monthEnd = endOfMonth(new Date());
            netThisMonth = all
              .filter(p => {
                const d = new Date(p.created_at);
                return d >= monthStart && d <= monthEnd;
              })
              .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
          }
        } catch (err) {
          console.warn('payouts query skipped:', err);
          netTotal = 0;
          netThisMonth = 0;
        }

        // 5) Conversion net → brut (si commission 20%)
        const totalRevenue = netTotal > 0 ? netTotal / 0.8 : 0; // CA brut estimé
        const nowmeCommission = totalRevenue - netTotal; // = 20% du brut = 25% du net

        setRevenueStats({
          totalBookings,
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
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', offerId);

      if (error) throw error;
      setOffers(offers.filter(offer => offer.id !== offerId));
    } catch (error) {
      console.error('Error deleting offer:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez vos offres et suivez leur statut
          </p>
        </div>

        {/* Actions principales */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Link
            to="/partner/offers"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200"
          >
            <Plus className="w-5 h-5 mr-2" />
            Gérer mes offres
          </Link>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            {/* Recherche */}
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher une offre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>

            {/* Filtres */}
            <div className="flex gap-2">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary bg-white"
                >
                  <option value="all">Tous les statuts</option>
                  {Object.entries(statusConfig).map(([value, { label }]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>

              <div className="relative">
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [newSortBy, newSortOrder] = e.target.value.split('-') as ['date' | 'title', 'asc' | 'desc'];
                    setSortBy(newSortBy);
                    setSortOrder(newSortOrder);
                  }}
                  className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary bg-white"
                >
                  <option value="date-desc">Plus récent</option>
                  <option value="date-asc">Plus ancien</option>
                  <option value="title-asc">A-Z</option>
                  <option value="title-desc">Z-A</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Section Revenus */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Mes gains</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-xl p-6 shadow-soft">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Réservations</p>
                  <p className="text-2xl font-bold text-gray-900">{revenueStats.totalBookings}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-soft">
              <div className="flex items-center">
                <Euro className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Chiffre d'affaires</p>
                  <p className="text-2xl font-bold text-gray-900">{revenueStats.totalRevenue}€</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-soft">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-primary mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Montant net</p>
                  <p className="text-2xl font-bold text-gray-900">{revenueStats.netAmount}€</p>
                  <p className="text-xs text-gray-500">Après commission Nowme (20%)</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-soft">
              <div className="flex items-center">
                <Calendar className="w-8 h-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Ce mois</p>
                  <p className="text-2xl font-bold text-gray-900">{revenueStats.thisMonth}€</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Détail des commissions</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Chiffre d'affaires total</span>
                <span className="font-medium">{revenueStats.totalRevenue}€</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Commission Nowme (20%)</span>
                <span className="font-medium text-red-600">-{revenueStats.nowmeCommission}€</span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-900 font-semibold">Montant net à recevoir</span>
                  <span className="font-bold text-primary text-lg">{revenueStats.netAmount}€</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                💡 <strong>Prochainement :</strong> Système de paiement automatique des commissions. 
                Pour l'instant, contactez-nous pour organiser le virement.
              </p>
            </div>
          </div>
        </div>

        {/* Liste des offres */}
        {filteredOffers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="mb-4">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune offre trouvée
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter !== 'all'
                ? "Aucune offre ne correspond à vos critères de recherche."
                : "Vous n'avez pas encore créé d'offre."}
            </p>
            <Link
              to="/partner/offers/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
            >
              <Plus className="w-5 h-5 mr-2" />
              Créer une offre
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {filteredOffers.map((offer) => {
                const StatusIcon = statusConfig[offer.status].icon;
                return (
                  <li key={offer.id}>
                    <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-4">
                            {/* Image principale */}
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                              {offer.media[0] ? (
                                <img
                                  src={offer.media[0].url}
                                  alt={offer.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                  <Eye className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>

                            <div>
                              <h3 className="text-lg font-medium text-gray-900 truncate">
                                {offer.title}
                              </h3>
                              <div className="mt-1 flex items-center gap-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[offer.status].className}`}>
                                  <StatusIcon className="w-4 h-4 mr-1" />
                                  {statusConfig[offer.status].label}
                                </span>
                                <span className="text-sm text-gray-500">
                                  Créée le {format(new Date(offer.created_at), 'dd MMMM yyyy', { locale: fr })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          <Link
                            to={`/partner/offers/${offer.id}`}
                            className="p-2 text-gray-400 hover:text-primary rounded-full hover:bg-gray-100 transition-colors duration-200"
                          >
                            <Eye className="w-5 h-5" />
                          </Link>
                          <Link
                            to={`/partner/offers/${offer.id}/edit`}
                            className="p-2 text-gray-400 hover:text-primary rounded-full hover:bg-gray-100 transition-colors duration-200"
                          >
                            <Edit3 className="w-5 h-5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(offer.id)}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors duration-200"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
