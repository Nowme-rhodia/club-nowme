import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { SEO } from '../../components/SEO';
import { supabase } from '../../lib/supabase';
import { OfferCard } from '../../components/OfferCard';

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
}

export default function ClubDashboard() {
  const { profile } = useAuth();
  const [offers, setOffers] = useState<OfferDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        // 1. Get partner ID for rhodia@nowme.fr
        const { data: partnerData, error: partnerError } = await supabase
          .from('partners')
          .select('id')
          .eq('contact_email', 'rhodia@nowme.fr')
          .single();

        if (partnerError || !partnerData) {
          console.error('Partner rhodia@nowme.fr not found', partnerError);
          setIsLoading(false);
          return;
        }

        // 2. Fetch offers for this partner
        const { data, error } = await supabase
          .from('offers')
          .select(`
            *,
            category:offer_categories!offers_category_id_fkey(*),
            offer_variants(price, discounted_price),
            partner:partners(business_name, address),
            offer_media(url)
          `)
          .eq('partner_id', partnerData.id)
          .eq('status', 'approved');

        if (error) {
          console.error('Error fetching offers:', error);
          return;
        }

        if (data) {
          const formattedOffers: OfferDetails[] = data.map((offer: any) => {
            const firstVariant = offer.offer_variants?.[0];
            const displayPrice = firstVariant ? Number(firstVariant.price) : 0;
            const displayPromo = firstVariant && firstVariant.discounted_price ? Number(firstVariant.discounted_price) : undefined;

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
              rating: 5.0, // Default rating for official events
              location: {
                lat,
                lng,
                address: [offer.street_address, offer.zip_code, offer.city].filter(Boolean).join(', ') || offer.partner?.address || 'Adresse non spécifiée'
              },
              category: offer.category?.name || 'Autre',
            };
          });
          setOffers(formattedOffers);
        }
      } catch (err) {
        console.error('Error in fetchOffers:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOffers();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F4] via-white to-[#FDF8F4] py-12">
      <SEO
        title="Mon Club Nowme"
        description="Accédez à tous vos avantages club : événements, masterclasses, consultations et plus"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Bienvenue dans ton Club Nowme, {profile?.first_name || ''} !
          </h1>
          <p className="text-gray-600 text-lg">
            Découvre nos événements exclusifs et rejoins la communauté
          </p>
        </div>

        {/* Dynamic Offers Grid */}
        <div className="mb-16">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse bg-white rounded-2xl overflow-hidden shadow-sm aspect-[4/3]" />
              ))}
            </div>
          ) : offers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
              {offers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  {...offer}
                  badge="Événement Officiel"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
              <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
              <p className="text-gray-600">
                Aucun événement officiel disponible pour le moment. Reviens vite !
              </p>
            </div>
          )}
        </div>

        {/* Section communauté */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Rejoins la communauté !
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Partage tes expériences, trouve des copines pour tes sorties, et découvre les cercles de passion dans notre Community Space.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/community-space"
              className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary-dark transition-colors"
            >
              <Users className="w-5 h-5 mr-2" />
              Accéder au Community Space
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}