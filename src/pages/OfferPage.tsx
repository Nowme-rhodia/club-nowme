
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Calendar, Clock, Euro, Gift, ShoppingBag, X, Check, ArrowRight, Star, Heart, Share2, Info, Youtube, Video, Building, ArrowLeft, Globe, CheckCircle, ChevronLeft, ChevronRight, Lock, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

import { stripePromise } from '../lib/stripe';
import { categories } from '../data/categories';
import { getCategoryGradient } from '../utils/categoryColors';
import { getCategoryBackground } from '../utils/categoryBackgrounds';
import toast from 'react-hot-toast';
import { useAuth } from '../lib/auth';
import { SEO } from '../components/SEO';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import DOMPurify from 'dompurify'; // Safe HTML rendering

// Type definition to avoid errors
declare global {
  interface Window {
    Calendly: any;
  }
}

export default function OfferPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, isAdmin, isPartner, isSubscriber } = useAuth();

  // Access Control Logic
  const hasAccess = isSubscriber || isAdmin || isPartner || (user?.email === 'rhodia@nowme.fr');
  const isPending = user && !hasAccess;
  const isGuest = !user;

  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showEventConfirmModal, setShowEventConfirmModal] = useState(false);

  // State for selected variant
  const [selectedVariant, setSelectedVariant] = useState<any>(null);

  // State for Installment Plan
  const [installmentPlan, setInstallmentPlan] = useState<string>('1x');

  // Carousel State
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [images, setImages] = useState<string[]>([]);

  // Calendly State
  const [calendlyDate, setCalendlyDate] = useState<string | null>(null);
  // Ref for robust address retrieval (bypassing state lag if autofill happens)
  const meetingAddressRef = useRef<HTMLInputElement>(null);
  const calendlyDateRef = React.useRef<string | null>(null); // Ref to store date
  const [isCalendlyOpen, setIsCalendlyOpen] = useState(false); // Track popup state
  // Manual Confirmation Fallback State
  const [showDateConfirmModal, setShowDateConfirmModal] = useState(false);
  const [manualDateInput, setManualDateInput] = useState<string>('');

  // Inject Calendly Script and Cleanup
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup script
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Initialize Inline Widget when offer is available
  useEffect(() => {
    // We check if the container exists and if Calendly is loaded
    // Note: Calendly script might load async, so we might need a retry or wait for load.
    // However, the script is usually fast.
    const initWidget = () => {
      if (offer && window.Calendly && document.getElementById('calendly-inline-widget')) {
        window.Calendly.initInlineWidget({
          url: `${offer.calendly_url}${offer.calendly_url.includes('?') ? '&' : '?'}timezone=Europe/Paris&hide_landing_page_details=1&hide_gdpr_banner=1`, // Force Timezone & Clean UI
          parentElement: document.getElementById('calendly-inline-widget'),
          prefill: {
            name: (profile?.first_name && profile?.last_name) ? `${profile.first_name} ${profile.last_name}` : undefined,
            email: user?.email,
            location: meetingAddress // Prefill location
          },
          utm: {},
          // timezone: 'Europe/Paris' // Kept as backup, but URL param is stronger
        });
      }
    };

    // Attempt init
    const timer = setTimeout(initWidget, 1000); // Give script time to load
    return () => clearTimeout(timer);
  }, [offer, profile, user]);

  // Listen for Calendly Events with Robust Handling
  useEffect(() => {
    const handleCalendlyEvent = (e: any) => {
      // 1. Safe Data Parsing
      let data = e.data;
      if (typeof data === 'string' && (data.includes('calendly') || data.startsWith('{'))) {
        try {
          data = JSON.parse(data);
        } catch (err) {
          return;
        }
      }

      const isCalendly = (data && data.event && data.event.indexOf('calendly') === 0);

      if (isCalendly) {
        // --- A. Capture Provisional Date (Click on slot) ---
        if (data.event === 'calendly.date_and_time_selected') {
          const payload = data.payload || {};
          let selectedDate = payload.date_and_time?.start_time || payload.start_time;

          if (selectedDate) {
            console.log("[CALENDLY] Date Selected (Provisional):", selectedDate);
            try {
              window.sessionStorage.setItem('calendly_last_selected_date', selectedDate);
            } catch (storageErr) {
              console.warn("[CALENDLY] SessionStorage blocked:", storageErr);
            }
            calendlyDateRef.current = selectedDate;
            setCalendlyDate(selectedDate);
          }
        }

        // --- B. Capture Final Booking (Confirmation) ---
        if (data.event === 'calendly.event_scheduled') {
          console.log("[CALENDLY] Event Scheduled - Extracting Data...");
          const payload = data.payload || {};

          // Priority 1: User Suggested Path (Invitee Object)
          // Often located at payload.invitee.scheduled_at
          let scheduledDate = payload.invitee?.scheduled_at;

          // Priority 2: Event Object Path
          if (!scheduledDate) {
            scheduledDate = payload.event?.start_time || payload.resource?.start_time;
          }

          // Priority 3: Session Storage Fallback
          if (!scheduledDate) {
            try {
              const storedDate = window.sessionStorage.getItem('calendly_last_selected_date');
              if (storedDate) {
                console.log("[CALENDLY] Recovered date from SessionStorage:", storedDate);
                scheduledDate = storedDate;
              }
            } catch (err) { /* ignore */ }
          }

          // Priority 4: Ref Fallback
          if (!scheduledDate && calendlyDateRef.current) {
            scheduledDate = calendlyDateRef.current;
          }

          if (scheduledDate) {
            console.log("✅ CONFIRMED Calendly Date:", scheduledDate);
            setCalendlyDate(scheduledDate);
            try {
              window.sessionStorage.removeItem('calendly_last_selected_date');
            } catch (e) { /* ignore */ }

            handlePostCalendly(scheduledDate);
          } else {
            console.error("CRITICAL: Calendly date could not be found via Payload, Storage, or Ref.", payload);
            // Trigger Manual Fallback Modal if strictly needed
            setShowDateConfirmModal(true);
            // Do NOT error toast immediately, give chance for manual input if modal exists
          }
        }
      }
    };

    window.addEventListener('message', handleCalendlyEvent);
    return () => window.removeEventListener('message', handleCalendlyEvent);
  }, []);

  // Helper to trigger booking after Calendly
  const handlePostCalendly = (date: string) => {
    console.log("Calendly Date Captured:", date);
    setCalendlyDate(date);
    calendlyDateRef.current = date;
    toast.success("Date confirmée ! Veuillez compléter les informations ci-dessous.");

    // Auto-scroll to next section (Zone Selector)
    setTimeout(() => {
      const zoneSection = document.getElementById('zone-selector-section');
      if (zoneSection) zoneSection.scrollIntoView({ behavior: 'smooth' });
    }, 500);
  };



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
  is_online,
  zip_code,
  city,
  cancellation_policy,
  coordinates,
  calendly_url,
  booking_type,
  external_link,
  promo_code,
  event_start_date,
  event_end_date,
  installment_options,
  image_url,
  category: offer_categories!offers_category_id_fkey(name, slug, parent_slug),
    offer_variants(id, name, description, price, discounted_price, stock),
    offer_media(url, type),
    digital_product_file,

    service_zones,
    promo_conditions,
    duration_type,
    validity_start_date,
    validity_end_date,
    partner:partners(id, business_name)
      `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching offer:', error);
      } else {
        const formattedOffer = {
          ...data,
          location: [data.street_address, data.zip_code, data.city].filter(Boolean).join(', ') || 'Adresse non spécifiée',
          public_location: data.city || 'Lieu secret', // For non-members
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

  // State for Service Zones
  // State for Service Zones
  const [selectedZoneCode, setSelectedZoneCode] = useState<string>('');
  const [meetingAddress, setMeetingAddress] = useState<string>('');

  const handleAddressSelect = (address: string, postcode: string, city: string) => {
    if (!offer.service_zones || offer.service_zones.length === 0) return;

    const depCode = postcode.substring(0, 2);
    const zone = offer.service_zones.find((z: any) => z.code === depCode);

    if (zone) {
      setSelectedZoneCode(depCode);
      setMeetingAddress(address);
      toast.success(`Zone ${depCode} validée(+${zone.fee}€)`);
    } else {
      setSelectedZoneCode('');
      setMeetingAddress('');
      toast.error(`Désolé, le département ${depCode} n'est pas desservi par ce partenaire.`);
    }
  };

  // Reset selected zone if offer changes
  useEffect(() => {
    if (offer?.service_zones && offer.service_zones.length > 0) {
      setSelectedZoneCode('');
    }
  }, [offer]);

  useEffect(() => {
    if (offer?.offer_variants?.length > 0 && !selectedVariant) {
      // Auto-select first available variant
      const available = offer.offer_variants.find((v: any) => v.stock === null || v.stock > 0);
      setSelectedVariant(available || offer.offer_variants[0]);
    }
  }, [offer, selectedVariant]);

  const selectedZone = offer?.service_zones?.find((z: any) => z.code === selectedZoneCode);
  const travelFee = selectedZone ? (Number(selectedZone.fee) || 0) : 0;

  const priceInfo = selectedVariant
    ? {
      price: selectedVariant.discounted_price || selectedVariant.price,
      original_price: selectedVariant.discounted_price ? selectedVariant.price : null,
      variant_id: selectedVariant.id
    }
    : { price: 0, original_price: null, variant_id: null };

  // Total to Pay (Price + Travel Fee)
  const totalToPay = (priceInfo.price || 0) + travelFee;

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
      toast.success('Lien copié dans le presse-papier !');
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



  const handleStripeCheckout = async (bookingType: 'calendly' | 'event', scheduledDate?: string) => {
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

      // Validate Zone for At Home
      if (offer.service_zones && offer.service_zones.length > 0 && !selectedZoneCode) {
        toast.error("Veuillez sélectionner votre zone géographique.");
        setBookingLoading(false);
        return;
      }



      // Validate User Email for Checkout
      if (!user?.email) {
        console.warn("User email missing in auth context. Attempting to fetch or warn.");
        // Ideally we should alert, but let's just log for now as it might be a race condition.
        // We pass what we have.
      }

      const payload = {
        offer_id: offer.id,
        variant_id: variantId,
        price: price,
        user_id: user?.id,
        user_email: user?.email || '', // Ensure string to avoid 'undefined' in JSON if possible, though JSON.stringify handles it.
        booking_type: bookingType,
        travel_fee: travelFee,
        department_code: selectedZoneCode,
        meeting_location: meetingAddressRef.current?.value || meetingAddress, // Robust Ref usage
        installment_plan: installmentPlan, // Pass selected plan ('1x', '2x', '3x', '4x')
        scheduled_at: scheduledDate // NEW: Pass the date!
      };

      console.log("PAYLOAD DEBUG (Checkout):", payload);



      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          ...payload,
          success_url: `${window.location.origin}/booking-success`,
          cancel_url: window.location.href,
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

  // openCalendly unmounted. Inline widget used instead.

  // Manual trigger if listener fails
  const handleManualCalendlyContinue = () => {
    // If user clicks this, they claim they finished booking.
    // We try to find a date or use NOW.
    console.log("Manual Fallback Triggered");
    const now = new Date().toISOString();
    handlePostCalendly(now);
  };

  const bookEvent = async (arg?: string | React.MouseEvent) => {
    const scheduledDate = typeof arg === 'string' ? arg : undefined;

    // Autofill Protection: Get address directly from input ref if possible
    const addressToUse = meetingAddressRef.current?.value || meetingAddress;

    // SECURITY LOG
    console.log('DEBUG BOOKING:', {
      scheduledDate,
      meetingAddress: addressToUse, // Log the actual value we will use
      user_id: user?.id,
      offer_id: offer.id
    });

    setBookingLoading(true);
    setShowEventConfirmModal(false);
    try {
      // Capture DATA (booking_id) returned by RPC
      const { data, error } = await supabase.rpc('confirm_booking', {
        p_user_id: user?.id,
        p_offer_id: offer.id,
        p_booking_date: scheduledDate || new Date().toISOString(), // Use synced date!
        p_status: 'confirmed',
        p_source: 'event',
        p_amount: priceInfo.price,
        p_variant_id: priceInfo.variant_id,
        p_external_id: `evt_${offer.id}_${user?.id}_${Date.now()}`
      } as any);

      if (error) throw error;

      // Robust check for Booking ID
      // If RPC returns integer/string directly, 'data' is that value.
      // Adjust if RPC returns object. Assuming scalar or object with id.
      const bookingId = (typeof data === 'number' || typeof data === 'string') ? data : (data as any)?.id || (data as any)?.booking_id;

      console.log("ID de réservation récupéré:", bookingId, "RPC Data:", data);

      // DATA PERSISTENCE PATCH
      // We update valid fields that might not be handled by RPC or need explicit set
      const updates: any = {};
      if (scheduledDate) updates.scheduled_at = scheduledDate;
      if (addressToUse) updates.meeting_location = addressToUse;

      if (bookingId && Object.keys(updates).length > 0) {
        const { error: patchError } = await supabase.from('bookings').update(updates).eq('id', bookingId);
        if (patchError) console.error("Patch Error:", patchError);
        else console.log("Booking patched with:", updates);
      }

      toast.success("Inscription validée ! Retrouvez-la dans 'Mes réservations'.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur lors de l'inscription.");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!hasAccess) {
      // Should rely on CTA buttons instead but for safety:
      toast('Rejoignez le club pour réserver !', { icon: '✨' });
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
          p_user_id: user!.id,
          p_offer_id: offer.id,
          p_booking_date: new Date().toISOString(),
          p_status: 'promo_claimed',
          p_source: 'promo',
          p_amount: price,
          p_variant_id: priceInfo.variant_id,
          p_external_id: `promo_${offer.id}_${user!.id}_${Date.now()}`
        } as any);

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

    if (type === 'calendly') {
      // With Inline Widget, we must ensure date is selected
      if (!calendlyDate) {
        toast.error("Veuillez choisir un créneau ci-dessus avant de continuer.", { icon: '📅' });
        document.getElementById('calendly-inline-widget')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      // Proceed to checkout with the captured date
      if (price > 0) {
        handleStripeCheckout('calendly', calendlyDate);
      } else {
        bookEvent(calendlyDate);
      }
      return;
    }

    if (price > 0) {
      handleStripeCheckout(type as 'calendly' | 'event');
    } else {
      if (type === 'event') {
        setShowEventConfirmModal(true);
      }
    }
  };

  const getButtonLabel = () => {
    const type = offer.booking_type || 'calendly';
    const price = priceInfo.price || 0;
    const count = parseInt(installmentPlan) || 1;
    const payableAmount = (price / count);
    const priceSuffix = price > 0 ? ` (${payableAmount.toFixed(0)}€)` : '';

    if (isOutOfStock) return 'Victime de son succès';

    if (type === 'event') return `S'inscrire${priceSuffix}`;
    if (type === 'promo') return 'Profiter de l\'offre';

    if (price > 0) return 'Payer et Réserver';
    return 'Réserver';
  };

  // SEO Description construction
  const seoDescription = offer ? `${offer.description.substring(0, 150)}... Découvrez ce kiff exclusif sur Club Nowme !` : '';

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* SEO Injection */}
      <SEO
        title={offer?.title || 'Détail offre'}
        description={seoDescription}
        image={offer?.image_url}
        canonical={window.location.href}
      />

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
        onClick={() => navigate('/tous-les-kiffs')}
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
                      {offer.is_online ? <Globe className="w-5 h-5 text-primary" /> : <MapPin className="w-5 h-5 text-gray-400" />}
                      <span className={`text-gray-600 ${!offer.is_online && !hasAccess ? 'blur-[4px] select-none opacity-60' : ''}`}>
                        {offer.is_online
                          ? "Expérience en ligne"
                          : hasAccess
                            ? (offer.street_address ? `${offer.street_address}, ${offer.zip_code} ${offer.city}` : "Lieu non précisé")
                            : "Adresse réservée aux membres"
                        }
                      </span>
                      {!offer.is_online && !hasAccess && (
                        <span className="ml-2 text-sm text-gray-500">({offer.city || "Paris"})</span>
                      )}
                    </div>

                    {offer.booking_type === 'event' && offer.event_start_date && (
                      <div className="flex items-center gap-1.5 bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                        <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-primary font-medium text-sm">
                          {new Date(offer.event_start_date).toLocaleString('fr-FR', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                          {offer.event_end_date && ` - ${new Date(offer.event_end_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                        </span>
                      </div>
                    )}

                    {offer.duration_type === 'fixed' && offer.validity_start_date && (
                      <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span className="text-amber-700 font-medium text-sm">
                          Valable du {new Date(offer.validity_start_date).toLocaleDateString('fr-FR')} au {new Date(offer.validity_end_date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    )}

                    {/* WALLET PACK DISCLAIMER */}
                    {offer.booking_type === 'wallet_pack' && (
                      <div className="w-full mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
                        <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">Validité : 6 mois</p>
                          <p className="text-xs text-blue-700 mt-1">
                            Utilisable uniquement chez ce partenaire.
                            Remboursable sur demande (hors frais) si non consommé.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {offer.partner && offer.partner.business_name && (
                    <Link
                      to={`/partenaire/${offer.partner.id}`}
                      className="inline-flex items-center gap-2 mb-6 text-gray-600 hover:text-primary transition-colors group"
                    >
                      <Building className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span className="font-semibold text-lg border-b border-transparent group-hover:border-primary">
                        {offer.partner.business_name}
                      </span>
                      <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </Link>
                  )}

                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
                    {/* Rich Text Display */}
                    <div
                      className="text-gray-600 leading-relaxed prose prose-sm max-w-none prose-p:mb-2 prose-ul:list-disc prose-ul:pl-4 prose-ol:list-decimal prose-ol:pl-4"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(offer.description) }}
                    />
                  </div>

                  {offer.is_online && offer.booking_type === 'event' && (
                    <div className="mb-6 p-4 bg-indigo-50 text-indigo-900 rounded-xl border border-indigo-100 flex gap-3">
                      <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p className="text-sm font-medium">
                        Votre lien de connexion pour accéder à l'expérience vous sera donné après votre inscription complète.
                      </p>
                    </div>
                  )}

                  {(offer.booking_type === 'purchase' || offer.digital_product_file) && (
                    <div className="mb-6 p-4 bg-blue-50 text-blue-900 rounded-xl border border-blue-100 flex gap-3">
                      <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p className="text-sm font-medium">
                        Votre document vous sera donné après inscription complète.
                      </p>
                    </div>
                  )}

                  {offer.cancellation_policy && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <h2 className="text-sm font-semibold text-gray-900 mb-1">Conditions d'annulation</h2>
                      <p className="text-sm text-gray-600">
                        {offer.booking_type === 'purchase'
                          ? 'Non remboursable'
                          : offer.booking_type === 'promo'
                            ? 'Voir conditions sur le site partenaire'
                            : {
                              'flexible': 'Flexible (Annulable sans frais jusqu\'à 15 jours avant le Kiff)',
                              'moderate': 'Modérée (Annulable sans frais jusqu\'à 7 jours avant le Kiff)',
                              'strict': 'Stricte (Annulable sans frais jusqu\'à 24h avant le Kiff)',
                              'non_refundable': 'Non remboursable (Pas de remboursement possible)'
                            }[offer.cancellation_policy as string] || 'Non spécifié'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-6 mt-auto relative">

                  {/* PAYWALL OVERLAY */}
                  {!hasAccess && (
                    <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-xl">
                      <div className="bg-white p-6 rounded-2xl shadow-xl text-center max-w-sm border border-gray-100 mx-4">
                        <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Lock className="w-6 h-6 text-pink-600" />
                        </div>

                        {isPending ? (
                          <>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                              Contente de te revoir {profile?.first_name || 'chère membre'} ! ✨
                            </h3>
                            <p className="text-gray-600 mb-6">
                              Tu y es presque ! Choisis ton plan pour débloquer ce kiff et tous les autres.
                            </p>
                            <Link
                              to={`/subscription?redirectTo=${encodeURIComponent(location.pathname)}`}
                              className="block w-full py-3 bg-pink-500 text-white rounded-full font-bold hover:bg-pink-600 transition-colors shadow-lg hover:shadow-pink-500/25"
                            >
                              Finaliser mon adhésion
                            </Link>
                          </>
                        ) : (
                          <>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                              Ce kiff est réservé aux membres
                            </h3>
                            <p className="text-gray-600 mb-6">
                              Rejoins le club pour profiter de cette offre et découvrir toute la collection.
                            </p>
                            <Link
                              to={`/auth/signup?redirectTo=${encodeURIComponent(location.pathname)}`}
                              className="block w-full py-3 bg-pink-500 text-white rounded-full font-bold hover:bg-pink-600 transition-colors shadow-lg hover:shadow-pink-500/25"
                            >
                              Rejoindre le club
                            </Link>
                            <div className="mt-4 text-sm text-gray-500">
                              Déjà membre ?{' '}
                              <Link
                                to={`/auth/signin?redirectTo=${encodeURIComponent(location.pathname)}`}
                                className="text-pink-500 font-medium hover:underline"
                              >
                                Se connecter
                              </Link>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}


                  {/* Variant Selector (Blurred if no access) */}
                  <div className={!hasAccess ? 'filter blur-sm select-none opacity-50' : ''}>
                    {offer.booking_type !== 'promo' && offer.offer_variants && offer.offer_variants.length > 0 && (
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
                                disabled={isVariantOutOfStock || !hasAccess}
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

                    {/* --- INLINE CALENDLY WIDGET --- */}
                    {offer.booking_type === 'calendly' && (
                      <div className="mb-6 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4 uppercase text-sm tracking-wider flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Choisissez votre créneau
                        </h3>

                        <div
                          id="calendly-inline-widget"
                          style={{ minWidth: '320px', height: '700px', overflow: 'hidden' }}
                        />

                        {!calendlyDate && (
                          <div className="text-center mt-2 p-2 bg-blue-50 text-blue-700 rounded-lg text-sm">
                            👆 Veuillez sélectionner une date ci-dessus
                          </div>
                        )}

                        {calendlyDate && (
                          <div className="text-center mt-4 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 flex items-center justify-center gap-2">
                            <CheckCircle className="w-5 h-5" />
                            <div>
                              <div className="font-bold">Créneau sélectionné !</div>
                              <div className="text-sm">{new Date(calendlyDate).toLocaleString()}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}


                    <div id="zone-selector-section" className="flex items-center justify-between mb-4 bg-gray-50 p-4 rounded-xl flex-col sm:flex-row gap-4 sm:gap-0">

                      {/* --- Zone Selector & Address (At Home Only) --- */}
                      {offer.service_zones && offer.service_zones.length > 0 && (
                        <div className="w-full mb-6 border-b border-gray-100 pb-6">

                          {/* Zones Table */}
                          <div className="mb-4 bg-blue-50/50 rounded-lg p-3 text-sm">
                            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              1. Sélectionnez votre zone
                            </h4>
                            <div className="grid grid-cols-3 gap-2">
                              {offer.service_zones.map((z: any) => (
                                <button
                                  key={z.code}
                                  onClick={() => {
                                    if (selectedZoneCode === z.code) {
                                      setSelectedZoneCode(''); // Deselect
                                    } else {
                                      setSelectedZoneCode(z.code);
                                      toast.success(`Zone ${z.code} sélectionnée (+${z.fee}€)`);
                                    }
                                  }}
                                  className={`px-2 py-1.5 rounded text-xs border font-medium transition-all ${selectedZoneCode === z.code
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                                    }`}
                                >
                                  {z.code} {z.fee > 0 ? `(+${z.fee}€)` : '(Gratuit)'}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className={`transition-all duration-300 ${!selectedZoneCode ? 'opacity-50 pointer-events-none blur-[1px]' : 'opacity-100'}`}>
                            <label className="block text-sm font-bold text-gray-900 mb-2">
                              2. Saisissez votre adresse complète
                            </label>
                            <input
                              ref={meetingAddressRef}
                              type="text"
                              placeholder="Ex: 12 Rue de la Paix, 75000 Paris"
                              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-gray-400 font-medium"
                              value={meetingAddress}
                              onChange={(e) => setMeetingAddress(e.target.value)}
                              autoComplete="new-password"
                              name={`address_field_no_autofill_${Math.random().toString(36).substr(2, 9)}`}
                              data-lpignore="true"
                              data-1p-ignore="true"
                            />
                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              Cette adresse sera transmise au prestataire.
                            </p>
                          </div>

                          {/* DEBUG ADDRESS STATE REMOVED FOR CLEANER UI, BUT DATA FLOW SECURED */}
                        </div>
                      )}


                      <div className="w-full sm:w-auto text-right">

                        {/* --- Installment Selector --- */}
                        {offer.booking_type !== 'promo' && offer.price !== 0 && (
                          <div className="mb-4 flex flex-col items-end">
                            {/* Logic: Show options if defined AND price > 100 AND startDate > 7 days */}
                            {(() => {
                              const isEligibleDate = !offer.event_start_date || (new Date(offer.event_start_date).getTime() - Date.now() > 7 * 24 * 60 * 60 * 1000);
                              const validOptions = (offer.installment_options || []).filter((opt: string) => ['2x', '3x', '4x'].includes(opt));

                              // Only show if we have options and date is OK
                              // User requested "sans montant minimum", so we rely on Partner's choice.
                              if (validOptions.length > 0 && isEligibleDate) {
                                return (
                                  <div className="flex bg-gray-100 p-1 rounded-lg">
                                    <button
                                      onClick={() => setInstallmentPlan('1x')}
                                      className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${installmentPlan === '1x' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                                    >
                                      1x
                                    </button>
                                    {validOptions.map((opt: string) => (
                                      <button
                                        key={opt}
                                        onClick={() => setInstallmentPlan(opt)}
                                        className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${installmentPlan === opt ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                                      >
                                        {opt}
                                      </button>
                                    ))}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}

                        <p className="text-sm text-gray-500 mb-1">
                          {installmentPlan !== '1x' ? `Montant à régler aujourd'hui (${installmentPlan})` : 'Total à payer'}
                        </p>
                        <div className="flex flex-col items-end">
                          <div className="flex items-baseline justify-end gap-2">
                            <span className="text-3xl font-bold text-gray-900">
                              {(totalToPay / (parseInt(installmentPlan) || 1)).toFixed(2)}€
                            </span>
                            {priceInfo.original_price && (
                              <span className="text-lg text-gray-400 line-through">
                                {priceInfo.original_price}€
                              </span>
                            )}
                          </div>
                          {installmentPlan !== '1x' && (
                            <p className="text-xs text-gray-500 mt-1 mb-2 max-w-[200px] text-right">
                              Puis {(parseInt(installmentPlan) || 1) - 1} mensualités de {(totalToPay / (parseInt(installmentPlan) || 1)).toFixed(2)}€
                              <br />
                              <span className="text-primary italic">Prélèvement automatique chaque mois</span>
                            </p>
                          )}
                        </div>

                        {travelFee > 0 && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            Dont frais déplacements : +{travelFee}€
                          </p>
                        )}
                      </div>
                      <button
                        onClick={handleShare}
                        className="p-3 bg-white text-gray-700 rounded-full shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md active:scale-95"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Fake CTA for blurred view, although covered by overlay */}
                    {isCalendlyOpen && (
                      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                        <p className="text-sm text-yellow-800 mb-2">
                          Vous avez terminé votre réservation mais la fenêtre ne se ferme pas ?
                        </p>
                        <button
                          onClick={handleManualCalendlyContinue}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 underline"
                        >
                          Cliquez ici pour finaliser l'inscription
                        </button>
                      </div>
                    )}

                    <button
                      onClick={handleBooking}
                      disabled={bookingLoading || isOutOfStock || !hasAccess}
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
                  </div>

                  {/* Promo Modal and Event Modal remain same, but unreachable if !hasAccess */}
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
                            <Calendar className="w-8 h-8 text-primary" />
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
                            <div className="flex items-center text-gray-600 mb-4">
                              <MapPin className="w-5 h-5 mr-2" />
                              <span className="mr-4">{offer.city}</span>
                              <Building className="w-5 h-5 mr-2" />
                              <Link to={`/partenaire/${offer.partner_id}`} className="hover:text-primary hover:underline transition-colors font-medium">
                                {offer.partner?.business_name}
                              </Link>
                            </div>
                            <div className="flex items-center text-gray-600 mb-4">
                              <MapPin className="w-5 h-5 mr-2" />
                              <span className="mr-4">{offer.city}</span>
                              <Building className="w-5 h-5 mr-2" />
                              <Link to={`/partenaire/${offer.partner_id}`} className="hover:text-primary hover:underline transition-colors font-medium">
                                {offer.partner?.business_name}
                              </Link>
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
                              disabled={bookingLoading || (offer.booking_type === 'calendly' && !calendlyDate)}
                              className="py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                              {(offer.booking_type === 'calendly' && !calendlyDate) ? 'Validation...' : (bookingLoading ? 'Validation...' : 'Confirmer')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manual Date Confirmation Modal (Fallback) */}
                  {showDateConfirmModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl animate-scale-in">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar className="w-8 h-8 text-yellow-600" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">Confirmation de la date</h3>
                          <p className="text-gray-500 mb-6 text-sm">
                            Pour finaliser votre réservation, veuillez confirmer la date et l'heure que vous avez choisies sur Calendly.
                          </p>

                          <div className="bg-gray-50 p-4 rounded-xl mb-6">
                            <label className="block text-left text-sm font-bold text-gray-700 mb-2">Date et Heure du rendez-vous</label>
                            <input
                              type="datetime-local"
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                              onChange={(e) => {
                                if (e.target.value) {
                                  // Store temporarily or directly confirm?
                                  // Let's use a local var in this scope if possible, or just state.
                                  // Better to use state for this modal if input is needed.
                                  // But simpler: just auto-confirm on change? No, explicit button.
                                  setManualDateInput(e.target.value);
                                }
                              }}
                            />
                          </div>

                          <button
                            onClick={() => {
                              if (manualDateInput) {
                                handlePostCalendly(new Date(manualDateInput).toISOString());
                                setShowDateConfirmModal(false);
                              } else {
                                toast.error("Veuillez sélectionner une date.");
                              }
                            }}
                            className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark shadow-lg"
                          >
                            Confirmer et Continuer
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div >
          </div >
        </div >
      </div >
    </div >
  );
}
