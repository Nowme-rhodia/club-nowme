import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Share2, ArrowLeft, Star, Navigation } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MapComponent } from '../components/MapComponent';
import { categories } from '../data/categories';
import { getCategoryGradient } from '../utils/categoryColors';
import { getCategoryBackground } from '../utils/categoryBackgrounds';

export default function OfferPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const coordinates = offer.coordinates ? {
    lat: offer.coordinates[0],
    lng: offer.coordinates[1]
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

  const handleBooking = () => {
    navigate(`/booking/${offer.id}`);
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
                {offer.offer_media?.[0] && (
                  <img
                    src={offer.offer_media[0].url}
                    alt={offer.title}
                    className="w-full h-full object-cover"
                  />
                )}
                {!offer.offer_media?.[0] && (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                    Pas d'image
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Badge de réduction */}
                {priceInfo.promo_price && (
                  <div className="absolute top-4 right-4 px-3 py-1.5 bg-primary text-white rounded-full font-semibold text-sm shadow-lg">
                    -{discount}%
                  </div>
                )}
              </div>

              {/* Informations principales */}
              <div className="p-6 lg:p-8 flex flex-col h-full">
                <div className="flex-grow">
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">{offer.title}</h1>

                  <div className="flex items-center gap-6 mb-6">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600">{offer.location || "Lieu non précisé"}</span>
                    </div>
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
                        {priceInfo.promo_price ? (
                          <>
                            <span className="text-3xl font-bold text-primary">
                              {priceInfo.promo_price}€
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
                    className="w-full px-6 py-3 bg-primary text-white rounded-full font-medium transition-all duration-300 hover:bg-primary-dark hover:shadow-lg active:scale-95"
                  >
                    Réserver
                  </button>
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
