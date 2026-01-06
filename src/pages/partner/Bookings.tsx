import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  Loader2,
  MapPin,
  Download
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Booking {
  id: string;
  created_at: string;
  booking_date: string;
  meeting_location?: string;
  status: 'paid' | 'confirmed' | 'cancelled' | 'pending';
  source: 'calendly' | 'event' | 'promo' | 'purchase';
  amount: number;
  currency: string;
  user?: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    subscription_status: string | null;
    is_ambassador: boolean | null;
  };
  offer?: {
    title: string;
  };
  variant?: {
    name: string;
  };
}

const statusConfig = {
  paid: { label: 'Payé', className: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  confirmed: { label: 'Confirmé', className: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle },
  pending: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  cancelled: { label: 'Annulé', className: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
};

const typeConfig = {
  event: { label: 'Événement', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  calendly: { label: 'Rendez-vous', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  purchase: { label: 'Achat', className: 'bg-pink-100 text-pink-800 border-pink-200' },
  promo: { label: 'Promo', className: 'bg-orange-100 text-orange-800 border-orange-200' },
};

export default function PartnerBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      setLoading(true);

      // Get partner profile
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('partner_id')
        .eq('user_id', user?.id || '')
        .single();

      if (!profileData?.partner_id) {
        throw new Error('Partner profile not found');
      }

      const { data, error } = await supabase
        .from('bookings')
        .select(`
            id,
            booking_date,
            meeting_location,
            status,
            source,
            amount,
            currency,
            user:user_profiles!bookings_user_id_fkey_profiles(first_name, last_name, email, phone, subscription_status, is_ambassador),
            offer:offers(title),
            variant:offer_variants(name)
        `)
        // Cast profileData to any to avoid 'never' type error
        .eq('partner_id', (profileData as any).partner_id)
        .order('booking_date', { ascending: false });

      if (error) throw error;
      setBookings(data as any || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Erreur lors du chargement des réservations');
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const searchString = searchTerm.toLowerCase();
    const userName = `${booking.user?.first_name} ${booking.user?.last_name}`.toLowerCase();
    const offerTitle = booking.offer?.title?.toLowerCase() || '';
    return userName.includes(searchString) || offerTitle.includes(searchString);
  });

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mes Réservations</h1>
        <p className="text-gray-500 mt-1">Suivez les inscriptions et commandes de vos clients.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header / Search */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un client, une offre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <button
            onClick={fetchBookings}
            className="p-2 text-gray-500 hover:text-primary transition-colors"
            title="Actualiser"
          >
            <Clock className="w-5 h-5" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              Aucune réservation trouvée.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-medium tracking-wider text-left">
                <tr>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3">Offre</th>
                  <th className="px-6 py-3">Option</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-center">Source</th>
                  <th className="px-6 py-3 text-center">Statut</th>
                  <th className="px-6 py-3 text-right">Montant</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {filteredBookings.map((booking) => {
                  const status = statusConfig[booking.status] || statusConfig.pending;
                  const type = typeConfig[booking.source] || typeConfig.event;

                  return (
                    <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
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
                            {/* STATUS BADGES */}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {booking.user?.is_ambassador && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800">
                                  Ambassadrice
                                </span>
                              )}
                              {booking.user?.subscription_status === 'active' && !booking.user?.is_ambassador && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-pink-100 text-pink-800">
                                  Kiffeuse Active
                                </span>
                              )}
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
                        <div className="flex flex-col">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]" title={booking.offer?.title}>
                            {booking.offer?.title || 'Offre inconnue'}
                          </p>
                        </div>
                      </td>

                      {/* Variant */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${booking.variant?.name ? 'bg-gray-100 text-gray-800' : 'text-gray-400 italic'}`}>
                          {booking.variant?.name || '-'}
                        </span>
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
                          <div className="flex items-center gap-1 mt-1 text-xs text-blue-600" title={booking.meeting_location || "Lieu de l'offre (Cabinet/Partenaire)"}>
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[150px]">
                              {booking.meeting_location || "Lieu: Cabinet / Standard"}
                            </span>
                          </div>
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

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <a
                          href={`/partner/bookings/${booking.id}`}
                          className="text-primary hover:text-primary-dark font-semibold hover:underline"
                        >
                          Voir détails
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}