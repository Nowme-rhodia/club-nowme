import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Calendar, MapPin, Mail, ArrowRight, Sparkles, Copy, Ticket } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';


interface Booking {
    id: string;
    booking_date: string;
    created_at: string;
    status: string;
    customer_email: string;
    source?: string;
    external_id?: string;
    offer: {
        id: string;
        title: string;
        image_url: string;
        city: string;
        promo_code?: string;
        booking_type?: string;
        event_start_date?: string;
        event_end_date?: string;
        partner?: {
            contact_email?: string;
            business_name?: string;
        };
    };
}

export default function MyBookings() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchBookings();
        }
    }, [user]);

    const fetchBookings = async () => {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
          id,
          id,
          booking_date,
          created_at,
          status,
          customer_email,
          source,
          external_id,
          offer:offers (
            id,
            title,
            image_url,
            city,
            promo_code,
            booking_type,
            event_start_date,
            event_end_date,
            partner:partners (
                contact_email,
                business_name
            )
          )
        `)
                .eq('user_id', user!.id)
                .order('booking_date', { ascending: false });

            if (error) throw error;
            setBookings(data || []);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'confirmed':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Confirmé
                    </span>
                );
            case 'pending':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        En attente
                    </span>
                );
            case 'cancelled':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Annulé
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {status}
                    </span>
                );
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                    <Calendar className="w-8 h-8 text-primary" />
                    Mes Réservations
                </h1>

                {bookings.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Sparkles className="w-10 h-10 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            Vous n'avez pas encore de kiff réservé !
                        </h2>
                        <p className="text-gray-600 mb-8 max-w-md mx-auto">
                            Il est temps de vous faire plaisir. Découvrez toutes nos expériences exclusives et réservez votre prochain moment de bonheur.
                        </p>
                        <Link
                            to="/tous-les-kiffs"
                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-primary hover:bg-primary-dark transition-colors duration-200"
                        >
                            Explorer les offres
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {bookings.map((booking) => (
                            <div
                                key={booking.id}
                                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
                            >
                                <div className="flex flex-col sm:flex-row">
                                    {/* Image */}
                                    <div className="sm:w-48 h-48 sm:h-auto relative">
                                        <img
                                            src={booking.offer?.image_url || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80'}
                                            alt={booking.offer?.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 p-6 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                                                        {booking.offer?.title || 'Offre supprimée'}
                                                    </h3>
                                                    {booking.offer?.city && (
                                                        <div className="flex items-center text-gray-500 text-sm mb-2">
                                                            <MapPin className="w-4 h-4 mr-1" />
                                                            {booking.offer.city}
                                                        </div>
                                                    )}
                                                </div>
                                                {getStatusBadge(booking.status)}
                                            </div>

                                            <div className="space-y-3">
                                                {/* Purchase Date */}
                                                <div className="flex items-center text-gray-700">
                                                    <Calendar className="w-5 h-5 mr-3 text-gray-400" />
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                                                            Réservé le
                                                        </span>
                                                        <span className="font-medium text-sm">
                                                            {format(new Date(booking.created_at || booking.booking_date), "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Event/Appt Date */}
                                                <div className="flex items-center text-gray-700">
                                                    <Calendar className="w-5 h-5 mr-3 text-primary" />
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                                                            {booking.offer?.booking_type === 'event' || booking.offer?.event_start_date
                                                                ? "Date de l'événement"
                                                                : "Rendez-vous le"
                                                            }
                                                        </span>
                                                        <span className="font-medium capitalize text-lg">
                                                            {booking.offer?.event_start_date
                                                                ? format(new Date(booking.offer.event_start_date), "EEEE d MMMM 'à' HH'h'mm", { locale: fr })
                                                                : format(new Date(booking.booking_date), "EEEE d MMMM 'à' HH'h'mm", { locale: fr })
                                                            }
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Partner Contact Information */}
                                                {booking.offer?.partner?.contact_email && (
                                                    <div className="flex items-center text-gray-600">
                                                        <Mail className="w-5 h-5 mr-3 text-gray-400" />
                                                        <div className="flex flex-col">
                                                            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Contact Partenaire</span>
                                                            <a href={`mailto:${booking.offer.partner.contact_email}`} className="text-sm hover:text-primary transition-colors">
                                                                {booking.offer.partner.contact_email}
                                                            </a>
                                                        </div>
                                                    </div>
                                                )}



                                                {/* Promo Code Display */}
                                                {(booking.source === 'promo' && booking.offer?.promo_code) && (
                                                    <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between group cursor-pointer hover:bg-gray-100 transition-colors"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(booking.offer.promo_code || '');
                                                            toast.success('Code copié !');
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Ticket className="w-4 h-4 text-primary" />
                                                            <span className="text-sm text-gray-500">Code Promo :</span>
                                                            <span className="font-mono font-bold text-gray-900">{booking.offer.promo_code}</span>
                                                        </div>
                                                        <Copy className="w-4 h-4 text-gray-400 group-hover:text-primary" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-6 pt-4 border-t border-gray-50 flex justify-end">
                                            <Link
                                                to={`/offres/${booking.offer?.id}`}
                                                className="text-primary hover:text-primary-dark font-medium text-sm flex items-center"
                                            >
                                                Voir l'offre
                                                <ArrowRight className="w-4 h-4 ml-1" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
