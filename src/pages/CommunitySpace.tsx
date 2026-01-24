import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CommunityMap } from '../components/CommunityMap';
import { LocationPicker } from '../components/LocationPicker';
import { useLoadScript } from '@react-google-maps/api';
import {
  Sparkles,
  MapPin,
  MessageCircle,
  Send,
  ArrowRight,
  Coffee,
  Palette,
  Utensils,
  Heart,
  BookOpen,
  Plane,
  Smile,
  X,
  ChevronLeft,
  ChevronRight,
  Megaphone
} from 'lucide-react';
import { CommunityRulesModal } from '../components/community/CommunityRulesModal';
import { CommunitySection } from '../components/community/CommunitySection';
import { PreLaunchBlocker } from '../components/PreLaunchBlocker';

// --- TYPES ---
interface CommunityContent {
  id: string;
  type: 'announcement' | 'kiff';
  title: string;
  content: string;
  image_url?: string;
  created_at: string;
}

// --- COMPONENTS ---

const CircleCard = ({ icon: Icon, title, description, color }: { icon: any, title: string, description: string, color: string }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-100 group cursor-pointer h-full">
    <div className={`${color} w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <h3 className="font-bold text-lg text-gray-900 mb-2">{title}</h3>
    <p className="text-sm text-gray-500 mb-4">{description}</p>
    <button className="w-full py-2 px-4 rounded-lg bg-gray-50 text-gray-900 font-medium text-sm group-hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 mt-auto">
      <MessageCircle className="w-4 h-4" />
      Rejoindre
    </button>
  </div>
);

const AnnouncementBanner = ({ text }: { text: string }) => (
  <div className="bg-gradient-to-r from-purple-600 to-primary text-white py-3 px-4 shadow-md mb-8 rounded-xl flex items-center gap-3 animate-fade-in">
    <div className="bg-white/20 p-2 rounded-full">
      <Megaphone className="w-5 h-5 text-white" />
    </div>
    <p className="font-medium text-sm sm:text-base">{text}</p>
  </div>
);

const Linkify = ({ children }: { children: string }) => {
  const parts = children.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.match(/https?:\/\/[^\s]+/)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </>
  );
};

const KiffModal = ({ kiff, onClose }: { kiff: CommunityContent, onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/80 rounded-full hover:bg-gray-100 transition-colors z-10"
      >
        <X className="w-6 h-6 text-gray-900" />
      </button>

      {kiff.image_url && (
        <div className="h-64 sm:h-80 w-full relative">
          <img src={kiff.image_url} alt={kiff.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-6 left-6 text-white">
            <span className="bg-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 inline-block">
              Coup de Cœur
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold">{kiff.title}</h2>
          </div>
        </div>
      )}

      <div className="p-8">
        {!kiff.image_url && <h2 className="text-2xl font-bold mb-6">{kiff.title}</h2>}
        <div className="prose prose-purple max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap">
          <Linkify>{kiff.content}</Linkify>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="text-gray-500 hover:text-primary font-medium">
            Fermer
          </button>
        </div>
      </div>
    </div>
  </div>
);


const LIBRARIES: ("places")[] = ["places"];

export default function CommunitySpace() {
  const { profile, loading: authLoading, user, isAdmin, refreshProfile } = useAuth();

  // Pre-launch Blocking Logic
  const isAllowed = isAdmin || user?.email === 'nowme.club@gmail.com' || user?.email === 'rhodia@nowme.fr';

  // Data State
  const [announcements, setAnnouncements] = useState<CommunityContent[]>([]);
  const [kiffs, setKiffs] = useState<CommunityContent[]>([]);
  const [loadingContent, setLoadingContent] = useState(true);

  // UI State
  const [suggestion, setSuggestion] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedKiff, setSelectedKiff] = useState<CommunityContent | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const [pastEvents, setPastEvents] = useState<CommunityContent[]>([]);
  const [mapRefreshKey, setMapRefreshKey] = useState(0);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES, // Load places library once here for both map and picker
  });

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      // 1. Fetch Manual Community Content
      const { data: communityData, error: communityError } = await supabase
        .from('community_content')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (communityError) throw communityError;

      // 2. Fetch Rhodia's Offers
      const RHODIA_PARTNER_ID = 'b8782294-f203-455b-980b-6893dd527bf2';

      // Fetch Active/Upcoming Offers
      const { data: activeOffers, error: offersError } = await supabase
        .from('offers')
        .select('*')
        .eq('partner_id', RHODIA_PARTNER_ID)
        .eq('status', 'approved'); // Only approved offers

      // Fetch Past/Archived Offers
      const { data: archivedOffers, error: archivedError } = await supabase
        .from('offers')
        .select('*')
        .eq('partner_id', RHODIA_PARTNER_ID)
        .or('status.eq.archived,and(booking_type.eq.event,event_end_date.lt.now())');

      if (offersError) console.error('Error fetching offers:', offersError);
      if (archivedError) console.error('Error fetching archived offers:', archivedError);

      // Process Data
      const manualAnnouncements = communityData?.filter((i: any) => i.type === 'announcement') || [];
      const manualKiffs = communityData?.filter((i: any) => i.type === 'kiff') || [];

      // Map Active Offers to Kiffs format
      const offerKiffs: CommunityContent[] = (activeOffers as any[] || []).map(offer => ({
        id: offer.id,
        type: 'kiff',
        title: offer.title,
        content: offer.description,
        image_url: offer.image_url,
        created_at: offer.created_at
      }));

      // Map Past Offers to Kiffs format
      const pastOffersList: CommunityContent[] = (archivedOffers as any[] || []).map(offer => ({
        id: offer.id,
        type: 'kiff',
        title: offer.title,
        content: offer.description,
        image_url: offer.image_url,
        created_at: offer.created_at
      }));

      // Filter out duplicates
      const uniquePastOffers = pastOffersList.filter(p => !offerKiffs.find(a => a.id === p.id));

      setAnnouncements(manualAnnouncements);
      setKiffs([...manualKiffs, ...offerKiffs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setPastEvents(uniquePastOffers);

    } catch (err) {
      console.error('Error fetching content:', err);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleSuggestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('community_suggestions')
        .insert({
          user_id: profile?.user_id,
          suggestion_text: suggestion
        } as any);

      if (error) throw error;
      toast.success("Merci ! Ton idée a été envoyée à l'équipe 💕");
      setSuggestion('');
    } catch (err) {
      console.error('Erreur suggestion:', err);
      toast.error("Oups, une erreur est survenue.");
    } finally {
      setSending(false);
    }
  };

  // Carousel Logic
  const itemsPerSlide = 3;
  const totalSlides = Math.ceil(kiffs.length / itemsPerSlide);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % totalSlides);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);

  const visibleKiffs = kiffs.slice(
    currentSlide * itemsPerSlide,
    currentSlide * itemsPerSlide + itemsPerSlide
  );

  // Loading State
  if (authLoading || loadingContent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF8F4]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {!authLoading && !isAllowed && (
        <PreLaunchBlocker overlay={true} />
      )}

      <div className={`min-h-screen bg-[#FDF8F4] pb-20 transition-all duration-500 ${!isAllowed ? 'blur-md pointer-events-none select-none h-screen overflow-hidden' : ''}`}>
        <SEO title="Le Club Privé" description="Espace communautaire exclusif Nowme" />

        {/* HEADER */}
        <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Hello {profile?.first_name || 'Sunshine'} ✨
                </h1>
                <p className="text-gray-500 text-xs sm:text-sm">
                  Bienvenue dans ton espace privé.
                </p>
              </div>
              <div className="hidden sm:block">
                <span className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold border border-primary/20">
                  Membre Club
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">

          {/* SECTION 0: ANNONCES */}
          {announcements.length > 0 && (
            <div className="space-y-4">
              {announcements.map(announcement => (
                <AnnouncementBanner key={announcement.id} text={announcement.title} />
              ))}
            </div>
          )}

          {/* SECTION 1: LE MUR DES KIFFS (CAROUSEL) */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold text-gray-900">Le Mur des Kiffs</h2>
              </div>
              {kiffs.length > itemsPerSlide && (
                <div className="flex gap-2">
                  <button onClick={prevSlide} className="p-2 rounded-full border border-gray-200 hover:bg-white transition-colors">
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <button onClick={nextSlide} className="p-2 rounded-full border border-gray-200 hover:bg-white transition-colors">
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              )}
            </div>

            {kiffs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {visibleKiffs.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedKiff(item)}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group cursor-pointer border border-gray-100 flex flex-col"
                  >
                    <div className="h-48 overflow-hidden relative bg-gray-100">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <ImageIcon className="w-12 h-12" />
                        </div>
                      )}
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-primary shadow-sm">
                        Pépite du mois
                      </div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="font-bold text-lg mb-2 text-gray-900 line-clamp-2">{item.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed line-clamp-3 mb-4 flex-1">
                        {item.content}
                      </p>
                      <div className="text-primary font-medium text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                        Lire la suite <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-300 text-gray-500">
                Les pépites arrivent bientôt ! 💎
              </div>
            )}
          </section>

          {/* SECTION 2: LE HUB DES CERCLES */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <MessageCircle className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-gray-900">Vos Cercles de Discussion</h2>
            </div>
            <CommunitySection profile={profile} />
          </section>

          {/* SECTION 4: LA BOITE A IDÉES */}
          <section className="max-w-2xl mx-auto text-center pt-8">
            <div className="bg-gradient-to-br from-primary to-primary-dark rounded-3xl p-8 sm:p-12 text-white shadow-xl">
              <h2 className="text-3xl font-bold mb-4">Une idée brillante ? 💡</h2>
              <p className="text-primary-100 mb-8 max-w-lg mx-auto">
                C'est votre club. Dites-nous ce qui vous ferait vibrer pour les prochains mois !
              </p>

              <form onSubmit={handleSuggestionSubmit} className="relative">
                <textarea
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  placeholder="J'aimerais trop voir..."
                  className="w-full h-32 rounded-xl p-4 text-gray-900 focus:outline-none focus:ring-4 focus:ring-white/30 placeholder:text-gray-400"
                />
                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={sending || !suggestion.trim()}
                    className="bg-white text-primary px-8 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {sending ? 'Envoi...' : 'Envoyer'}
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* SECTION 1.5: CARTE COMMUNAUTAIRE */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <MapPin className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-gray-900">Le Quartier Nowme</h2>
            </div>
            {loadError && <div className="text-red-500 bg-red-50 p-4 rounded-xl">Erreur de chargement de la carte</div>}
            {!isLoaded ? (
              <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded-2xl">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-8 rounded-2xl border border-purple-100 text-center">
                  <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                    <MapPin className="w-8 h-8 text-purple-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Le Quartier arrive bientôt !</h3>
                  <p className="text-gray-500 max-w-lg mx-auto">
                    Nous peaufinons la carte pour vous offrir la meilleure expérience possible.
                    Vous pourrez bientôt découvrir les membres de votre quartier.
                  </p>
                </div>
              </>
            )}
          </section>

        </div>

        {/* MODAL */}
        {selectedKiff && (
          <KiffModal kiff={selectedKiff} onClose={() => setSelectedKiff(null)} />
        )}

        {/* Community Rules Modal */}
        {!authLoading && profile && !profile.accepted_community_rules_at && (
          <CommunityRulesModal onAccept={() => refreshProfile()} />
        )}

      </div>
    </div>
  );
}

// Icon helper since we are using dynamic lucide imports inside the map
function ImageIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  )
}