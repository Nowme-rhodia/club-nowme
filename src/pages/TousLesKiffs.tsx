import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, MapPin, Filter, X, SlidersHorizontal, Star, Sparkles, LayoutGrid, Music, Brain, Palette, ShoppingBag, Package, Home, Activity, Globe, Smile as Spa, Utensils } from 'lucide-react';
import { PriceRangeSlider } from '../components/PriceRangeSlider';
import { Link, useSearchParams } from 'react-router-dom';
import { categories } from '../data/categories';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { OfferCard } from '../components/OfferCard';
import { LocationSearch } from '../components/LocationSearch';
import { SEO } from '../components/SEO';
import { Breadcrumbs } from '../components/Breadcrumbs';
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
  slug?: string;
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
  is_online?: boolean;
  service_zones?: { code: string; fee: number }[];
  promoConditions?: string;
  bookingType?: string;
  is_event?: boolean;
  event_end_date?: string;
  date?: string;
  isOfficial?: boolean;
}

export default function TousLesKiffs() {
  const [searchParams] = useSearchParams();
  const { user, isAdmin, isSubscriber, isPartner } = useAuth();
  // Filters State
  const [sortOption, setSortOption] = useState<'price_asc' | 'price_desc' | 'date_asc' | 'newest'>('newest');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'weekend'>('all');
  const [isOfficialFilter, setIsOfficialFilter] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  const [selectedOffer, setSelectedOffer] = useState<OfferDetails | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 3000]);
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || 'all');
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(searchParams.get('subcategory') || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
    zip_code?: string;
  } | null>(null);
  const [isOnlineFilter, setIsOnlineFilter] = useState(false);
  const [isWalletFilter, setIsWalletFilter] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 12;

  const categoriesRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useRef<HTMLDivElement | null>(null);

  const [offersWithLocations, setOffersWithLocations] = useState<OfferDetails[]>([]);

  // List of departments found in available offers
  const availableDepartments = useMemo(() => {
    const depts = new Set<string>();
    offersWithLocations.forEach(offer => {
      const postcode = offer.location.address.match(/\b(97|2A|2B|[0-9]{2})[0-9]{3}\b/)?.[1];
      if (postcode) depts.add(postcode);
    });
    return Array.from(depts).sort();
  }, [offersWithLocations]);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchOffers = async () => {
      try {
        const { data, error } = await supabase
          .from('offers')
          .select(`
            id,
            slug,
            title,
            description,
            image_url,
            promo_conditions,
            booking_type,
            status,
            created_at,
            coordinates,
            street_address,
            zip_code,
            city,
            is_online,
            service_zones,
            event_start_date,
            event_end_date,
            offer_media(url),
            category:offer_categories!offers_category_id_fkey(name, slug, parent_slug),
            offer_variants(price, discounted_price),
            partner:partners!offers_partner_id_fkey(business_name, address, contact_email)
          `)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .abortSignal(abortController.signal); // Add abort signal

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

            // Logic to restrict access:
            // - Admin: Full access
            // - Subscriber: Full access
            // - Partner (without subscription) or Guest: Restricted access
            const isRestricted = !isAdmin && !isSubscriber;

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

            const isOfficial = offer.partner?.contact_email === 'rhodia@nowme.fr' || offer.partner?.business_name === 'Nowme';

            return {
              id: offer.id,
              slug: offer.slug,
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
              reviews: [],
              is_online: offer.is_online,
              service_zones: offer.service_zones,
              is_event: offer.booking_type === 'event',
              event_end_date: offer.event_end_date,
              badge: isOfficial ? 'Événement Officiel' : undefined,
              promoConditions: offer.promo_conditions,
              bookingType: offer.booking_type,
              date: offer.event_start_date,
              isOfficial: isOfficial
            };
          });
          setOffersWithLocations(formattedOffers);
        }
      } catch (err: any) {
        // Supabase wraps AbortError in PostgrestError format: {message, details, hint, code}
        // We need to check the message content, not err.name
        const errorMessage = err?.message || err?.details || String(err);
        if (errorMessage.includes('AbortError') || errorMessage.includes('aborted')) {
          console.log('✓ Fetch cancelled intentionally (component unmounted or navigation)');
          return; // Silent exit - this is expected behavior
        }
        console.error('Error fetching offers:', err);
        setError('Impossible de charger les kiffs. Vérifiez votre connexion internet ou réessayez plus tard.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOffers();

    // Cleanup function to cancel fetch if component unmounts
    return () => {
      abortController.abort();
    };
  }, [isAdmin, isSubscriber]); // Add dependencies to re-fetch when auth state changes

  const filteredOffers = useMemo(() => {
    let filtered = offersWithLocations;

    // 1. Text Search
    if (searchTerm.trim()) {
      const normalizedSearch = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(offer =>
        offer.title.toLowerCase().includes(normalizedSearch) ||
        offer.description.toLowerCase().includes(normalizedSearch) ||
        offer.partnerName?.toLowerCase().includes(normalizedSearch)
      );
    }

    // 2. Official Filter
    if (isOfficialFilter) {
      filtered = filtered.filter(offer => offer.isOfficial);
    }

    // 3. Online Filter
    if (isOnlineFilter) {
      filtered = filtered.filter(offer => offer.is_online === true);
    }

    // 4. Wallet Pack Filter
    if (isWalletFilter) {
      filtered = filtered.filter(offer => offer.bookingType === 'wallet_pack');
    }

    // 5. Category Filter
    if (activeCategory !== 'all') {
      filtered = filtered.filter(offer => offer.categorySlug === activeCategory);
      if (activeSubcategory) {
        filtered = filtered.filter(offer => offer.subcategorySlug === activeSubcategory);
      }
    }

    // 6. Department Filter
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(offer => {
        // Les offres en ligne ou sans adresse doivent apparaître dans tous les départements
        if (offer.is_online || offer.location.address === 'Adresse non spécifiée') {
          return true;
        }

        const postcode = offer.location.address.match(/\b(97|2A|2B|[0-9]{2})[0-9]{3}\b/)?.[1];
        return postcode === selectedDepartment;
      });
    }

    // 7. Date Filter
    if (dateFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const nextDay = new Date(tomorrow);
      nextDay.setDate(nextDay.getDate() + 1);

      filtered = filtered.filter(offer => {
        if (!offer.date) return false;
        const eventDate = new Date(offer.date);
        eventDate.setHours(0, 0, 0, 0);

        if (dateFilter === 'today') {
          return eventDate.getTime() === today.getTime();
        } else if (dateFilter === 'tomorrow') {
          return eventDate.getTime() === tomorrow.getTime();
        } else if (dateFilter === 'weekend') {
          // Simple logic: Is it this upcoming weekend?
          // Or just simply "is it a Saturday or Sunday"?
          // Let's do: Next Friday to Sunday window.
          const day = today.getDay();
          const distanceToFriday = (5 - day + 7) % 7;
          const nextFriday = new Date(today);
          nextFriday.setDate(today.getDate() + distanceToFriday);
          const nextSunday = new Date(nextFriday);
          nextSunday.setDate(nextSunday.getDate() + 2);

          return eventDate >= nextFriday && eventDate <= nextSunday;
        }
        return true;
      });
    }

    // 8. Location Filter
    if (selectedLocation) {
      filtered = filtered.filter(offer => {
        if (offer.service_zones && Array.isArray(offer.service_zones) && offer.service_zones.length > 0) {
          const userZip = selectedLocation.zip_code;
          if (!userZip) return false;
          const userDept = userZip.substring(0, 2);
          return offer.service_zones.some(z => z.code === userDept);
        }
        if (offer.location.lat !== 0 && offer.location.lng !== 0) {
          const distance = getDistance(
            selectedLocation.lat,
            selectedLocation.lng,
            offer.location.lat,
            offer.location.lng
          );
          return distance <= 15;
        }
        return offer.is_online;
      });
    }

    // 9. Price Range
    filtered = filtered.filter(offer => {
      const priceToCheck = offer.filterPrice !== undefined ? offer.filterPrice : offer.price;
      return priceToCheck >= priceRange[0] &&
        priceToCheck <= priceRange[1];
    });

    // 10. Filter out expired offers if they have an event date
    // Note: Backend archiving job should handle this, but visual filter is immediate
    filtered = filtered.filter(offer => {
      if (offer.is_event && offer.event_end_date) {
        const eventDate = new Date(offer.event_end_date);
        if (eventDate < new Date()) return false;
      }
      return true;
    });

    // 11. Sorting
    filtered.sort((a, b) => {
      if (sortOption === 'price_asc') {
        const typeA = (a.filterPrice !== undefined ? a.filterPrice : a.price);
        const typeB = (b.filterPrice !== undefined ? b.filterPrice : b.price);
        return typeA - typeB;
      }
      if (sortOption === 'price_desc') {
        const typeA = (a.filterPrice !== undefined ? a.filterPrice : a.price);
        const typeB = (b.filterPrice !== undefined ? b.filterPrice : b.price);
        return typeB - typeA;
      }
      if (sortOption === 'date_asc') {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      // newest (default) - implicitly handled by fetch order but safe to re-enforce if IDs or created_at were available properly typed in offers object?
      // actually created_at is not stored in OfferDetails. We rely on initial fetch order.
      // But map destroys order? No map preserves order.
      // Let's assume initial fetch is 'newest' and only re-sort if other options selected.
      return 0;
    });

    return filtered;
  }, [searchTerm, activeCategory, activeSubcategory, selectedLocation, priceRange, offersWithLocations, isOnlineFilter, isWalletFilter, sortOption, dateFilter, isOfficialFilter, selectedDepartment]);

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

  const handleLocationSelect = (location: { lat: number; lng: number; address: string; zip_code?: string }) => {
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
        <div className="flex justify-center mb-4">
          <Breadcrumbs items={[{ label: 'Tous les kiffs' }]} />
        </div>
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

                  {/* Row 1: Sort & Department */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Sort */}
                    <div>
                      <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value as any)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 bg-gray-50 hover:bg-white transition-colors"
                      >
                        <option value="newest">Trier par : Nouveautés</option>
                        <option value="price_asc">Prix croissant</option>
                        <option value="price_desc">Prix décroissant</option>
                        <option value="date_asc">Date (Bientôt)</option>
                      </select>
                    </div>

                    {/* Department */}
                    <div>
                      <select
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 bg-gray-50 hover:bg-white transition-colors"
                      >
                        <option value="all">Tous les départements</option>
                        {availableDepartments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    {/* Date Filter */}
                    <div>
                      <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value as any)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 bg-gray-50 hover:bg-white transition-colors"
                      >
                        <option value="all">Toutes les dates</option>
                        <option value="today">Aujourd'hui</option>
                        <option value="tomorrow">Demain</option>
                        <option value="weekend">Ce Week-end</option>
                      </select>
                    </div>
                  </div>

                  {/* Rubrique Catégories */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-4">Catégories</h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                      <button
                        onClick={() => setActiveCategory('all')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border whitespace-nowrap transition-all ${activeCategory === 'all'
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:text-primary'
                          }`}
                      >
                        <LayoutGrid className="w-4 h-4" />
                        <span className="font-medium">Tout voir</span>
                      </button>

                      {categories.map((category) => {
                        // Dynamic icon mapping
                        const IconComponent = {
                          'Spa': Spa, // Already imported? need to check imports or use strings/generic
                          'Music': Music,
                          'Brain': Brain,
                          'Palette': Palette,
                          'ShoppingBag': ShoppingBag,
                          'Package': Package,
                          'Home': Home,
                          'Sparkles': Sparkles,
                          'Activity': Activity,
                          'Globe': Globe,
                          'Utensils': Utensils
                        }[category.icon || 'Sparkles'] || Sparkles;

                        return (
                          <button
                            key={category.slug}
                            onClick={() => setActiveCategory(activeCategory === category.slug ? 'all' : category.slug)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full border whitespace-nowrap transition-all ${activeCategory === category.slug
                              ? 'bg-primary text-white border-primary shadow-sm'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:text-primary'
                              }`}
                          >
                            <IconComponent className="w-4 h-4" />
                            <span className="font-medium">{category.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Row 2: Price & Official */}
                  <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center">
                    <div className="flex-1 w-full sm:w-auto">
                      <h3 className="text-sm font-medium text-gray-700 mb-4">Budget</h3>
                      <PriceRangeSlider
                        min={0}
                        max={3000}
                        value={priceRange}
                        onChange={setPriceRange}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsOfficialFilter(!isOfficialFilter)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${isOfficialFilter
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-purple-600 hover:text-purple-600'
                          }`}
                      >
                        <Sparkles className="w-4 h-4" />
                        <span className="font-medium">Événements Officiels</span>
                      </button>
                    </div>
                  </div>

                  {/* Row 3: Special Filters */}
                  <div className="flex flex-wrap items-center pt-2 gap-3 border-t border-gray-100 mt-4">
                    <button
                      onClick={() => setIsOnlineFilter(!isOnlineFilter)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${isOnlineFilter
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:text-primary'
                        }`}
                    >
                      <span className="text-xl">🛋️</span>
                      <span className="font-medium">Flemme de bouger de chez moi</span>
                    </button>

                    <button
                      onClick={() => setIsWalletFilter(!isWalletFilter)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${isWalletFilter
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-600 hover:text-blue-600'
                        }`}
                    >
                      <span className="text-xl">💳</span>
                      <span className="font-medium">Pack Ardoise</span>
                    </button>

                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setPriceRange([0, 3000]);
                        setSortOption('newest');
                        setDateFilter('all');
                        setIsOfficialFilter(false);
                        setSelectedDepartment('all');
                        setActiveCategory('all');
                        setActiveSubcategory(null);
                        setSelectedLocation(null);
                        setIsOnlineFilter(false);
                        setIsWalletFilter(false); // Added reset for wallet filter
                      }}
                      className="ml-auto text-sm text-gray-500 hover:text-primary underline"
                    >
                      Réinitialiser
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* Grille des offres */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Oups ! Une erreur est survenue</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Réessayer
            </button>
          </div>
        )}

        {isLoading && !error && (
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
        )}

        {!isLoading && filteredOffers.length > 0 && (
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
            {paginatedOffers.map((offer) => (
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
        )}

        {!isLoading && filteredOffers.length === 0 && (
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
                setPriceRange([0, 3000]);
                setSortOption('newest');
                setDateFilter('all');
                setIsOfficialFilter(false);
                setSelectedDepartment('all');
                setActiveCategory('all');
                setActiveSubcategory(null);
                setSelectedLocation(null);
                setIsOnlineFilter(false);
                setIsWalletFilter(false);
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
                  decoding="async"
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