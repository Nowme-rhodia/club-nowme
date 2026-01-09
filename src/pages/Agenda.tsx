import React, { useEffect, useState } from 'react';
import { Sparkles, Calendar, Users, MapPin, Tag } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';
import { OfferCard } from '../components/OfferCard';
import { MicroSquadList } from '../components/community/MicroSquadList';

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
    department: string;
    category: string;
    promoConditions?: string;
    bookingType?: string;
    date?: string;
}

export default function Agenda() {
    const { profile, isAdmin } = useAuth();
    const [officialEvents, setOfficialEvents] = useState<OfferDetails[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchOfficialEvents = async () => {
            try {
                // 1. Get partner ID for rhodia@nowme.fr
                const { data: partnerData } = await supabase
                    .from('partners')
                    .select('id')
                    .eq('contact_email', 'rhodia@nowme.fr')
                    .single<any>();

                if (!partnerData) {
                    setIsLoading(false);
                    return;
                }

                // 2. Fetch ALL OFFERS for this partner (events AND perks) to match legacy view
                const { data, error } = await supabase
                    .from('offers')
                    .select(`
            *,
            offer_variants(price, discounted_price),
            partner:partners(business_name, address),
            offer_media(url),
            category:offer_categories(name)
          `)
                    .eq('partner_id', partnerData.id)
                    .eq('status', 'approved')
                    // Removed strict booking_type='event' check to show all official content
                    // Removed strict date check to allow permanent offers
                    .order('created_at', { ascending: false });

                if (error) throw error;

                if (data) {
                    const uniqueDepts = new Set<string>();
                    const uniqueCats = new Set<string>();

                    const formattedEvents: OfferDetails[] = data.map((offer: any) => {
                        const firstVariant = offer.offer_variants?.[0];
                        const displayPrice = firstVariant ? Number(firstVariant.price) : 0;
                        const displayPromo = firstVariant && firstVariant.discounted_price ? Number(firstVariant.discounted_price) : undefined;

                        // Extract Department from Zip Code or Address
                        let dept = 'Unknown';
                        // Try strict zip_code field first
                        if (offer.zip_code && offer.zip_code.length >= 2) {
                            dept = offer.zip_code.substring(0, 2);
                        }
                        // Fallback: Regex on address/city
                        else {
                            const fullAddr = [offer.street_address, offer.city].join(' ');
                            const match = fullAddr.match(/\b(97|2A|2B|[0-9]{2})[0-9]{3}\b/);
                            if (match) {
                                dept = match[1];
                            }
                        }

                        if (dept !== 'Unknown') {
                            uniqueDepts.add(dept);
                        }

                        // Category extraction
                        const catName = offer.category?.name || 'Événement Club';
                        uniqueCats.add(catName);

                        return {
                            id: offer.id,
                            title: offer.title,
                            description: offer.description,
                            imageUrl: offer.image_url || offer.offer_media?.[0]?.url || 'https://images.unsplash.com/photo-1543269865-cbf427effbad',
                            price: displayPrice,
                            promoPrice: displayPromo,
                            rating: 5.0,
                            location: {
                                lat: 0,
                                lng: 0,
                                address: [offer.street_address, offer.zip_code, offer.city].filter(Boolean).join(', ') || 'Lieu à définir'
                            },
                            department: dept,
                            category: catName,
                            promoConditions: offer.promo_conditions,
                            bookingType: offer.booking_type,
                            date: offer.event_start_date
                        };
                    });

                    // Filter out past events (keep today and future, and keep non-dated perks)
                    // Use yesterday to be safe and include today's events
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);

                    const upcomingEvents = formattedEvents.filter(e => {
                        if (!e.date) return true; // Keep perks/undated
                        return new Date(e.date) > yesterday;
                    });

                    // Sort events: Dated events first (sorted by date asc), then non-dated
                    const sortedEvents = upcomingEvents.sort((a, b) => {
                        if (a.date && b.date) return new Date(a.date).getTime() - new Date(b.date).getTime();
                        if (a.date) return -1; // Dated comes first
                        if (b.date) return 1;
                        return 0;
                    });

                    setOfficialEvents(sortedEvents);
                    setDepartments(Array.from(uniqueDepts).sort());
                    setCategories(Array.from(uniqueCats).sort());
                }
            } catch (err) {
                console.error('Error fetching events:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOfficialEvents();
    }, []);

    const filteredEvents = officialEvents.filter(event => {
        const matchesDept = selectedDepartment === 'all' || event.department === selectedDepartment;
        const matchesCat = selectedCategory === 'all' || event.category === selectedCategory;
        return matchesDept && matchesCat;
    });

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#FDF8F4] via-white to-[#FDF8F4] py-12">
            <SEO
                title="L'Agenda du Club"
                description="Retrouvez tous les événements officiels et les sorties entre membres."
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        L'Agenda du Club 📅
                    </h1>
                    <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                        Masterclasses, Dîners, Sorties entre filles... <br />
                        Tout ce qu'il faut pour vivre l'expérience Nowme à fond !
                    </p>
                </div>

                {/* SECTION 1: ÉVÉNEMENTS OFFICIELS (REVENUE) */}
                <div className="mb-16">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-pink-100 p-2 rounded-full">
                                <Sparkles className="w-6 h-6 text-pink-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">Les Temps Forts (Officiel)</h2>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {/* Department Filter */}
                            {departments.length > 0 && (
                                <div className="inline-flex items-center bg-white rounded-full shadow-sm p-1 border border-gray-200">
                                    <div className="px-4 py-2 flex items-center text-gray-500 font-medium whitespace-nowrap">
                                        <MapPin className="w-4 h-4 mr-2" />
                                        Lieu :
                                    </div>
                                    <select
                                        value={selectedDepartment}
                                        onChange={(e) => setSelectedDepartment(e.target.value)}
                                        className="form-select border-none bg-transparent py-2 pl-2 pr-8 text-primary font-bold focus:ring-0 cursor-pointer min-w-[150px] outline-none"
                                    >
                                        <option value="all">Tous ({officialEvents.length})</option>
                                        {departments.map(dept => (
                                            <option key={dept} value={dept}>
                                                {dept} ({officialEvents.filter(e => e.department === dept).length})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Category Filter */}
                            {categories.length > 0 && (
                                <div className="inline-flex items-center bg-white rounded-full shadow-sm p-1 border border-gray-200">
                                    <div className="px-4 py-2 flex items-center text-gray-500 font-medium whitespace-nowrap">
                                        <Tag className="w-4 h-4 mr-2" />
                                        Thème :
                                    </div>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="form-select border-none bg-transparent py-2 pl-2 pr-8 text-primary font-bold focus:ring-0 cursor-pointer min-w-[150px] outline-none"
                                    >
                                        <option value="all">Tous</option>
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>
                                                {cat} ({officialEvents.filter(e => e.category === cat).length})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="animate-pulse bg-white rounded-2xl h-80"></div>
                            ))}
                        </div>
                    ) : filteredEvents.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
                            {filteredEvents.map((event) => (
                                <OfferCard
                                    key={event.id}
                                    {...event}
                                    badge="Officiel"
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl p-8 text-center border border-gray-100 shadow-sm">
                            <p className="text-gray-500">
                                Aucun événement officiel trouvé avec ces filtres.
                            </p>
                            {(selectedDepartment !== 'all' || selectedCategory !== 'all') && (
                                <button
                                    onClick={() => {
                                        setSelectedDepartment('all');
                                        setSelectedCategory('all');
                                    }}
                                    className="mt-4 text-primary font-medium hover:underline"
                                >
                                    Réinitialiser les filtres
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 my-12"></div>

                {/* SECTION 2: SORTIES ENTRE FILLES (RETENTION) */}
                <div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-orange-100 p-2 rounded-full">
                            <Users className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Les Sorties Entre Filles</h2>
                            <p className="text-sm text-gray-500">Proposées et animées par les membres</p>
                        </div>
                    </div>

                    {(isAdmin || profile?.email === 'nowme.club@gmail.com' || profile?.email === 'rhodia@nowme.fr') ? (
                        <MicroSquadList showFilter={true} />
                    ) : (
                        <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-300 shadow-sm relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-50 to-pink-50 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative z-10 py-8">
                                <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 animate-bounce-slow">
                                    <Sparkles className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2 font-display">
                                    Bientôt disponible ! 🤫
                                </h3>
                                <p className="text-gray-500 max-w-lg mx-auto">
                                    Les sorties entre filles arrivent en Février.<br />
                                    Prépare-toi à créer et rejoindre des moments inoubliables !
                                </p>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
