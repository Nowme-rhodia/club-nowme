import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Search,
  Filter,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  Euro,
  Loader2,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Booking {
  id: string;
  created_at: string;
  booking_date: string;
  status: 'paid' | 'confirmed' | 'cancelled' | 'pending';
  source: 'calendly' | 'event' | 'promo' | 'purchase';
  amount: number;
  currency: string;
  user: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
  };
  offer: {
    title: string;
  };
}

const statusConfig = {
  paid: {
    label: 'Payé',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-700 border-green-200'
  },
  confirmed: {
    label: 'Confirmé',
    icon: CheckCircle,
    className: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  pending: {
    label: 'En attente',
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200'
  },
  cancelled: {
    label: 'Annulé',
    icon: XCircle,
    className: 'bg-red-100 text-red-700 border-red-200'
  }
};

const typeConfig = {
  calendly: { label: 'Rendez-vous', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  event: { label: 'Événement', className: 'bg-pink-100 text-pink-700 border-pink-200' },
  promo: { label: 'Code Promo', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  purchase: { label: 'Achat Simple', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' }
};

export default function Bookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (user) {
      loadPartnerBookings();
    }
  }, [user]);

  const loadPartnerBookings = async () => {
    try {
      // 1. Get Partner ID
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('partner_id')
        .eq('user_id', user?.id)
        .single();

      if (profileError || !profileData?.partner_id) {
        setLoading(false);
        return;
      }

      // 2. Fetch Bookings with complete user details and offer title
      const { data, error } = await supabase
        .from('bookings')
        .select(`
            id,
            booking_date,
            status,
            source,
            amount,
            currency,
            user:user_profiles!user_id(first_name, last_name, email, phone),
            offer:offers(title)
        `)
        .eq('partner_id', profileData.partner_id)
        // Order by booking_date descending by default
        .order('booking_date', { ascending: false });

      if (error) {
        console.error("Error fetching bookings:", error);
        toast.error("Impossible de charger les réservations");
      } else {
        setBookings(data as any);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced search function
  const filteredBookings = bookings.filter(booking => {
    const searchLower = searchTerm.toLowerCase();

    // Construct searchable strings
    const fullName = `${booking.user?.first_name || ''} ${booking.user?.last_name || ''}`.toLowerCase();
    const email = booking.user?.email?.toLowerCase() || '';
    const phone = booking.user?.phone?.toLowerCase() || '';
    const offerTitle = booking.offer?.title?.toLowerCase() || '';

    // Check if any field matches the search term
    const matchesSearch =
      fullName.includes(searchLower) ||
      email.includes(searchLower) ||
      phone.includes(searchLower) ||
      offerTitle.includes(searchLower);

    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Gestion des Réservations
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Suivez vos clients, validez les achats et consultez vos revenus.
          </p>
        </div>

        {/* --- Toolbar: Search & Filter --- */}
        <div className="mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <input
              type="text"
              placeholder="Rechercher (Nom, Email, Offre)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full md:w-48 appearance-none pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium text-gray-700"
              >
                <option value="all">Tous les statuts</option>
                {Object.entries(statusConfig).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* --- Data Table --- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-20 px-6">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Aucune réservation trouvée</h3>
              <p className="text-gray-500 max-w-sm mx-auto mb-6">
                {searchTerm || statusFilter !== 'all'
                  ? "Essayez de modifier vos filtres ou votre recherche."
                  : "Vos futurs clients apparaîtront ici dès qu'ils auront réservé une de vos offres !"}
              </p>
              {(searchTerm || statusFilter !== 'all') && (
                <button
                  onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                  className="text-primary hover:text-primary-dark font-medium text-sm"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">
                      Offre réservée
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredBookings.map((booking) => {
                    const status = statusConfig[booking.status] || statusConfig.pending;
                    const type = typeConfig[booking.source] || { label: booking.source, className: 'bg-gray-100' };

                    return (
                      <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors group">
                        {/* Client */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-primary to-primary-dark text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white">
                              {booking.user?.first_name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-bold text-gray-900">
                                {booking.user?.first_name} {booking.user?.last_name}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {booking.user?.email && (
                              <a href={`mailto:${booking.user.email}`} className="text-sm text-gray-600 hover:text-primary flex items-center gap-1.5 transition-colors">
                                <Mail className="w-3.5 h-3.5" />
                                {booking.user.email}
                              </a>
                            )}
                            {booking.user?.phone ? (
                              <a href={`tel:${booking.user.phone}`} className="text-sm text-gray-600 hover:text-primary flex items-center gap-1.5 transition-colors">
                                <Phone className="w-3.5 h-3.5" />
                                {booking.user.phone}
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400 italic pl-5">Non renseigné</span>
                            )}
                          </div>
                        </td>

                        {/* Offer */}
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900 line-clamp-2" title={booking.offer?.title}>
                              {booking.offer?.title || 'Offre inconnue'}
                            </span>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">
                              {new Date(booking.booking_date).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                            <span className="text-xs text-gray-500">
                              à {new Date(booking.booking_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${type.className}`}>
                            {type.label}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${status.className}`}>
                            <status.icon className="w-3 h-3 mr-1.5" />
                            {status.label}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-bold text-gray-900 font-mono tracking-tight">
                            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: booking.currency || 'EUR' }).format(booking.amount || 0)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}