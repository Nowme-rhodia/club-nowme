import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    MapPin,
    Globe,
    Instagram,
    ArrowLeft,
    Mail,
    Phone,
    ExternalLink,
    Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { OfferCard } from '../components/OfferCard';
import { SEO } from '../components/SEO';
import { motion } from 'framer-motion';

interface Partner {
    id: string;
    business_name: string;
    description: string;
    address: string;
    website: string;
    instagram: string;
    cover_image_url: string;
    contact_email: string;
    phone: string;
    category?: string;
}

export default function PartnerPublicProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [partner, setPartner] = useState<Partner | null>(null);
    const [offers, setOffers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPartnerProfile = async () => {
            if (!id) return;

            try {
                setLoading(true);
                // 1. Fetch Partner Details
                const { data: partnerData, error: partnerError } = await supabase
                    .from('partners')
                    .select('id, business_name, description, address, website, instagram, cover_image_url, contact_email, phone')
                    .eq('id', id)
                    .single();

                if (partnerError) throw partnerError;
                setPartner(partnerData as any);

                // 2. Fetch Active Offers for this partner
                const { data: offersData, error: offersError } = await supabase
                    .from('offers')
                    .select(`
            *,
            offer_variants(price, discounted_price),
            offer_media(url, type),
            category:offer_categories(name, slug)
          `)
                    .eq('partner_id', id)
                    .eq('status', 'approved')
                    .order('created_at', { ascending: false });

                if (offersError) throw offersError;

                // Format offers for OfferCard
                const formattedOffers = (offersData || []).map((offer: any) => {
                    const firstVariant = offer.offer_variants?.[0];
                    // Logic from TousLesKiffs/OfferPage
                    const displayPrice = firstVariant ? Number(firstVariant.price) : 0;
                    const displayPromo = firstVariant && firstVariant.discounted_price ? Number(firstVariant.discounted_price) : undefined;

                    return {
                        id: offer.id,
                        title: offer.title,
                        description: offer.description,
                        imageUrl: offer.image_url || offer.offer_media?.[0]?.url,
                        price: displayPrice,
                        promoPrice: displayPromo,
                        partnerName: (partnerData as any)?.business_name,
                        rating: 5, // Default for now
                        location: {
                            address: offer.street_address || (partnerData as any)?.address,
                            lat: 0,
                            lng: 0
                        },
                        category: offer.category?.name,
                        categorySlug: offer.category?.slug,
                        is_event: offer.booking_type === 'event',
                        date: offer.event_start_date
                    };
                });

                setOffers(formattedOffers);

            } catch (error) {
                console.error("Error loading profile:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPartnerProfile();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!partner) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Partenaire introuvable</h1>
                <p className="text-gray-600 mb-6">Ce profil n'existe pas ou n'est plus disponible.</p>
                <Link to="/tous-les-kiffs" className="text-primary hover:underline">
                    Retour aux kiffs
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <SEO
                title={`${partner.business_name} - Club Nowme`}
                description={partner.description || `Découvrez les expériences proposées par ${partner.business_name} sur Club Nowme.`}
                image={partner.cover_image_url}
            />

            {/* Hero / Cover Image */}
            <div className="relative h-64 md:h-80 w-full bg-gray-900">
                {/* Background (Blurred / Gradient) - Wrapped to clip overflow */}
                <div className="absolute inset-0 overflow-hidden">
                    {partner.cover_image_url ? (
                        <div className="absolute inset-0">
                            <img
                                src={partner.cover_image_url}
                                alt="Background"
                                className="w-full h-full object-cover opacity-50 blur-xl scale-110"
                            />
                            <div className="absolute inset-0 bg-black/40" />
                        </div>
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900" />
                    )}
                </div>

                {/* Navigation Wrapper */}
                <div className="absolute top-0 left-0 right-0 p-4 z-10">
                    <button
                        onClick={() => navigate(-1)}
                        className="bg-black/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/20 transition-colors border border-white/10"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                </div>

                {/* Profile Header Content */}
                <div className="absolute bottom-0 left-0 right-0 translate-y-16 md:translate-y-24 px-4 sm:px-6 lg:px-8 z-20">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">

                        {/* Profile Image (Square) */}
                        <div className="relative flex-shrink-0">
                            <div className="w-32 h-32 md:w-48 md:h-48 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-white">
                                {partner.cover_image_url ? (
                                    <img
                                        src={partner.cover_image_url}
                                        alt={partner.business_name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                                        <Sparkles className="w-12 h-12 text-primary/40" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Partner Info */}
                        <div className="flex-1 min-w-0 pb-2 md:pb-0 text-center md:text-left pt-2 md:pt-0">
                            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2 truncate">
                                {partner.business_name}
                            </h1>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                {partner.address && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                                        <MapPin className="w-4 h-4" />
                                        {partner.address.split(',').pop()?.trim() || partner.address}
                                    </div>
                                )}
                                {partner.category && (
                                    <span className="text-sm font-medium px-3 py-1 bg-primary/10 text-primary rounded-full">
                                        Bien-être
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Social Actions */}
                        <div className="flex gap-3 pb-4 md:pb-0">
                            {partner.instagram && (
                                <a
                                    href={`https://instagram.com/${partner.instagram.replace('@', '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-3 bg-white text-gray-600 rounded-full shadow-md hover:text-pink-600 transition-colors border border-gray-100"
                                    aria-label="Instagram"
                                >
                                    <Instagram className="w-5 h-5" />
                                </a>
                            )}
                            {partner.website && (
                                <a
                                    href={partner.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-3 bg-white text-gray-600 rounded-full shadow-md hover:text-blue-600 transition-colors border border-gray-100"
                                    aria-label="Site Web"
                                >
                                    <Globe className="w-5 h-5" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div >

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20 md:mt-32 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Info Column */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Description Card */}
                        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-pink-100 p-2 rounded-lg">
                                    <Sparkles className="w-5 h-5 text-pink-600" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Pourquoi vous allez kiffer</h2>
                            </div>
                            <div className="prose prose-pink max-w-none text-gray-600 leading-relaxed whitespace-pre-line">
                                {partner.description || "Ce partenaire n'a pas encore ajouté de description, mais on vous promet que c'est top !"}
                            </div>
                        </div>

                        {/* Offers Grid */}
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                Les expériences à vivre
                                <span className="text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                    {offers.length}
                                </span>
                            </h2>

                            {offers.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {offers.map((offer, index) => (
                                        <motion.div
                                            key={offer.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                        >
                                            <OfferCard {...offer} />
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                                    <p className="text-gray-500">Aucune expérience active pour le moment.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar Info */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-24">
                            <h3 className="font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Infos pratiques</h3>

                            <div className="space-y-4">
                                {partner.address && (
                                    <div className="flex items-start gap-3 text-sm">
                                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <span className="block font-medium text-gray-900">Adresse</span>
                                            <span className="text-gray-600">{partner.address}</span>
                                        </div>
                                    </div>
                                )}

                                {partner.phone && (
                                    <div className="flex items-start gap-3 text-sm">
                                        <Phone className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <span className="block font-medium text-gray-900">Téléphone</span>
                                            <a href={`tel:${partner.phone}`} className="text-primary hover:underline">
                                                {partner.phone}
                                            </a>
                                        </div>
                                    </div>
                                )}

                                {partner.contact_email && (
                                    <div className="flex items-start gap-3 text-sm">
                                        <Mail className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <span className="block font-medium text-gray-900">Contact</span>
                                            <a href={`mailto:${partner.contact_email}`} className="text-gray-600 hover:text-primary truncate block max-w-[200px]">
                                                {partner.contact_email}
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div >
    );
}
