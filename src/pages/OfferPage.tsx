
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Calendar, Clock, Euro, Gift, ShoppingBag, X, Check, ArrowRight, Star, Heart, Share2, Info, Youtube, Video, Building, ArrowLeft, Globe, CheckCircle, ChevronLeft, ChevronRight, Lock, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Breadcrumbs } from '../components/Breadcrumbs';

import { stripePromise } from '../lib/stripe';
import { categories } from '../data/categories';
import { getCategoryGradient } from '../utils/categoryColors';
import { getCategoryBackground } from '../utils/categoryBackgrounds';
import toast from 'react-hot-toast';
import { useAuth } from '../lib/auth';
import { SEO } from '../components/SEO';
import GuestBookingModal from '../components/GuestBookingModal';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import DOMPurify from 'dompurify'; // Safe HTML rendering

// Type definition to avoid errors
declare global {
  interface Window {
    Calendly: any;
  }
}

export default function OfferPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, isAdmin, isPartner, isSubscriber, refreshProfile } = useAuth();

  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showEventConfirmModal, setShowEventConfirmModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [isAlreadyBooked, setIsAlreadyBooked] = useState(false);

  // Access Control Logic
  const isOfficial = offer?.is_official === true || offer?.partner?.contact_email === 'rhodia@nowme.fr' || offer?.partner?.business_name === 'Nowme';
  const isGuest = !user;

  // Access: Subscribers, Admin, Partner OR Official Event (Open to all registered)
  // For 'isOfficial', we allow guests to SEE content, but booking requires login.
  const hasAccess = isSubscriber || isAdmin || isPartner || (user?.email === 'rhodia@nowme.fr') || isOfficial;

  const isPending = user && !isSubscriber && !isAdmin && !isPartner && !isOfficial; // Rough check, likely unused or for UI hints
  // Check for existing booking
  useEffect(() => {
    const checkExistingBooking = async () => {
      if (!user || !offer) return;

      // Only check for existing bookings if the user is a subscriber/privileged.
      // Guests (paying full price) should be allowed to book multiple times.
      const shouldCheck = (isSubscriber || isAdmin || isPartner) && (offer.requires_agenda || offer.booking_type === 'event');
      if (!shouldCheck) return;

      const { data } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_id', user.id)
        .eq('offer_id', offer.id)
        .neq('status', 'cancelled')
        .maybeSingle();

      if (data) {
        setIsAlreadyBooked(true);
      }
    };

    checkExistingBooking();
  }, [user, offer]);

  // State for selected variant
  const [selectedVariant, setSelectedVariant] = useState<any>(null);



  // State for Installment Plan
  const [installmentPlan, setInstallmentPlan] = useState<string>('1x');

  // State for Quantity
  const [quantity, setQuantity] = useState<number>(1);

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





  useEffect(() => {
    const fetchOffer = async () => {
      if (!slug) return;

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

      let query = supabase.from('offers').select(`
        id,
        slug,
        title,
        description,
        street_address,
        is_online,
        zip_code,
        city,
        cancellation_policy,
        coordinates,
        coordinates,
        booking_type,
        requires_agenda,
        external_link,
        promo_code,
        event_start_date,
        event_end_date,
        installment_options,
        image_url,
        is_official,
        category: offer_categories!offers_category_id_fkey(name, slug, parent_slug),
        offer_variants(id, name, description, price, discounted_price, stock),
        offer_media(url, type),
        digital_product_file,

        service_zones,
        promo_conditions,
        duration_type,
        validity_start_date,
        validity_end_date,
        validity_start_date,
        validity_end_date,
        partner:partners(id, business_name, contact_email),
        co_organizers:offer_co_organizers(partner:partners(id, business_name, image_url))
      `);

      if (isUUID) {
        query = query.eq('id', slug);
      } else {
        query = query.eq('slug', slug);
      }

      const { data: rawData, error } = await query.single();
      const data = rawData as any;


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
  }, [slug]);

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

  const isPrivileged = isSubscriber || isAdmin || isPartner;

  const priceInfo = selectedVariant
    ? {
      // Non-subscribers pay full price (price), subscribers pay discounted_price if available
      price: isPrivileged
        ? (selectedVariant.discounted_price || selectedVariant.price)
        : selectedVariant.price,
      // Original price for strikethrough (only for subscribers)
      original_price: (isPrivileged && selectedVariant.discounted_price) ? selectedVariant.price : null,
      variant_id: selectedVariant.id,
      // Store member price significantly for frustration UI
      member_price: selectedVariant.discounted_price || selectedVariant.price,
      has_discount: !!selectedVariant.discounted_price && selectedVariant.discounted_price < selectedVariant.price
    }
    : { price: 0, original_price: null, variant_id: null, member_price: 0, has_discount: false };

  // Total to Pay (Price * Quantity + Travel Fee)
  // Note: Travel Fee is usually per trip, not per person if same location. 
  // But if it's per person? Usually per trip. 
  // Let's assume Travel Fee is ONCE per order for now, OR multiply.
  // Users usually buy tickets for friends -> Travel fee might not apply to "Event" type usually.
  // For "At Home", quantity might mean number of people? 
  // Let's assume Price * Qty. Travel Fee added ONCE.
  const totalToPay = ((priceInfo.price || 0) * quantity) + travelFee;

  const isOutOfStock = selectedVariant && selectedVariant.stock !== null && selectedVariant.stock <= 0;

  // Format date if present
  const formattedDate = offer?.event_start_date ? new Date(offer.event_start_date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  }) : null;

  // Breadcrumbs items
  const breadcrumbItems = [
    { label: 'Tous les kiffs', path: '/tous-les-kiffs' },
  ];

  if (offer?.category) {
    breadcrumbItems.push({
      label: offer.category.name,
      path: `/tous-les-kiffs?category=${offer.category.parent_slug || offer.category.slug}`
    });
  }

  breadcrumbItems.push({ label: offer?.title || 'Offre', path: '#' });

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Offre introuvable</h1>
        <p className="text-gray-600 mb-6">Cette offre n'existe pas ou n'est plus disponible.</p>
        <Link to="/tous-les-kiffs" className="text-primary hover:underline">
          Retour aux kiffs
        </Link>
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
        meeting_location: meetingAddressRef.current?.value || meetingAddress || (offer.street_address ? `${offer.street_address}, ${offer.zip_code} ${offer.city}` : offer.city), // Robust Address Logic
        installment_plan: installmentPlan, // Pass selected plan ('1x', '2x', '3x', '4x')
        fulfillment_status: 'fulfilled', // or 'pending' if manual approval needed
        quantity: quantity // Pass quantity
      };

      // Use fetch instead of invoke to get better error details
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          ...payload,
          success_url: `${window.location.origin}/reservation-confirmee`,
          cancel_url: window.location.href,
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || "Erreur inconnue du serveur");
      }

      const { sessionId } = responseData;

      if (!sessionId) throw new Error("No session ID returned");

      const stripe = await stripePromise;
      const { error: stripeError } = await stripe!.redirectToCheckout({
        sessionId: sessionId
      });

      if (stripeError) throw stripeError;

    } catch (err: any) {
      console.error("Payment Error:", err);
      toast.error("Erreur: " + (err.message || "Unknown error"));
      setBookingLoading(false);
    }
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
    // Guest Handling for Official Events
    if (isGuest) {
      if (offer.is_official) {
        // Redirect to Login with redirect back
        navigate(`/connexion?redirectTo=${encodeURIComponent(location.pathname)}`);
        return;
      }
    }

    // Guest Handling: Enforce login for official events BEFORE any other logic
    if (isGuest && isOfficial) {
      setShowGuestModal(true);
      return;
    }

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

    // New Simplified Flow: Direct Checkout for everyone (Calendly or Event)
    // We treat 'calendly' type now as just "Contact Partner".
    // We pass undefined date if it's not a fixed date event.

    if (price > 0) {
      handleStripeCheckout(type as 'calendly' | 'event', type === 'event' ? offer.event_start_date : undefined);
    } else {
      // Free Offer / Event
      if (type === 'event') {
        setShowEventConfirmModal(true);
      } else {
        // Free non-event (likely Contact Partner type)
        // Confirm directly or show modal? Direct is fine for free contact/access.
        bookEvent();
      }
    }
  };

  const getButtonLabel = () => {
    // Guest Handling
    if (isGuest && isOfficial) return "Se connecter pour réserver";
    if (isGuest) return "Rejoindre le club"; // Should be unreachable if blurred, but safe fallback

    if (isAlreadyBooked) return "Vous êtes déjà inscrit";
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
      {/* Structured Data (JSON-LD) */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": offer?.booking_type === 'event' || offer?.booking_type === 'calendly' ? "Event" : "Product",
          "name": offer?.title,
          "description": seoDescription,
          "image": [offer?.image_url, ...(images || [])],
          ...(offer?.booking_type === 'event' || offer?.booking_type === 'calendly' ? {
            "startDate": offer?.event_start_date ? new Date(offer.event_start_date).toISOString() : undefined,
            "endDate": offer?.event_end_date ? new Date(offer.event_end_date).toISOString() : undefined,
            "eventStatus": "https://schema.org/EventScheduled",
            "eventAttendanceMode": offer?.is_online ? "https://schema.org/OnlineEventAttendanceMode" : "https://schema.org/OfflineEventAttendanceMode",
            "location": offer?.is_online ? {
              "@type": "VirtualLocation",
              "url": offer?.external_link || window.location.href
            } : {
              "@type": "Place",
              "name": offer?.partner?.business_name || offer?.city || "Lieu secret",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": offer?.street_address,
                "addressLocality": offer?.city,
                "postalCode": offer?.zip_code,
                "addressCountry": "FR"
              }
            },
            "organizer": {
              "@type": "Organization",
              "name": offer?.partner?.business_name || "Nowme",
              "url": "https://nowme.fr"
            },
            "offers": {
              "@type": "Offer",
              "price": priceInfo.price,
              "priceCurrency": "EUR",
              "url": window.location.href,
              "availability": isOutOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
              "validFrom": offer?.created_at
            }
          } : {
            "brand": {
              "@type": "Brand",
              "name": offer?.partner?.business_name || "Nowme"
            },
            "offers": {
              "@type": "Offer",
              "price": priceInfo.price,
              "priceCurrency": "EUR",
              "url": window.location.href,
              "availability": isOutOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock"
            }
          })
        })}
      </script>

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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 relative">
              <div className="relative h-96 lg:h-auto lg:min-h-[500px] lg:max-h-[85vh] lg:sticky lg:top-24 overflow-hidden bg-gray-900 group">
                {images.length > 0 ? (
                  <>
                    <img
                      src={images[currentImageIndex]}
                      alt={offer.title}
                      fetchPriority="high"
                      decoding="async"
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
                    <div className="mb-6 flex flex-wrap items-center gap-4">
                      <Link
                        to={`/partenaire/${offer.partner.id}`}
                        className="inline-flex items-center gap-2 text-gray-600 hover:text-primary transition-colors group"
                      >
                        <Building className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="font-semibold text-lg border-b border-transparent group-hover:border-primary">
                          {offer.partner.business_name}
                        </span>
                      </Link>

                      {offer.co_organizers && offer.co_organizers.length > 0 && (
                        <>
                          <span className="text-gray-400">&</span>
                          {offer.co_organizers.map((item: any) => (
                            <Link
                              key={item.partner.id}
                              to={`/partenaire/${item.partner.id}`}
                              className="inline-flex items-center gap-2 text-gray-600 hover:text-primary transition-colors group"
                            >
                              {item.partner.image_url && (
                                <img src={item.partner.image_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                              )}
                              <span className="font-semibold text-lg border-b border-transparent group-hover:border-primary">
                                {item.partner.business_name}
                              </span>
                            </Link>
                          ))}
                        </>
                      )}
                    </div>
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
                        {offer.booking_type === 'purchase' || offer.booking_type === 'simple_access'
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

                      {/* --- Quantity Selector (For Official Events or All?) --- */}
                      {/* Allow quantity for everyone if it's an event or purchase, except calendly maybe? */}
                      {/* Usually Calendar is 1 person. But maybe 4 friends? */}
                      {/* Let's allow for 'event' type mostly. */}
                      {(offer.booking_type === 'event' || offer.booking_type === 'purchase') && !isSubscriber && (
                        <div className="mb-6 border-b border-gray-100 pb-6 w-full">
                          <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                            <span className="font-bold text-gray-700">Nombre de places</span>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                                disabled={quantity <= 1}
                              >
                                -
                              </button>
                              <span className="font-bold text-lg w-6 text-center">{quantity}</span>
                              <button
                                onClick={() => setQuantity(Math.min(10, quantity + 1))}
                                className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                                disabled={quantity >= 10}
                              >
                                +
                              </button>
                            </div>
                          </div>
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

                          {/* FRUSTRATION UI: Show for non-subscribers if a discount exists */}
                          {!isPrivileged && priceInfo.has_discount && (
                            <div className="mt-1 mb-2 flex flex-col items-end animate-pulse">
                              <span className="text-sm text-pink-600 font-bold">
                                Prix membre : {priceInfo.member_price}€
                              </span>
                              <span className="text-xs text-gray-500">
                                Tu économiserais {(priceInfo.price - priceInfo.member_price).toFixed(2)}€ en étant membre !
                              </span>
                            </div>
                          )}
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


                    <button
                      onClick={handleBooking}
                      disabled={bookingLoading || isOutOfStock || !hasAccess || isAlreadyBooked}
                      className={`w-full px-6 py-4 text-white rounded-xl font-bold text-lg shadow-lg transition-all duration-300 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isOutOfStock ? 'bg-gray-400' : 'bg-primary hover:bg-primary-dark'
                        }`}
                    >
                      {bookingLoading ? (
                        <>
                          <Clock className="w-5 h-5 animate-spin" />
                          Traitement...
                        </>
                      ) : (
                        offer.booking_type === 'calendly' && priceInfo.price > 0
                          ? 'Payer et Réserver'
                          : getButtonLabel()
                      )}
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



                </div>
              </div>
            </div >
          </div >
        </div >
      </div >

      <GuestBookingModal
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        offerTitle={offer?.title || ''}
        onSuccess={async () => {
          // 7. Refresh Auth Context (Fast update)
          await refreshProfile();

          // 8. Close modal
          setShowGuestModal(false);

          // 9. Toast expectation
          toast.success("Compte créé ! Vous êtes connecté.", { icon: '👋' });
        }}
      />
    </div>
  );
}
