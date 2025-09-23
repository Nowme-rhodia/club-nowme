// src/pages/OfferPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Share2, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCategoryGradient } from '../utils/categoryColors';
import { getCategoryBackground } from '../utils/categoryBackgrounds';
import { MapComponent } from '../components/MapComponent';

type Price = {
  price: number | null;
  promo_price: number | null;
};

type Media = {
  url: string | null;
};

type Category = {
  name: string | null;
  slug: string | null;
};

type Offer = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  rating: number | null;
  requires_agenda: boolean | null;
  calendly_url: string | null;
  has_stock: boolean | null;
  stock: number | null;
  category_id: string | null;
  offer_prices: Price[] | null;
  offer_media: Media[] | null;
  categories: Category | null;
};

export default function OfferPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);

  // Charger l'offre
  useEffect(() => {
    let isMounted = true;

    const fetchOffer = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('offers')
        .select(`
          id,
          title,
          description,
          location,
          rating,
          requires_agenda,
          calendly_url,
          has_stock,
          stock,
          category_id,
          offer_prices(price, promo_price),
          offer_media(url),
          categories:category_id(name, slug)
        `)
        .eq('id', id)
        .single();

      if (!isMounted) return;

      if (error) {
        console.error('[OfferPage] load error:', error);
        setOffer(null);
      } else {
        setOffer(data as unknown as Offer);
      }
      setLoading(false);
    };

    if (id) fetchOffer();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const gradient = useMemo(() => {
    const slug = offer?.categories?.slug || 'default';
    return getCategoryGradient(slug);
  }, [offer]);

  const backgroundImage = useMemo(() => {
    const slug = offer?.categories?.slug || 'default';
    return getCategoryBackground(slug);
  }, [offer]);

  const mainPrice = offer?.offer_prices?.[0];
  const discount =
    mainPrice?.promo_price && mainPrice?.price
      ? Math.round(((mainPrice.price - mainPrice.promo_price) / mainPrice.price) * 100)
      : 0;

  // ✅ Règle d’activation du bouton
  const isOutOfStock = Boolean(offer?.has_stock) && ((offer?.stock ?? 0) <= 0);

  const handleShare = async () => {
    if (!offer) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: offer.title,
          text: offer.description || '',
          url: window.location.href,
        });
      } catch {
        // noop si l’utilisateur annule
      }
    }
  };

  const handleBooking = () => {
    if (!offer || isOutOfStock) return; // sécurité
    navigate(`/booking/${offer.id}`);
  };

  // Petit centre de Paris “factice” pour le composant carte (si tu n’as pas de coords réelles)
  const coordinates = useMemo(
    () => ({ lat: 48.8566, lng: 2.3522 }),
    []
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700">
        Chargement...
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700">
        Offre introuvable.
      </div>
    );
  }

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
      <div className="fixed top-24 left-4 z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow hover:shadow-md transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Retour</span>
        </Link>
      </div>

      {/* Main content */}
      <div className="relative min-h-screen pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Media / visuel */}
            <div className="relative bg-white/80 backdrop-blur rounded-2xl overflow-hidden shadow">
              <div className="aspect-[16/10] w-full overflow-hidden">
                {/* Image de couverture (si tu en as une) */}
                {offer.offer_media?.[0]?.url ? (
                  <img
                    src={offer.offer_media[0].url!}
                    alt={offer.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    Pas d’image
                  </div>
                )}
              </div>

              {/* Badge de réduction */}
              {discount > 0 && (
                <div className="absolute top-3 left-3 px-2 py-1 rounded-lg text-xs font-semibold bg-white/90 text-rose-600 shadow">
                  -{discount}%
                </div>
              )}

              {/* Badge “Complet” si OOS */}
              {isOutOfStock && (
                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-semibold bg-gray-900/90 text-white shadow">
                  Complet
                </div>
              )}
            </div>

            {/* Détails */}
            <div className="bg-white/80 backdrop-blur rounded-2xl shadow p-6 lg:p-8 flex flex-col">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{offer.title}</h1>

                <div className="mt-3 flex items-center gap-5 text-sm text-gray-600">
                  {offer.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {offer.location}
                    </span>
                  )}
                  {typeof offer.rating === 'number' && (
                    <span className="inline-flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      {offer.rating.toFixed(1)}
                    </span>
                  )}
                </div>

                {offer.description && (
                  <p className="mt-5 text-gray-700 leading-relaxed">
                    {offer.description}
                  </p>
                )}

                {/* Carte (optionnelle) */}
                <div className="mt-6">
                  <h2 className="text-base font-semibold text-gray-900 mb-2">Localisation</h2>
                  <div className="w-full h-40 rounded-xl overflow-hidden">
                    <MapComponent center={coordinates} />
                  </div>
                </div>
              </div>

              {/* Prix + actions */}
              <div className="mt-8 border-t pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Tarif</p>
                    <div className="mt-1 flex items-baseline gap-2">
                      {mainPrice?.promo_price ? (
                        <>
                          <span className="text-3xl font-bold text-rose-600">
                            {mainPrice.promo_price}€
                          </span>
                          {mainPrice?.price && (
                            <span className="text-lg text-gray-400 line-through">
                              {mainPrice.price}€
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-3xl font-bold text-gray-900">
                          {mainPrice?.price ?? '—'}€
                        </span>
                      )}
                    </div>

                    {/* Affichage du stock si concerné */}
                    {offer.has_stock && (
                      <p className="mt-2 text-xs text-gray-500">
                        Stock restant : <span className="font-medium">
                          {Math.max(0, offer.stock ?? 0)}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleShare}
                      className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                    >
                      <span className="sr-only">Partager</span>
                      <Share2 className="w-5 h-5" />
                    </button>

                    {/* ✅ Bouton Réserver désactivé si stock=0 */}
                    <button
                      onClick={handleBooking}
                      disabled={isOutOfStock}
                      className={[
                        'px-5 py-2.5 rounded-lg font-semibold shadow transition',
                        isOutOfStock
                          ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                          : 'bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.99]'
                      ].join(' ')}
                      aria-disabled={isOutOfStock}
                    >
                      {isOutOfStock ? 'Complet' : 'Réserver'}
                    </button>
                  </div>
                </div>

                {/* Info agenda si pertinent */}
                {offer.requires_agenda && (
                  <p className="mt-3 text-xs text-gray-500">
                    Cette offre nécessite une réservation via agenda. Le lien/iframe sera affiché après clic sur “Réserver”.
                  </p>
                )}
              </div>

              {/* Lien de retour aux offres */}
              <div className="mt-6">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour aux offres
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
