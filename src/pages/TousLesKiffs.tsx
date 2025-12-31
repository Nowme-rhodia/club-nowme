import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, MapPin, Filter, X, SlidersHorizontal, Star, Sparkles } from 'lucide-react';
import { PriceRangeSlider } from '../components/PriceRangeSlider';
import { Link } from 'react-router-dom';
import { categories } from '../data/categories';
import { supabase } from '../lib/supabase';
import { OfferCard } from '../components/OfferCard';
import { LocationSearch } from '../components/LocationSearch';
import { SEO } from '../components/SEO';
import { motion, AnimatePresence } from 'framer-motion';

// Cette fonction calcule la distance entre deux points en km
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface OfferDetails {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  promoPrice?: number;
  rating: number;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  category: string;
  categorySlug: string;
  subcategorySlug?: string;
  reviews: any[];
  partnerName?: string;
  filterPrice?: number;
}

export default function TousLesKiffs() {
  const [selectedOffer, setSelectedOffer] = useState<OfferDetails | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const itemsPerPage = 12;

  const categoriesRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useRef<HTMLDivElement | null>(null);

  const [offersWithLocations, setOffersWithLocations] = useState<OfferDetails[]>([]);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const { data, error } = await supabase
          .from('offers')
          .select(`
            *,
            category:offer_categories!offers_category_id_fkey(*),
            offer_variants(price, discounted_price),
            partner:partners(business_name, address)
          `)
          .eq('status', 'approved')
          .order('created_at', { ascending: false }); // Tri par défaut : les plus récents d'abord

        if (error) {
          console.error('Error fetching offers:', error);
          return;
        }

        if (data) {
          const formattedOffers: OfferDetails[] = data.map((offer: any) => {
            const firstVariant = offer.offer_variants?.[0];
            const allPrices = offer.offer_variants?.map((v: any) =>
              v.discounted_price ? Number(v.discounted_price) : Number(v.price)
            ) || [];
            const minFilterPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;

            const displayPrice = firstVariant ? Number(firstVariant.price) : 0;
            const displayPromo = firstVariant && firstVariant.discounted_price ? Number(firstVariant.discounted_price) : undefined;

            // Parser coordinates "(lat,lng)"
            let lat = 0, lng = 0;
            if (typeof offer.coordinates === 'string') {
              const matches = offer.coordinates.match(/\((.*),(.*)\)/);
              if (matches) {
                lat = parseFloat(matches[1]);
                lng = parseFloat(matches[2]);
              }
            } else if (Array.isArray(offer.coordinates)) {
              lat = offer.coordinates[0];
              lng = offer.coordinates[1];
            }

            return {
              id: offer.id,
              title: offer.title,
              description: offer.description,
              imageUrl: offer.image_url || offer.offer_media?.[0]?.url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
              price: displayPrice,
              promoPrice: displayPromo,
              filterPrice: minFilterPrice,
              partnerName: offer.partner?.business_name,
              rating: 4.5,
              location: {
                lat,
                lng,
                address: [offer.street_address, offer.zip_code, offer.city].filter(Boolean).join(', ') || offer.partner?.address || 'Adresse non spécifiée'
              },
              category: offer.category?.name || 'Autre',
              categorySlug: offer.category?.parent_slug || offer.category?.slug || 'autre',
              subcategorySlug: offer.category?.parent_slug ? offer.category.slug : undefined,
              reviews: []
            };
          });
          setOffersWithLocations(formattedOffers);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOffers();
  }, []);

  const filteredOffers = useMemo(() => {
    let filtered = offersWithLocations;

    if (searchTerm.trim()) {
      const normalizedSearch = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(offer =>
        offer.title.toLowerCase().includes(normalizedSearch) ||
        offer.description.toLowerCase().includes(normalizedSearch) ||
        offer.partnerName?.toLowerCase().includes(normalizedSearch)
      );
    }

    if (activeCategory !== 'all') {
      filtered = filtered.filter(offer => offer.categorySlug === activeCategory);
      if (activeSubcategory) {
        filtered = filtered.filter(offer => offer.subcategorySlug === activeSubcategory);
      }
    }

    if (selectedLocation) {
      filtered = filtered.filter(offer => {
        const distance = getDistance(
          selectedLocation.lat,
          selectedLocation.lng,
          offer.location.lat,
          offer.location.lng
        );
        return distance <= 15;
      });
    }

    filtered = filtered.filter(offer => {
      const priceToCheck = offer.filterPrice !== undefined ? offer.filterPrice : offer.price;
      return priceToCheck >= priceRange[0] &&
        priceToCheck <= priceRange[1] &&
        offer.rating >= ratingFilter;
    });

    return filtered;
  }, [searchTerm, activeCategory, activeSubcategory, selectedLocation, priceRange, ratingFilter, offersWithLocations]);

  const paginatedOffers = useMemo(() => {
    return filteredOffers.slice(0, page * itemsPerPage);
  }, [filteredOffers, page]);

  useEffect(() => {
    // Observer setup uses isLoading which is now managed by fetch
  }, []);

  useEffect(() => {
    if (isLoading) return;

    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && paginatedOffers.length < filteredOffers.length) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.5 }
    );

    if (lastElementRef.current) {
      observer.current.observe(lastElementRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [isLoading, paginatedOffers.length, filteredOffers.length]);

  const handleLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    setSelectedLocation(location);
  };

  const handleOfferClick = (offer: OfferDetails) => {
    setSelectedOffer(offer);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F4] via-white to-[#FDF8F4]">
      <SEO
        title="Tous les kiffs"
        description="Découvrez toutes nos expériences uniques en Île-de-France : bien-être, loisirs, culture et plus encore."
      />

      {/* Header animé */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="pt-8 pb-6 px-4 sm:px-6 lg:px-8 text-center"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Tous les kiffs
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Découvre des expériences uniques, sélectionnées avec soin pour toi.
          Des moments de bien-être, de découverte et de partage t'attendent.
        </p>
      </motion.div>

      {/* Barre de recherche et filtres */}
      <div className="sticky top-20 z-30 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex gap-4">
              <div className="relative flex-1">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Rechercher une activité..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pl-10 pr-10 rounded-full border-2 border-gray-200 focus:border-primary focus:ring focus:ring-primary/20 focus:ring-opacity-50"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
              <LocationSearch onSelect={handleLocationSelect} />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <SlidersHorizontal className="w-5 h-5 mr-2" />
              Filtres
            </button>
          </div>

          {/* Filtres étendus */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-4">
                  {/* Filtres de prix */}
                  <div>
                    <PriceRangeSlider
                      min={0}
                      max={1000}
                      value={priceRange}
                      onChange={setPriceRange}
                    />
                  </div>

                  {/* Filtre par note */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Note minimum
                    </label>
                    <div className="flex items-center gap-2">
                      {[0, 1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          onClick={() => setRatingFilter(rating)}
                          className={`flex items-center gap-1 px-3 py-1 rounded-full ${ratingFilter === rating
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            } transition-colors`}
                        >
                          <Star className="w-4 h-4" />
                          <span>{rating}+</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Grille des offres */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-white rounded-2xl overflow-hidden shadow-sm"
              >
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="p-4 space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredOffers.length > 0 ? (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
          >
            {paginatedOffers.map((offer, index) => (
              <motion.div
                key={offer.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                whileHover={{ y: -8 }}
                transition={{ duration: 0.3 }}
                onClick={() => handleOfferClick(offer)}
              >
                <OfferCard {...offer} />
              </motion.div>
            ))}
            {paginatedOffers.length < filteredOffers.length && (
              <div ref={lastElementRef} className="col-span-full flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="text-center py-20">
            <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Aucun kiffe trouvé
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Aucun kiffe dans cette tranche de prix, élargissez votre recherche !
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setPriceRange([0, 1000]);
                setRatingFilter(0);
                setActiveCategory('all');
                setActiveSubcategory(null);
                setSelectedLocation(null);
              }}
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary bg-primary/10 hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      {/* Modal de détails */}
      <AnimatePresence>
        {selectedOffer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedOffer(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={selectedOffer.imageUrl}
                  alt={selectedOffer.title}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedOffer(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedOffer.title}
                </h2>
                <p className="text-gray-600 mb-4">
                  {selectedOffer.description}
                </p>
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${i < selectedOffer.rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                          }`}
                      />
                    ))}
                  </div>
                  <span className="text-gray-600">
                    {selectedOffer.rating.toFixed(1)} / 5
                  </span>
                </div>
                <div className="space-y-4 mb-6">
                  <h3 className="font-semibold text-gray-900">Avis récents</h3>
                  {selectedOffer.reviews.map((review, index) => (
                    <div key={index} className="border-b border-gray-100 pb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${i < review.rating
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                                }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-500">
                          par {review.author}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm">
                        {review.comment}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-500">À partir de</span>
                    <div className="flex items-baseline gap-2">
                      {selectedOffer.promoPrice ? (
                        <>
                          <span className="text-2xl font-bold text-primary">
                            {selectedOffer.promoPrice}€
                          </span>
                          <span className="text-lg text-gray-400 line-through">
                            {selectedOffer.price}€
                          </span>
                        </>
                      ) : (
                        <span className="text-2xl font-bold text-gray-900">
                          {selectedOffer.price}€
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    to={`/offres/${selectedOffer.id}`}
                    className="inline-flex items-center px-6 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary-dark transition-colors"
                  >
                    Réserver
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}