import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Share2, ArrowLeft, Star, Navigation, Copy, ExternalLink, Calendar as CalendarIcon, Clock, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
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

  // State for selected variant
  const [selectedVariant, setSelectedVariant] = useState<any>(null);

  // Carousel State
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [images, setImages] = useState<string[]>([]);

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
          offer_variants(id, name, description, price, discounted_price, stock),
          offer_media(url, type)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching offer:', error);
      } else {
        const formattedOffer = {
          ...data,
          location: [data.street_address, data.zip_code, data.city].filter(Boolean).join(', ') || 'Adresse non spécifiée',
          category_slug: (data as any).category?.parent_slug || (data as any).category?.slug || 'autre',
          subcategory_slug: (data as any).category?.parent_slug ? (data as any).category.slug : undefined,
          parsed_coordinates: (typeof data.coordinates === 'string')
            ? (() => {
              const matches = data.coordinates.match(/\((.*),(.*)\)/);
              return matches ? { lat: parseFloat(matches[1]), lng: parseFloat(matches[2]) } : null;
            })()
            : Array.isArray(data.coordinates)
              ? { lat: data.coordinates[0], lng: data.coordinates[1] }
              : null,
          // Sort variants by price ascending
          offer_variants: data.offer_variants?.sort((a: any, b: any) =>
            (a.discounted_price || a.price) - (b.discounted_price || b.price)
          )
        };

        // Prepare Images
        const imgs = [formattedOffer.image_url].filter(Boolean);
        if (formattedOffer.offer_media && formattedOffer.offer_media.length > 0) {
          formattedOffer.offer_media.forEach((m: any) => imgs.push(m.url));
        }
        setImages(imgs);

        setOffer(formattedOffer);
      }
      setLoading(false);
    };

    fetchOffer();
  }, [id]);

  useEffect(() => {
    if (offer?.offer_variants?.length > 0 && !selectedVariant) {
      // Auto-select first available variant
      const available = offer.offer_variants.find((v: any) => v.stock === null || v.stock > 0);
      setSelectedVariant(available || offer.offer_variants[0]);
    }
  }, [offer, selectedVariant]);

  const priceInfo = selectedVariant
    ? {
      price: selectedVariant.discounted_price || selectedVariant.price,
      original_price: selectedVariant.discounted_price ? selectedVariant.price : null,
      variant_id: selectedVariant.id
    }
    : { price: 0, original_price: null, variant_id: null };

  const isOutOfStock = selectedVariant && selectedVariant.stock !== null && selectedVariant.stock <= 0;

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

  const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

  const handleStripeCheckout = async (bookingType: 'calendly' | 'event') => {
    setBookingLoading(true);
    try {
      const price = priceInfo.price || 0;
      const variantId = priceInfo.variant_id;

      // Validate Variant Selection
      if (offer.offer_variants && offer.offer_variants.length > 0 && !variantId) {
        toast.error("Veuillez sélectionner une option (tarif).");
        setBookingLoading(false);
        return;
      }

      console.log("Initiating Checkout:", {
        offer_id: offer.id,
        variant_id: variantId,
        price,
        booking_type: bookingType
      });

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          offer_id: offer.id,
          variant_id: variantId, // Explicitly passing variant_id
          price: price,
          user_id: user?.id,
          success_url: `${window.location.origin}/booking-success`,
          cancel_url: window.location.href,
          booking_type: bookingType
        }
      });

      if (error) {
        console.error("Supabase Function Error:", error);
        throw error;
      }

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
    setShowEventConfirmModal(false);
    try {
      const { error } = await supabase.rpc('confirm_booking', {
        p_user_id: user?.id,
        p_offer_id: offer.id,
        p_booking_date: new Date().toISOString(),
        p_status: 'confirmed',
        p_source: 'event',
        p_amount: priceInfo.price,
        p_variant_id: priceInfo.variant_id,
        p_external_id: `evt_${offer.id}_${user?.id}_${Date.now()}`
      });

      if (error) throw error;
      toast.success("Inscription validée ! Retrouvez-la dans 'Mes réservations'.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur lors de l'inscription.");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!user) {
      toast.error("Veuillez vous connecter pour réserver");
      navigate('/signin');
      return;
    }

    const type = offer.booking_type || 'calendly';
    const price = priceInfo.price || 0;

    if (isOutOfStock) {
      toast.error("Ce tarif est épuisé.");
      return;
    }

    if (type === 'promo') {
      setBookingLoading(true);
      try {
        const { error } = await supabase.rpc('confirm_booking', {
          p_user_id: user.id,
          p_offer_id: offer.id,
          p_booking_date: new Date().toISOString(),
          p_status: 'promo_claimed',
          p_source: 'promo',
          p_amount: price,
          p_variant_id: priceInfo.variant_id,
          p_external_id: `promo_${offer.id}_${user.id}_${Date.now()}`
        });

        if (error) throw error;

        setBookingLoading(false);
        setShowPromoModal(true);
      } catch (e: any) {
        console.error("Promo log error", e);
        toast.error(e.message || "Erreur lors de la récupération du code promo");
        setBookingLoading(false);
      }
      return;
    }

    if (price > 0) {
      handleStripeCheckout(type as 'calendly' | 'event');
    } else {
      if (type === 'calendly') {
        openCalendly();
      } else if (type === 'event') {
        setShowEventConfirmModal(true);
      }
    }
  };

  const getButtonLabel = () => {
    const type = offer.booking_type || 'calendly';
    const price = priceInfo.price || 0;
    const priceSuffix = price > 0 ? ` (${price}€)` : '';

    if (isOutOfStock) return 'Victime de son succès';

    if (type === 'event') return `S'inscrire${priceSuffix}`;
    if (type === 'promo') return 'Profiter de l\'offre';

    if (price > 0) return 'Payer et Réserver';
    return 'Réserver';
  };

  const rating = 4.8;

  return (
    <div className="relative min-h-screen overflow-hidden">
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

      <button
        onClick={() => navigate(-1)}
        className="fixed top-24 left-4 z-10 p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
      >
        <ArrowLeft className="w-6 h-6 text-gray-600 group-hover:text-primary" />
      </button>

      <div className="relative min-h-screen pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap gap-2 mb-6 justify-center">
            {category && (
              <span className="px-4 py-2 rounded-full text-white bg-white/20 backdrop-blur-sm font-medium">
                {category.name}
              </span>
            )}
          </div>

          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              <div className="relative h-96 lg:h-full overflow-hidden bg-gray-900 group">
                {images.length > 0 ? (
                  <>
                    <img
                      src={images[currentImageIndex]}
                      alt={offer.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                          onClick={() => setCurrentImageIndex((prev) => (prev + 1) % images.length)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                          {images.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setCurrentImageIndex(idx)}
                              className={`w-2 h-2 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white w-4' : 'bg-white/50'}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">Pas d'image</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              </div>

              <div className="p-6 lg:p-8 flex flex-col h-full">
                <div className="flex-grow">
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">{offer.title}</h1>

                  <div className="flex items-center gap-6 mb-6 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600">{offer.location || "Lieu non précisé"}</span>
                    </div>

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

                    <div className="flex items-center gap-1.5">
                      <Star className="w-5 h-5 text-yellow-400 fill-current" />
                      <span className="text-gray-600">{rating.toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
                    <p className="text-gray-600 leading-relaxed">{offer.description}</p>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6 mt-auto">

                  {/* Variant Selector */}
                  {offer.offer_variants && offer.offer_variants.length > 0 && (
                    <div className="mb-6">
                      <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
                        Choisissez votre formule
                      </label>
                      <div className="space-y-3">
                        {offer.offer_variants.map((variant: any) => {
                          const isSelected = selectedVariant?.id === variant.id;
                          const isVariantOutOfStock = variant.stock !== null && variant.stock <= 0;
                          const hasPromo = variant.discounted_price && variant.discounted_price < variant.price;

                          return (
                            <button
                              key={variant.id}
                              onClick={() => !isVariantOutOfStock && setSelectedVariant(variant)}
                              disabled={isVariantOutOfStock}
                              className={`w-full text-left p-4 rounded-xl border-2 transition-all relative group ${isSelected
                                ? 'border-primary bg-primary/5 shadow-md'
                                : isVariantOutOfStock
                                  ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                                  : 'border-gray-100 hover:border-primary/50 hover:bg-gray-50'
                                }`}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-primary' : 'border-gray-300'
                                    }`}>
                                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                  </div>
                                  <div>
                                    <div className="font-bold text-gray-900 flex items-center gap-2">
                                      {variant.name}
                                      {isVariantOutOfStock && (
                                        <span className="text-[10px] uppercase font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                                          Épuisé
                                        </span>
                                      )}
                                    </div>
                                    {variant.description && (
                                      <p className="text-sm text-gray-500 mt-0.5">{variant.description}</p>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right">
                                  {hasPromo ? (
                                    <>
                                      <div className="font-bold text-primary text-lg">
                                        {variant.discounted_price}€
                                      </div>
                                      <div className="text-sm text-gray-400 line-through decoration-gray-400">
                                        {variant.price}€
                                      </div>
                                    </>
                                  ) : (
                                    <div className="font-bold text-gray-900 text-lg">
                                      {variant.price}€
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4 bg-gray-50 p-4 rounded-xl">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Total à payer</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-gray-900">
                          {priceInfo.price}€
                        </span>
                        {priceInfo.original_price && (
                          <span className="text-lg text-gray-400 line-through">
                            {priceInfo.original_price}€
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleShare}
                      className="p-3 bg-white text-gray-700 rounded-full shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md active:scale-95"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                  <button
                    onClick={handleBooking}
                    disabled={bookingLoading || isOutOfStock}
                    className={`w-full px-6 py-4 text-white rounded-xl font-bold text-lg shadow-lg transition-all duration-300 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isOutOfStock ? 'bg-gray-400' : 'bg-primary hover:bg-primary-dark'
                      }`}
                  >
                    {bookingLoading ? (
                      <>
                        <Clock className="w-5 h-5 animate-spin" />
                        Traitement...
                      </>
                    ) : getButtonLabel()}
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
          </div>
        </div>
      </div>
    </div>
  );
}
