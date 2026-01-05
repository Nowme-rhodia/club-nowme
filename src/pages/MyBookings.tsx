import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Calendar, MapPin, Mail, ArrowRight, Sparkles, Copy, Ticket, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Booking {
    cancelled_by_partner?: boolean;

    id: string;
    booking_date: string;
    scheduled_at?: string;
    meeting_location?: string; // New field
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
        digital_product_file?: string;
        external_link?: string;
        is_online?: boolean;

        event_end_date?: string;
        cancellation_policy?: 'flexible' | 'moderate' | 'strict' | 'non_refundable';
        partner?: {
            contact_email?: string;
            business_name?: string;
            address?: string;
        };
    };
}

export default function MyBookings() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled' | 'purchases'>('upcoming');
    const [loading, setLoading] = useState(true);

    // Review Modal State
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    // Cancellation Modal State
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<Booking | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);

    useEffect(() => {
        if (user) {
            fetchBookings();
        }
    }, [user]);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    id,
                    booking_date,
                    scheduled_at,
                    meeting_location,
                    created_at,
                    status,
                    cancelled_by_partner,
                    customer_email,
                    source,
                    external_id,
                    offer: offers (
                        id,
                        title,
                        image_url,
                        city,
                        promo_code,
                        booking_type,
                        event_start_date,
                        digital_product_file,
                        event_end_date,
                        cancellation_policy,
                        external_link,
                        is_online,
                        partner: partners (
                            contact_email,
                            business_name,
                            address
                        )
                    )
                `)
                .eq('user_id', user?.id)
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

    const filteredBookings = bookings.filter((booking) => {
        const isCancelled = booking.status === 'cancelled';
        if (activeTab === 'cancelled') return isCancelled;
        if (isCancelled) return false;

        const type = booking.offer?.booking_type || 'event';
        const isPurchaseOrPromo = type === 'purchase' || type === 'promo';

        if (activeTab === 'purchases') {
            return isPurchaseOrPromo;
        }

        if (isPurchaseOrPromo) return false;

        const dateToCheck = booking.scheduled_at
            ? new Date(booking.scheduled_at)
            : (booking.offer?.event_start_date ? new Date(booking.offer.event_start_date) : new Date(booking.booking_date));
        const now = new Date();

        if (activeTab === 'past') {
            return dateToCheck < now;
        } else {
            return dateToCheck >= now;
        }
    });

    const openCancelModal = (booking: Booking) => {
        setSelectedBookingForCancel(booking);
        setCancelModalOpen(true);
    };

    const handleCancelBooking = async () => {
        if (!selectedBookingForCancel) return;
        setIsCancelling(true);
        try {
            // Basic client cancellation - calling a hypothetical function or using status update if allowed
            // Assuming there is a 'cancel-booking' function for clients
            const { error } = await supabase.functions.invoke('cancel-booking', {
                body: { bookingId: selectedBookingForCancel.id }
            });

            if (error) throw error;

            toast.success('Réservation annulée');
            setCancelModalOpen(false);
            fetchBookings();
        } catch (error) {
            console.error('Error cancelling:', error);
            toast.error("Erreur lors de l'annulation");
        } finally {
            setIsCancelling(false);
        }
    };

    const openReviewModal = (booking: Booking) => {
        setSelectedBookingForReview(booking);
        setRating(0);
        setComment('');
        setReviewModalOpen(true);
    };

    const submitReview = async () => {
        if (!selectedBookingForReview || rating === 0) return;
        setIsSubmittingReview(true);
        try {
            const { error } = await supabase
                .from('reviews')
                .insert({
                    booking_id: selectedBookingForReview.id,
                    offer_id: selectedBookingForReview.offer.id,
                    user_id: user?.id,
                    rating,
                    comment
                } as any);
            if (error) throw error;
            toast.success('Avis envoyé !');
            setReviewModalOpen(false);
        } catch (error) {
            console.error('Error review:', error);
            toast.error("Erreur l'envoi de l'avis");
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const getStatusBadge = (booking: Booking) => {
        switch (booking.status) {
            case 'confirmed':
            case 'paid':
            case 'promo_claimed':
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
                if (booking.cancelled_by_partner) {
                    return (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Annulé par le pro
                        </span>
                    );
                }
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

                {/* Tabs UI */}
                <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
                    <button
                        className={`pb-4 px-4 font-medium whitespace-nowrap ${activeTab === 'upcoming' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('upcoming')}
                    >
                        À venir
                    </button>
                    <button
                        className={`pb-4 px-4 font-medium whitespace-nowrap ${activeTab === 'purchases' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('purchases')}
                    >
                        Mes Achats sans RDV
                    </button>
                    <button
                        className={`pb-4 px-4 font-medium whitespace-nowrap ${activeTab === 'past' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('past')}
                    >
                        Terminées
                    </button>
                    <button
                        className={`pb-4 px-4 font-medium whitespace-nowrap ${activeTab === 'cancelled' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('cancelled')}
                    >
                        Annulées
                    </button>
                </div>

                {filteredBookings.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Sparkles className="w-10 h-10 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            Aucune réservation {activeTab === 'upcoming' ? 'à venir' : activeTab === 'past' ? 'terminée' : activeTab === 'purchases' ? 'dans vos achats' : 'annulée'}
                        </h2>
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
                        {filteredBookings.map((booking) => (
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
                                                {getStatusBadge(booking)}
                                            </div>

                                            {booking.cancelled_by_partner && (
                                                <div className="mb-4 bg-orange-50 border border-orange-100 rounded-lg p-3">
                                                    <div className="flex items-start gap-2 text-sm text-orange-800">
                                                        <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                                                        <p>
                                                            Cette séance a été annulée par le professionnel. Vous avez été intégralement remboursé.
                                                            <br />
                                                            <Link to="/tous-les-kiffs" className="font-semibold underline hover:text-orange-900 mt-1 inline-block">
                                                                Découvrir d'autres expériences similaires →
                                                            </Link>
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

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
                                                                : (booking.offer?.booking_type === 'purchase' || booking.offer?.booking_type === 'promo')
                                                                    ? "Disponible depuis"
                                                                    : (booking.scheduled_at) ? "Rendez-vous le" : "Date du RDV"
                                                            }
                                                        </span>
                                                        <div className="flex flex-col">
                                                            {booking.scheduled_at ? (
                                                                <span className="font-medium capitalize text-lg text-primary">
                                                                    {format(new Date(booking.scheduled_at), "EEEE d MMMM 'à' HH'h'mm", { locale: fr })}
                                                                </span>
                                                            ) : booking.offer?.event_start_date ? (
                                                                <span className="font-medium capitalize text-lg text-primary">
                                                                    {format(new Date(booking.offer.event_start_date), "EEEE d MMMM 'à' HH'h'mm", { locale: fr })}
                                                                </span>
                                                            ) : (
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium capitalize text-lg text-gray-900">
                                                                        {format(new Date(booking.booking_date), "d MMMM yyyy", { locale: fr })}
                                                                    </span>
                                                                    {(booking.offer?.booking_type === 'calendly' || !booking.offer?.booking_type) && (
                                                                        <span className="text-xs text-orange-600 font-medium mt-0.5">
                                                                            Date de rendez-vous à définir
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="mt-1 flex items-start gap-1 text-sm text-gray-500">
                                                            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                                            <span className="break-all">
                                                                {booking.offer?.is_online
                                                                    ? "Événement en ligne (Voir lien ci-dessous)"
                                                                    : (booking.meeting_location || booking.offer?.partner?.address || booking.offer?.city || "Lieu à confirmer")
                                                                }
                                                            </span>
                                                        </div>
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

                                                {/* External Link (Visio) */}
                                                {(booking.offer?.external_link && booking.offer?.booking_type === 'event') && (
                                                    <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2 text-blue-800">
                                                            <div className="p-1.5 bg-white rounded-full">
                                                                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-sm block">Lien de la visio disponible</span>
                                                                <span className="text-xs opacity-75">Connectez-vous à l'heure du rendez-vous</span>
                                                            </div>
                                                        </div>
                                                        <a
                                                            href={booking.offer.external_link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors whitespace-nowrap w-full sm:w-auto text-center"
                                                        >
                                                            Accéder au lien visio
                                                        </a>
                                                    </div>
                                                )}

                                                {/* Digital Product Download Button */}
                                                {booking.offer?.digital_product_file && (
                                                    <div className="mt-3 bg-pink-50 border border-pink-100 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2 text-pink-800">
                                                            <div className="p-1.5 bg-white rounded-full">
                                                                <svg className="w-4 h-4 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-sm block">Contenu digital disponible</span>
                                                                <span className="text-xs opacity-75">Téléchargez votre fichier (E-book, PDF...)</span>
                                                            </div>
                                                        </div>
                                                        <a
                                                            href={booking.offer.digital_product_file}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            download
                                                            className="text-xs font-bold text-white bg-pink-600 hover:bg-pink-700 px-4 py-2 rounded-lg transition-colors whitespace-nowrap w-full sm:w-auto text-center"
                                                        >
                                                            Télécharger le fichier
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center">
                                            {/* Review Button - Only for Past & Confirmed Bookings */}
                                            {activeTab === 'past' && ['confirmed', 'paid', 'promo_claimed'].includes(booking.status) && (
                                                <button
                                                    onClick={() => openReviewModal(booking)}
                                                    className="text-sm font-medium text-gray-600 hover:text-primary transition-colors flex items-center"
                                                >
                                                    <Sparkles className="w-4 h-4 mr-1.5" />
                                                    Donner mon avis
                                                </button>
                                            )}

                                            {/* Cancel Button - Only for Upcoming & Confirmed/Paid/Pending Bookings */}
                                            {activeTab === 'upcoming' && ['confirmed', 'paid', 'pending'].includes(booking.status) && (
                                                <button
                                                    onClick={() => openCancelModal(booking)}
                                                    className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors flex items-center mr-4"
                                                >
                                                    Annuler
                                                </button>
                                            )}

                                            <Link
                                                to={`/offres/${booking.offer?.id}`}
                                                className="text-primary hover:text-primary-dark font-medium text-sm flex items-center ml-auto"
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

            {/* Review Modal */}
            {
                reviewModalOpen && selectedBookingForReview && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
                            <button
                                onClick={() => setReviewModalOpen(false)}
                                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                            >
                                <span className="sr-only">Fermer</span>
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            <h3 className="text-xl font-bold text-gray-900 mb-2">Notez votre expérience</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Comment s'est passé votre moment chez <strong>{selectedBookingForReview.offer.partner?.business_name || selectedBookingForReview.offer.title}</strong> ?
                            </p>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                submitReview();
                            }}>
                                <div className="flex justify-center gap-2 mb-6">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            className="focus:outline-none transition-transform hover:scale-110"
                                        >
                                            <svg
                                                className={`w-10 h-10 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`}
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={star <= rating ? 0 : 2}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                            </svg>
                                        </button>
                                    ))}
                                </div>

                                <div className="mb-6">
                                    <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                                        Votre avis (optionnel)
                                    </label>
                                    <textarea
                                        id="comment"
                                        rows={4}
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                                        placeholder="Dites-nous ce que vous avez aimé..."
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmittingReview || rating === 0}
                                    className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmittingReview ? 'Envoi...' : 'Envoyer mon avis'}
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Cancellation Modal */}
            {
                cancelModalOpen && selectedBookingForCancel && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
                            <button
                                onClick={() => setCancelModalOpen(false)}
                                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                    <AlertTriangle className="w-6 h-6 text-red-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Annuler la réservation ?</h3>
                                <p className="text-sm text-gray-500 mt-2">
                                    {selectedBookingForCancel.offer.title}
                                </p>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                                <h4 className="text-sm font-semibold text-gray-900 mb-1">Politique d'annulation</h4>
                                <p className="text-sm text-gray-600">
                                    {(() => {
                                        const policy = selectedBookingForCancel.offer.cancellation_policy || 'flexible';
                                        switch (policy) {
                                            case 'flexible': return "Flexible : Remboursement intégral jusqu'à 24h avant l'événement.";
                                            case 'moderate': return "Modérée : Remboursement intégral jusqu'à 7 jours avant l'événement.";
                                            case 'strict': return "Stricte : Remboursement intégral jusqu'à 15 jours avant l'événement.";
                                            case 'non_refundable': return "Non remboursable : Aucun remboursement possible.";
                                            default: return "Conditions standard.";
                                        }
                                    })()}
                                </p>
                                <p className="text-xs text-gray-500 mt-2 italic">
                                    En annulant maintenant, le remboursement sera traité automatiquement selon ces conditions.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setCancelModalOpen(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Conserver
                                </button>
                                <button
                                    onClick={handleCancelBooking}
                                    disabled={isCancelling}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                                >
                                    {isCancelling ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Traitement...
                                        </>
                                    ) : 'Confirmer l\'annulation'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
