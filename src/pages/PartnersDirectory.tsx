import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SEO } from '../components/SEO';
import { Sparkles, MapPin } from 'lucide-react';

interface Partner {
    id: string;
    business_name: string;
    slug: string;
    description: string;
    cover_image_url: string;
    logo_url: string;
    address: string;
    main_category_id: string;
    main_category?: {
        name: string;
        parent_name: string;
    };
}

export default function PartnersDirectory() {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPartners = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('partners')
                    .select(`
            id,
            business_name,
            slug,
            description,
            cover_image_url,
            logo_url,
            address,
            main_category_id,
            main_category:offer_categories(name, parent_name)
          `)
                    .eq('status', 'approved')
                    .order('business_name');

                if (error) throw error;
                // Transform the data to match the interface, handling potential single object from relationship
                const formattedData = (data as any[]).map(p => ({
                    ...p,
                    main_category: Array.isArray(p.main_category) ? p.main_category[0] : p.main_category
                }));
                setPartners(formattedData);
            } catch (err) {
                console.error('Error fetching partners:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPartners();
    }, []);

    // Group partners by category
    const groupedPartners = partners.reduce((acc, partner) => {
        // Determine the category to group by. Use parent_name if available, otherwise name, otherwise 'Autres'
        let groupName = 'Autres';
        if (partner.main_category) {
            groupName = partner.main_category.parent_name || partner.main_category.name || 'Autres';
        }

        if (!acc[groupName]) {
            acc[groupName] = [];
        }
        acc[groupName].push(partner);
        return acc;
    }, {} as Record<string, Partner[]>);

    // Sort groups alphabetically, but move "Autres" to the end
    const sortedGroups = Object.keys(groupedPartners).sort((a, b) => {
        if (a === 'Autres') return 1;
        if (b === 'Autres') return -1;
        return a.localeCompare(b);
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <SEO
                title="Nos Partenaires - Club Nowme"
                description="Découvrez tous les partenaires du Club Nowme classés par catégorie."
            />

            {/* Hero Section */}
            <div className="bg-primary/5 py-16 px-4 sm:px-6 lg:px-8 mb-12">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 font-display">
                        Nos <span className="text-primary italic">Partenaires</span>
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Découvrez notre réseau de partenaires de confiance sélectionnés pour vous offrir les meilleures expériences.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {sortedGroups.map((groupName) => (
                    <div key={groupName} className="mb-16">
                        <h2 className="text-2xl font-bold text-gray-900 mb-8 pb-3 border-b-2 border-gray-100 flex items-center gap-3">
                            <span className="bg-pink-100 text-primary p-2 rounded-xl">
                                <Sparkles className="w-5 h-5" />
                            </span>
                            {groupName}
                            <span className="text-sm font-normal text-gray-500 ml-2 bg-gray-100 px-3 py-1 rounded-full">
                                {groupedPartners[groupName].length}
                            </span>
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {groupedPartners[groupName].map((partner) => (
                                <Link
                                    key={partner.id}
                                    to={`/partenaire/${partner.slug}`}
                                    className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col h-full transform hover:-translate-y-1"
                                >
                                    {/* Cover Image Area */}
                                    <div className="h-40 bg-gray-100 relative overflow-hidden">
                                        {partner.cover_image_url ? (
                                            <img
                                                src={partner.cover_image_url}
                                                alt=""
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-pink-200/40 flex items-center justify-center">
                                                <Sparkles className="w-10 h-10 text-primary/30" />
                                            </div>
                                        )}

                                        {/* Optional Logo overlay */}
                                        {partner.logo_url && (
                                            <div className="absolute -bottom-6 left-6 w-16 h-16 bg-white rounded-xl shadow-md p-1 border border-gray-100 z-10">
                                                <img
                                                    src={partner.logo_url}
                                                    alt={`${partner.business_name} logo`}
                                                    className="w-full h-full object-contain rounded-lg"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Content Area */}
                                    <div className={`p-6 flex-1 flex flex-col ${partner.logo_url ? 'pt-8' : ''}`}>
                                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                                            {partner.business_name}
                                        </h3>

                                        {partner.address && (
                                            <div className="flex items-start gap-1.5 text-sm text-gray-500 mb-3">
                                                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                <span className="line-clamp-1">{partner.address.split(',').pop()?.trim() || partner.address}</span>
                                            </div>
                                        )}

                                        <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-1">
                                            {partner.description || "Découvrez les offres de ce partenaire."}
                                        </p>

                                        <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center">
                                            <span className="text-primary font-medium text-sm group-hover:underline">
                                                Voir le profil
                                            </span>
                                            {partner.main_category && (
                                                <span className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded-md line-clamp-1 max-w-[50%]">
                                                    {partner.main_category.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}

                {partners.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                        <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-gray-900 mb-2">Aucun partenaire trouvé</h3>
                        <p className="text-gray-500">Revenez bientôt pour découvrir de nouveaux partenaires !</p>
                    </div>
                )}
            </div>
        </div>
    );
}
