import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MapPin, Star, ArrowRight } from 'lucide-react';

interface BlogOfferCardProps {
    offerId: string;
}

interface Offer {
    id: string;
    title: string;
    description: string;
    image_url: string;
    offer_media?: { url: string }[];
    city: string;
    offer_variants: { price: number; discounted_price?: number }[];
    partner: {
        business_name: string;
    };
}

export function BlogOfferCard({ offerId }: BlogOfferCardProps) {
    const [offer, setOffer] = useState<Offer | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchOffer() {
            try {
                const { data, error } = await supabase
                    .from('offers')
                    .select(`
            id,
            title,
            description,
            image_url,
            city,
            offer_media(url),
            offer_variants(price, discounted_price),
            partner:partners(business_name)
          `)
                    .eq('id', offerId)
                    .single();

                if (error) throw error;
                setOffer(data);
            } catch (error) {
                console.error('Error fetching offer for blog:', error);
            } finally {
                setLoading(false);
            }
        }

        if (offerId) {
            fetchOffer();
        }
    }, [offerId]);

    if (loading) {
        return (
            <div className="my-8 bg-white rounded-xl shadow-md p-4 animate-pulse border border-gray-100">
                <div className="h-6 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
        );
    }

    if (!offer) return null;

    const imageUrl = offer.image_url || offer.offer_media?.[0]?.url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c';
    const price = offer.offer_variants?.[0]?.price;
    const promoPrice = offer.offer_variants?.[0]?.discounted_price;

    return (
        <Link to={`/offres/${offer.id}`} className="block my-8 group no-underline">
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 group-hover:shadow-lg transition-all duration-300 transform group-hover:-translate-y-1">
                <div className="flex flex-col sm:flex-row">
                    <div className="sm:w-1/3 aspect-video sm:aspect-auto relative overflow-hidden">
                        <img
                            src={imageUrl}
                            alt={offer.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    </div>
                    <div className="p-6 sm:w-2/3 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wide mb-2">
                                <span>{offer.partner?.business_name}</span>
                                {offer.city && (
                                    <>
                                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                        <span className="text-gray-500 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {offer.city}
                                        </span>
                                    </>
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                                {offer.title}
                            </h3>
                            <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                                {offer.description}
                            </p>
                        </div>

                        <div className="flex items-center justify-between mt-auto">
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-500">À partir de</span>
                                <div className="flex items-baseline gap-2">
                                    {promoPrice ? (
                                        <>
                                            <span className="text-xl font-bold text-primary">{promoPrice}€</span>
                                            <span className="text-sm text-gray-400 line-through">{price}€</span>
                                        </>
                                    ) : (
                                        <span className="text-xl font-bold text-gray-900">{price}€</span>
                                    )}
                                </div>
                            </div>
                            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gray-50 text-gray-900 font-semibold text-sm group-hover:bg-primary group-hover:text-white transition-colors">
                                Voir l'offre <ArrowRight className="w-4 h-4 ml-2" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
