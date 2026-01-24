import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { Sparkles, MapPin, ChevronRight, Star } from 'lucide-react';
import { SEO } from '../components/SEO';

import { supabase } from '../lib/supabase';
import { OfferCard } from '../components/OfferCard';
import { EventGallery } from '../components/EventGallery';
// import { VideoTestimonials } from '../components/VideoTestimonials';

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
              bookingType: offer.booking_type,
              slug: offer.slug
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



export default function Home() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Bento Grid Card Component
  // Bento Grid Card Component
  const BenefitCard = ({
    icon, color, bg, title, desc, className = "", large = false, tags = []
  }: {
    icon: IconName; color: string; bg: string; title: string; desc: string; className?: string; large?: boolean; tags?: string[]
  }) => {
    const Icon = LucideIcons[icon] as React.ComponentType<{ className?: string }>;
    return (
      <div className={`relative overflow-hidden rounded-3xl p-5 md:p-6 transition-all duration-300 hover:shadow-xl group ${large ? 'bg-gradient-to-br from-gray-50 to-white border border-gray-100' : 'bg-white border border-gray-100 hover:border-pink-100'} ${className}`}>

        {/* Background Decorative Blob for Large Cards */}
        {large && (
          <div className={`absolute -right-10 -bottom-10 w-40 h-40 ${bg} rounded-full opacity-20 blur-2xl group-hover:opacity-40 transition-opacity`}></div>
        )}

        <div className={`relative z-10 flex ${large ? 'flex-col sm:flex-row items-start sm:items-center gap-6' : 'flex-col items-start gap-4'}`}>
          <div className={`w-14 h-14 ${bg} rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
            {Icon && <Icon className={`w-7 h-7 ${color}`} />}
          </div>
          <div className="flex-1">
            <h3 className={`font-bold text-gray-900 mb-2 ${large ? 'text-2xl' : 'text-lg'}`}>{title}</h3>
            <p className={`text-gray-600 leading-relaxed ${large ? 'text-base' : 'text-sm'}`}>{desc}</p>

            {/* Visual Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {tags.map((tag, i) => (
                  <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ... (previous sections) ... */}

      {/* ... keeping Hero & EventGallery ... */}
      <SEO
        title="Nowme - Le Club Privé des Femmes qui Kiffent"
        description="Rejoins Nowme, le Club privé n°1 pour femmes en Île-de-France. Sorties exclusives, nouvelles amitiés, dîners, voyages et bons plans. L'abonnement ultime pour reprendre le pouvoir sur ton temps libre !"
      />

      {/* Hero Section */}
      <div className="relative min-h-[90vh] bg-white flex items-center overflow-hidden border-b-4 border-pink-500">
        {/* ... Hero Content (unchanged) ... */}
        <div className="absolute inset-0 bg-[url('https://plus.unsplash.com/premium_photo-1681486904214-1eefdaaf1753?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')] bg-cover bg-center opacity-10 animate-subtle-zoom" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center max-w-4xl mx-auto">
            <span className="inline-block px-4 py-1 rounded-full bg-pink-100 text-pink-600 font-bold text-sm mb-6 animate-fade-in-down">
              👑 Le Club des femmes qui kiffent
            </span>
            <h1 className={`text-4xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight mb-6 animate-fade-in-down ${scrollY > 50 ? 'opacity-0' : 'opacity-100'}`}>
              Le Club n°1 des <span className="text-pink-500">sorties entre filles +30 ans</span><br />
              & rencontres amicales
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
                <img className="w-8 h-8 rounded-full border-2 border-white" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=50" alt="Membre du club" />
                <img className="w-8 h-8 rounded-full border-2 border-white" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=50" alt="Membre du club" />
                <img className="w-8 h-8 rounded-full border-2 border-white" src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=50" alt="Membre du club" />
              </div>
              <span>Déjà +2000 femmes qui ont participé à nos événements - concentrés de kiffs</span>
            </div>
          </div>
        </div>
      </div>

      <EventGallery />

      {/* Avantages Bento Grid */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
              Tout ce que tu vas <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">kiffer</span>.
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              On a mis le paquet. Un seul abonnement, une infinité de possibilités.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">

            {/* HERO ITEM: Agenda Secret (Large) */}
            <BenefitCard
              large={true}
              className="md:col-span-2 lg:col-span-2 row-span-1 bg-white"
              icon="Calendar"
              color="text-purple-600"
              bg="bg-purple-100"
              title="📅 L'Agenda Secret"
              desc="Accès prioritaire à toutes les sorties. Sold Out pour le public ? Pas pour toi. Tu es VIP partout."
            />

            {/* HERO ITEM: Jackpot Fidélité (Large - NEW) */}
            <BenefitCard
              large={true}
              className="md:col-span-2 lg:col-span-2 row-span-1 bg-gradient-to-br from-yellow-50 to-white"
              icon="Trophy"
              color="text-yellow-600"
              bg="bg-yellow-100"
              title="💰 Le Jackpot Fidélité"
              desc="Ton kiff paie ! 1€ = 1 point. Débloque jusqu'à 70€ de bon d'achat juste en profitant de ta vie."
              tags={['1€ = 1pt', 'Jackpot 70€']}
            />

            {/* Ventes Privées */}
            <BenefitCard
              icon="Gift"
              color="text-pink-500"
              bg="bg-pink-100"
              title="Ventes Privées"
              desc="-20% à -50% sur tes marques et lieux chouchous."
              tags={['-20%', '-50%', 'Exclusif']}
            />

            {/* Ardoise */}
            <BenefitCard
              icon="CreditCard"
              color="text-blue-500"
              bg="bg-blue-100"
              title="Mon Ardoise"
              desc="Paiement fluide sans sortir ta CB."
            />

            {/* WhatsApp */}
            <BenefitCard
              icon="MessageCircle"
              color="text-green-500"
              bg="bg-green-100"
              title="WhatsApp Privé"
              desc="Tes nouvelles copines sont à un message."
            />

            {/* HERO ITEM: Clubs Thematiques (Large) */}
            <BenefitCard
              large={true}
              className="md:col-span-2 lg:col-span-2 row-span-1 bg-white"
              icon="Palette"
              color="text-indigo-500"
              bg="bg-indigo-100"
              title="🎨 Clubs Thématiques"
              desc="Rejoins des sous-groupes de passionnées. Trouve ta tribu dans la tribu."
              tags={['📚 Book Club', '🎾 Sport Club', '🎨 Art Club', '💄 Business Club', '🍼 Mamans']}
            />

            {/* Traitement de Reine */}
            <BenefitCard
              icon="Crown"
              color="text-yellow-500"
              bg="bg-yellow-100"
              title="Mode Reine"
              desc="On gère tout. Zéro charge mentale."
            />

            {/* Gratuités */}
            <BenefitCard
              icon="Ticket"
              color="text-teal-500"
              bg="bg-teal-100"
              title="Sorties Offertes"
              desc="Des événements 100% gratuits inclus."
            />

            {/* Safe */}
            <BenefitCard
              icon="ShieldCheck"
              color="text-emerald-500"
              bg="bg-emerald-100"
              title="100% Safe"
              desc="Modo & staff aux petits soins."
            />

            {/* HERO ITEM: Expansion (Large) */}
            <BenefitCard
              large={true}
              className="md:col-span-2 lg:col-span-2 row-span-1 bg-white"
              icon="MapPin"
              color="text-red-500"
              bg="bg-red-100"
              title="🌍 Partout en Île-de-France"
              desc="Pas besoin d'aller à Paris. Le Club arrive dans tout l'IDF."
              tags={['77 Fontainebleau', '78 Versailles', '91 Massy', '92 Boulogne', '93 Saint-Ouen', '94 Vincennes', '95 Cergy']}
            />

            {/* Growth */}
            <BenefitCard
              icon="GraduationCap"
              color="text-orange-500"
              bg="bg-orange-100"
              title="Masterclass"
              desc="Booste ta carrière et ta vie perso."
            />

            {/* Digital */}
            <BenefitCard
              icon="Laptop"
              color="text-cyan-500"
              bg="bg-cyan-100"
              title="100% Connecté"
              desc="Apéros visio pour réseauter du canapé."
            />

          </div>

          {/* Mission Statement (Styled differently to pop) */}
          <div className="mt-20 mx-auto max-w-5xl">
            <div className="bg-gray-900 rounded-[2.5rem] p-8 md:p-12 text-center text-white relative overflow-hidden shadow-2xl transform hover:scale-[1.01] transition-transform duration-500">
              {/* Animated background gradients */}
              <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-pink-500 rounded-full blur-[100px] opacity-30 animate-pulse"></div>
              <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-purple-500 rounded-full blur-[100px] opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>

              <div className="relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-8 backdrop-blur-sm border border-white/20">
                  <Sparkles className="w-10 h-10 text-yellow-400" />
                </div>
                <h3 className="text-3xl md:text-5xl font-black mb-6 tracking-tight">
                  Plus qu'un abonnement,<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">une mission commune.</span>
                </h3>
                <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
                  En rejoignant le Club, tu ne fais pas que payer un service. <br className="hidden md:block" />
                  <strong className="text-white">Tu finances directement, des lieux prestigieux, un service de malade, la possibilité de rencontrer d'autres kiffeuses avec qui profiter sans parler des animatrices passionnées qui t'accompagne,</strong> qui seront là pour s'occuper de toi comme une reine, à chaque événement.
                </p>
                <Link to="/subscription" className="inline-flex items-center px-8 py-4 bg-white text-gray-900 rounded-full font-bold hover:bg-gray-100 transition-colors">
                  Je participe à l'aventure <ChevronRight className="ml-2 w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Les derniers Kiffs */}
      <LatestOffers />

      {/* Social Proof (Video Testimonials) */}
      {/* <VideoTestimonials /> */}

      {/* CTA final */}
      <div className="py-20 bg-gradient-to-br from-pink-500 to-purple-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://plus.unsplash.com/premium_photo-1748061945412-a6d0cc5da78b?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
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
