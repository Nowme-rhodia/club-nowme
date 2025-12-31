import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { OfferCard } from './OfferCard';

interface BlogOfferCardProps {
    offerId: string;
}

interface OfferData {
    id: string;
    title: string;
    description: string;
    price: number;
    promo_price?: number;
    images: string[];
    category: { name: string } | null; // Join result structure
    partner: { company_name: string } | null; // Join result structure
    location: { address: string; lat: number; lng: number };
}

export function BlogOfferCard({ offerId }: BlogOfferCardProps) {
    const [offer, setOffer] = useState<OfferData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchOffer() {
            try {
                const { data, error } = await supabase
                    .from('offers')
                    .select(`
            *,
            category:offer_categories(name),
            partner:partners(company_name)
          `)
                    .eq('id', offerId)
                    .single();

                if (error) throw error;
                setOffer(data);
            } catch (error) {
                console.error('Error fetching linked offer:', error);
            } finally {
                setLoading(false);
            }
        }

        if (offerId) fetchOffer();
    }, [offerId]);

    if (loading) return <div className="h-48 bg-gray-100 rounded-2xl animate-pulse my-8"></div>;
    if (!offer) return null;

    return (
        <div className="my-12 not-prose max-w-sm mx-auto sm:max-w-md">
            <OfferCard
                id={offer.id}
                title={offer.title}
                description={offer.description}
                location={offer.location}
                price={offer.price}
                promoPrice={offer.promo_price}
                imageUrl={offer.images?.[0] || ''}
                rating={5} // Default for now
                category={offer.category?.name || 'Kiff'}
                partnerName={offer.partner?.company_name}
            />
        </div>
    );
}
