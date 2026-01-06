import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { Sparkles, MapPin, ChevronRight, Star } from 'lucide-react';
import { SEO } from '../components/SEO';

import { supabase } from '../lib/supabase';
import { OfferCard } from '../components/OfferCard';

// ✅ On tape explicitement les noms d’icônes
type IconName = keyof typeof LucideIcons;

function LatestOffers() {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLatestOffers() {
      try {
        const { data, error } = await supabase
          .from('offers')
          .select(`
            *,
            promo_conditions,
            booking_type,
            offer_variants(price, discounted_price),
            partner:partners(business_name, address)
          `)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(4);

        if (error) throw error;

        if (data) {
          const formatted = data.map((offer: any) => {
            // Basic formatting similar to TousLesKiffs but simplified
            const firstVariant = offer.offer_variants?.[0];
            // Coordinates parsing
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
              price: firstVariant ? Number(firstVariant.price) : 0,
              promoPrice: firstVariant?.discounted_price ? Number(firstVariant.discounted_price) : undefined,
              rating: 4.8, // Static for now or fetch
              location: [offer.street_address, offer.zip_code, offer.city].filter(Boolean).join(', ') || offer.partner?.address || 'Paris',
              category: 'Nouveauté',
              partnerName: offer.partner?.business_name,
              promoConditions: offer.promo_conditions,
              bookingType: offer.booking_type
            };
          });
          setOffers(formatted);
        }
      } catch (err) {
        console.error('Error fetching latest offers:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLatestOffers();
  }, []);

  if (loading) return null;
  if (offers.length === 0) return null;

  return (
    <div className="py-24 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            🔥 Les dernières pépites
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Elles viennent d'arriver, fonce avant qu'il n'y ait plus de place !
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {offers.map((offer) => (
            <OfferCard key={offer.id} {...offer} />
          ))}
        </div>
        <div className="text-center mt-12">
          <Link to="/tous-les-kiffs" className="text-pink-600 font-semibold hover:text-pink-700 inline-flex items-center">
            Voir tous les kiffs <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}

import { EventGallery } from '../components/EventGallery';
import { VideoTestimonials } from '../components/VideoTestimonials';

// ... (keep existing imports)

// ... (keep LatestOffers component)

export default function Home() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features: { icon: IconName; title: string; description: string }[] = [
    {
      icon: 'Users',
      title: 'Validé par 2000+ membres',
      description: 'Chaque événement, chaque partenaire : testé et approuvé par notre communauté.'
    },
    {
      icon: 'Star',
      title: 'Rentable dès la 1ère sortie',
      description: 'Une seule soirée suffit souvent à rembourser ton abonnement. Le reste ? C\'est du bonus.'
    },
    {
      icon: 'Shield',
      title: 'Zéro stress, 100% liberté',
      description: 'Teste à 12,99€, résilie en 1 clic quand tu veux. Aucun engagement.'
    },
    {
      icon: 'Search',
      title: 'Ta nouvelle tribu',
      description: 'Masterclass, événements exclusifs, groupe privé : ne reste plus jamais seule.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Nowme - Le Club Privé des Femmes qui Kiffent"
        description="Rejoins le club n°1 des sorties entre filles en Île-de-France. Événements, amitié et bons plans !"
      />

      {/* Hero Section */}
      <div className="relative min-h-[90vh] bg-white flex items-center overflow-hidden border-b-4 border-pink-500">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1571388208497-71bedc66e932?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10 animate-subtle-zoom" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center max-w-4xl mx-auto">
            <span className="inline-block px-4 py-1 rounded-full bg-pink-100 text-pink-600 font-bold text-sm mb-6 animate-fade-in-down">
              👑 Le Club N°1 en Île-de-France
            </span>
            <h1 className={`text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight mb-6 animate-fade-in-down ${scrollY > 50 ? 'opacity-0' : 'opacity-100'}`}>
              Marre de la routine ?<br />
              <span className="text-pink-500">Rejoins le Club Nowme !</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto animate-fade-in-up">
              Sorties, rencontres, voyages et bons plans : l'abonnement ultime pour celles qui veulent <strong>tout vivre à fond</strong>.
            </p>
            <p className="text-lg text-pink-600 font-semibold mb-12 animate-pulse">
              🔥 Offre Découverte : 1er mois à 12,99€ (sans engagement)
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/subscription"
                className="inline-flex items-center px-8 py-4 rounded-full bg-pink-500 text-white font-semibold hover:bg-pink-600 transform hover:scale-105 transition-all animate-bounce-slow shadow-lg shadow-pink-500/30"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Je rejoins le Club
              </Link>
              <Link
                to="/tous-les-kiffs"
                className="inline-flex items-center px-8 py-4 rounded-full bg-white text-pink-500 border-2 border-pink-500 font-semibold hover:bg-gray-50 transform hover:scale-105 transition-all"
              >
                <MapPin className="w-5 h-5 mr-2" />
                Voir les sorties
              </Link>
            </div>
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="flex -space-x-2">
                <img className="w-8 h-8 rounded-full border-2 border-white" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=50" alt="" />
                <img className="w-8 h-8 rounded-full border-2 border-white" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=50" alt="" />
                <img className="w-8 h-8 rounded-full border-2 border-white" src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=50" alt="" />
              </div>
              <span>Rejoint par +2000 membres cette année</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real Photos Section (Sales Boost) */}
      <EventGallery />

      {/* Avantages */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-16">
            Pourquoi tu vas adorer
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = LucideIcons[feature.icon] as React.ComponentType<{ className?: string }>;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 text-center shadow-md hover:shadow-lg transition-all animate-slide-up"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-100 mb-6">
                    {Icon && <Icon className="w-8 h-8 text-pink-500" />}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Les derniers Kiffs */}
      <LatestOffers />

      {/* Social Proof (Video Testimonials) */}
      <VideoTestimonials />

      {/* CTA final */}
      <div className="py-20 bg-gradient-to-br from-pink-500 to-purple-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ta nouvelle vie commence maintenant.
          </h2>
          <p className="text-xl md:text-2xl mb-12 opacity-90">
            Ne laisse pas passer une autre année à te dire "il faudrait que je sorte plus".
            Rejoins le mouvement.
          </p>
          <Link
            to="/subscription"
            className="inline-flex items-center px-10 py-5 bg-white text-pink-600 font-bold text-xl rounded-full hover:bg-gray-100 transform hover:scale-105 transition-all shadow-2xl"
          >
            Je m'abonne (12,99€) <ChevronRight className="w-6 h-6 ml-2" />
          </Link>
          <p className="mt-6 text-sm text-white/80">
            Sans engagement • Satisfait ou remboursé • Annulation en 1 clic
          </p>
        </div>
      </div>
    </div>
  );
}
