import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Share2, ArrowLeft, Star, Navigation, Copy, ExternalLink, Calendar as CalendarIcon, Clock, CreditCard, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { loadStripe } from '@stripe/stripe-js';
import { MapComponent } from '../components/MapComponent';
import { categories } from '../data/categories';
import { getCategoryGradient } from '../utils/categoryColors';
import { getCategoryBackground } from '../utils/categoryBackgrounds';
import toast from 'react-hot-toast';
import { useAuth } from '../lib/auth';

export default function OfferPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showEventConfirmModal, setShowEventConfirmModal] = useState(false);

  useEffect(() => {
    const fetchOffer = async () => {
      if (!id) return;

      const { data, error } = await (supabase
        .from('offers') as any)
        .select(`
          id,
          title,
          description,
          street_address,
          zip_code,
          city,
          coordinates,
          calendly_url,
          booking_type,
          external_link,
          promo_code,
          event_start_date,
          event_end_date,
          image_url,
          category:offer_categories!offers_category_id_fkey(name, slug, parent_slug),
          offer_variants(price, discounted_price)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching offer:', error);
      } else {
        // Aligner avec les noms de champs attendus par le reste du composant
        const formattedOffer = {
          ...data,
          location: [data.street_address, data.zip_code, data.city].filter(Boolean).join(', ') || 'Adresse non spécifiée',
          category_slug: (data as any).category?.parent_slug || (data as any).category?.slug || 'autre',
          subcategory_slug: (data as any).category?.parent_slug ? (data as any).category.slug : undefined,
          // Parser coordinates
          parsed_coordinates: (typeof data.coordinates === 'string')
            ? (() => {
              const matches = data.coordinates.match(/\((.*),(.*)\)/);
              return matches ? { lat: parseFloat(matches[1]), lng: parseFloat(matches[2]) } : null;
            })()
            : Array.isArray(data.coordinates)
              ? { lat: data.coordinates[0], lng: data.coordinates[1] }
              : null
        };
        setOffer(formattedOffer);
      }
      setLoading(false);
    };

    fetchOffer();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  if (!offer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Offre introuvable</h1>
          <p className="text-gray-600 mb-8">Cette offre n'existe pas ou a été supprimée.</p>
          <Link
            to="/tous-les-kiffs"
            className="inline-flex items-center px-6 py-3 rounded-full text-white bg-primary hover:bg-primary-dark transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Retour aux offres
          </Link>
        </div>
      </div>
    );
  }

  // Find category based on slug
  const category = categories.find(c => c.slug === offer.category_slug);
  const gradient = getCategoryGradient(category?.slug || 'default');
  const backgroundImage = getCategoryBackground(category?.slug || 'default');

  const getPrice = () => {
    if (!offer.offer_variants || offer.offer_variants.length === 0) return { price: 0, discounted_price: undefined };
    // Logic: show lowest price available
    const prices = offer.offer_variants;
    return prices[0]; // Simplified for now
  };

  const priceInfo = getPrice();

  const discount = priceInfo.discounted_price
    ? Math.round(
      ((priceInfo.price - priceInfo.discounted_price) /
        priceInfo.price) *
      100
    )
    : 0;

  const coordinates = offer.parsed_coordinates ? {
    lat: offer.parsed_coordinates.lat,
    lng: offer.parsed_coordinates.lng
  } : {
    lat: 48.8566 + (Math.random() - 0.5) * 0.1,
    lng: 2.3522 + (Math.random() - 0.5) * 0.1,
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: offer.title,
          text: offer.description,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Erreur lors du partage:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Lien copié dans le presse-papier !');
    }
  };

  // Helper to get formatted date
  const getEventDate = () => {
    if (!offer.event_start_date) return '';
    return new Date(offer.event_start_date).toLocaleString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Stripe Promise
  const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

  const handleStripeCheckout = async (bookingType: 'calendly' | 'event') => {
    setBookingLoading(true);
    try {
      const price = priceInfo.discounted_price || priceInfo.price || 0;

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          offer_id: offer.id,
          price: price,
          user_id: user?.id,
          success_url: `${window.location.origin}/booking-success`,
          cancel_url: window.location.href,
          booking_type: bookingType
        }
      });

      if (error) throw error;
      if (!data?.sessionId) throw new Error("No session ID returned");

      const stripe = await stripePromise;
      const { error: stripeError } = await stripe!.redirectToCheckout({
        sessionId: data.sessionId
      });

      if (stripeError) throw stripeError;

    } catch (err: any) {
      console.error("Payment Error:", err);
      toast.error("Erreur lors de l'initialisation du paiement: " + (err.message || "Unknown error"));
      setBookingLoading(false);
    }
  };

  const openCalendly = () => {
    if (offer.calendly_url) {
      window.open(offer.calendly_url, '_blank');
      toast.success("Redirection vers l'agenda...");
    } else {
      toast.error("Lien Calendly manquant");
    }
  };

  const bookEvent = async () => {
    setBookingLoading(true);
    setShowEventConfirmModal(false); // Close confirm modal if open
    try {
      const { error } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          offer_id: offer.id,
          booking_date: new Date().toISOString(),
          status: 'confirmed',
          source: 'event',
          external_id: `evt_${offer.id}_${user.id}_${Date.now()}`
        });

      if (error) throw error;
      toast.success("Inscription validée ! Retrouvez-la dans 'Mes réservations'.");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'inscription.");
    } finally {
      setBookingLoading(false);
      setPendingAction(null);
    }
  };

  const handleBooking = async () => {
    if (!user) {
      toast.error("Veuillez vous connecter pour réserver");
      navigate('/signin');
      return;
    }

    const type = offer.booking_type || 'calendly'; // Default for legacy offers
    const price = priceInfo.discounted_price || priceInfo.price || 0;

    if (type === 'promo') {
      // Promo Code: Log claim then show modal (no payment)
      setBookingLoading(true);
      try {
        await supabase.from('bookings').insert({
          user_id: user.id,
          offer_id: offer.id,
          booking_date: new Date().toISOString(),
          status: 'promo_claimed',
          source: 'promo',
          external_id: `promo_${offer.id}_${user.id}_${Date.now()}`
        });
      } catch (e) {
        console.error("Promo log error", e);
      }
      setBookingLoading(false);
      setShowPromoModal(true);
      return;
    }

    // Logic for Paid vs Free
    if (price > 0) {
      handleStripeCheckout(type as 'calendly' | 'event');
    } else {
      // Free logic
      if (type === 'calendly') {
        openCalendly();
      } else if (type === 'event') {
        setShowEventConfirmModal(true);
      }
    }
  };

  const getButtonLabel = () => {
    const type = offer.booking_type || 'calendly';
    const price = priceInfo.discounted_price || priceInfo.price || 0;
    const priceSuffix = price > 0 ? ` (${price}€)` : '';

    if (type === 'event') return `S'inscrire${priceSuffix}`;
    if (type === 'promo') return 'Profiter de l\'offre';

    // Calendly
    if (price > 0) return 'Payer et Réserver';
    return 'Réserver';
  };

  const rating = 4.8; // Mock rating since it's not in DB

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background image with overlay */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, ${gradient.from}99, ${gradient.to}99)`,
          }}
        />
      </div>

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-24 left-4 z-10 p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
      >
        <ArrowLeft className="w-6 h-6 text-gray-600 group-hover:text-primary" />
      </button>

      {/* Main content */}
      <div className="relative min-h-screen pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Category badges */}
          <div className="flex flex-wrap gap-2 mb-6 justify-center">
            {category && (
              <span className="px-4 py-2 rounded-full text-white bg-white/20 backdrop-blur-sm font-medium">
                {category.name}
              </span>
            )}
          </div>

          {/* Main card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              {/* Image principale */}
              <div className="relative aspect-[4/3] lg:aspect-square overflow-hidden">
                {(offer.image_url || offer.offer_media?.[0]) ? (
                  <img
                    src={offer.image_url || offer.offer_media?.[0]?.url}
                    alt={offer.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                    Pas d'image
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Badge de réduction */}
                {priceInfo.discounted_price && (
                  <div className="absolute top-4 right-4 px-3 py-1.5 bg-primary text-white rounded-full font-semibold text-sm shadow-lg">
                    -{discount}%
                  </div>
                )}
              </div>

              {/* Informations principales */}
              <div className="p-6 lg:p-8 flex flex-col h-full">
                <div className="flex-grow">
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">{offer.title}</h1>

                  <div className="flex items-center gap-6 mb-6 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600">{offer.location || "Lieu non précisé"}</span>
                    </div>

                    {/* Event Dates Display */}
                    {offer.booking_type === 'event' && offer.event_start_date && (
                      <div className="flex items-center gap-1.5 bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                        <CalendarIcon className="w-4 h-4 text-primary" />
                        <span className="text-primary font-medium text-sm">
                          {new Date(offer.event_start_date).toLocaleString('fr-FR', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                          {offer.event_end_date && ` - ${new Date(offer.event_end_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                        </span>
                      </div>
                    )}

                    {/* Mock rating display */}
                    <div className="flex items-center gap-1.5">
                      <Star className="w-5 h-5 text-yellow-400 fill-current" />
                      <span className="text-gray-600">{rating.toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
                    <p className="text-gray-600 leading-relaxed">{offer.description}</p>
                  </div>

                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Localisation</h2>
                    <div className="flex items-start gap-4">
                      <div className="w-32 h-32 rounded-lg overflow-hidden shrink-0">
                        <MapComponent center={coordinates} />
                      </div>
                      <div>
                        <p className="text-gray-600 mb-2">{offer.location}</p>
                        <button className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors">
                          <Navigation className="w-4 h-4" />
                          <span className="text-sm font-medium">Voir sur la carte</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Prix et actions */}
                <div className="border-t border-gray-100 pt-6 mt-auto">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Prix</p>
                      <div className="flex items-baseline gap-2">
                        {priceInfo.discounted_price ? (
                          <>
                            <span className="text-3xl font-bold text-primary">
                              {priceInfo.discounted_price}€
                            </span>
                            <span className="text-xl text-gray-400 line-through">
                              {priceInfo.price}€
                            </span>
                          </>
                        ) : (
                          <span className="text-3xl font-bold text-gray-900">
                            {priceInfo.price}€
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleShare}
                      className="p-3 bg-gray-100 text-gray-700 rounded-full transition-all duration-300 hover:bg-gray-200 active:scale-95"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                  <button
                    onClick={handleBooking}
                    disabled={bookingLoading}
                    className="w-full px-6 py-3 bg-primary text-white rounded-full font-medium transition-all duration-300 hover:bg-primary-dark hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bookingLoading ? 'Traitement...' : getButtonLabel()}
                  </button>

                  {/* Promo Modal */}
                  {showPromoModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl animate-scale-in relative">
                        <button
                          onClick={() => setShowPromoModal(false)}
                          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                        >
                          <span className="sr-only">Fermer</span>
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="text-center">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">Félicitations !</h3>
                          <p className="text-gray-500 mb-6">Voici votre code promo à utiliser :</p>

                          <div className="bg-gray-100 p-4 rounded-xl flex items-center justify-between mb-6 border-2 border-dashed border-gray-300">
                            <code className="text-xl font-mono font-bold text-primary tracking-wider">{offer.promo_code}</code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(offer.promo_code);
                                toast.success("Code copié !");
                              }}
                              className="p-2 text-gray-500 hover:text-primary transition-colors"
                            >
                              <Copy className="w-5 h-5" />
                            </button>
                          </div>

                          <div className="space-y-3">
                            <a
                              href={offer.external_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                            >
                              Accéder au site partenaire
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => setShowPromoModal(false)}
                              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                            >
                              Fermer
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment Modal Removed - using Stripe Checkout Redirect */}

                  {/* Event Confirm Modal */}
                  {showEventConfirmModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl animate-scale-in">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CalendarIcon className="w-8 h-8 text-primary" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">Confirmation d'inscription</h3>
                          <p className="text-gray-500 mb-6">
                            Vous êtes sur le point de vous inscrire à l'événement :
                          </p>

                          <div className="bg-gray-50 p-4 rounded-xl mb-6 text-left">
                            <h4 className="font-bold text-gray-900 mb-1">{offer.title}</h4>
                            <div className="flex items-center gap-2 text-gray-600 text-sm">
                              <Clock className="w-4 h-4" />
                              <span>{getEventDate()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 text-sm mt-1">
                              <MapPin className="w-4 h-4" />
                              <span>{offer.location || offer.city}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => setShowEventConfirmModal(false)}
                              className="py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={bookEvent}
                              disabled={bookingLoading}
                              className="py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark disabled:opacity-70"
                            >
                              {bookingLoading ? 'Validation...' : 'Confirmer'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Similar offers disabled for now */}
          </div>
        </div>
      </div>
    </div>
  );
}
