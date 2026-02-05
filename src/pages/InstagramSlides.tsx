import React, { useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    ArrowRight,
    Star,
    Heart,
    Zap,
    Sparkles,
    MapPin,
    Search,
    Music,
    MessageCircle,
    Monitor,
    Gift,
    BookOpen,
    Coins,
    Users,
    Trophy,
    Mail
} from 'lucide-react';

const InstagramSlides = () => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [showSafeZone, setShowSafeZone] = useState(true);

    const slides = [
        {
            id: 1,
            type: 'hook',
            title: "À QUOI TU AS DROIT EN REJOIGNANT LE CLUB ?",
            subtitle: "Le club des Kiffeues 30-40-50+.",
            bg: 'from-[#8E00C7] to-[#A300E0]',
        },
        {
            id: 2,
            type: 'joke',
            title: "DES BISOUS... 😘",
            subtitle: "Hahaha ! Bon, en vrai c'est beaucoup plus sérieux (et excitant) que ça... ⬇️",
            icon: "😜",
            bg: 'from-[#A300E0] to-[#6A0091]',
        },
        {
            id: 3,
            type: 'icon_focus',
            title: "SORTIES & RENCONTRES 🎷",
            subtitle: "NE RESTE PLUS JAMAIS SEULE",
            content: "Envie d'un concert ou d'un lieu trendy ?",
            detail: "Il y aura toujours une kiffeuse pour t'accompagner. Fini de rater les pépites.",
            icon: <Music size={40} />,
            label: "LIVE MUSIC",
            bg: 'from-[#8E00C7] to-[#A300E0]',
        },
        {
            id: 4,
            type: 'icon_focus',
            title: "VRAIES CONNEXIONS 💬",
            subtitle: "AU-DELÀ D'UNE SOIRÉE",
            content: "Garde le contact avec ta squad.",
            detail: "Nos groupes WhatsApp soudent la communauté. Julie n'est plus une inconnue.",
            icon: <MessageCircle size={40} />,
            label: "WHATSAPP VIP",
            bg: 'from-[#8E00C7] to-[#A300E0]',
        },
        {
            id: 5,
            type: 'icon_focus',
            title: "GROUPES À THÈMES 👯♀️",
            subtitle: "TES PASSIONS, TA SQUAD",
            content: "Maman, Voyage, Beauté, Business...",
            detail: "Rejoins les sous-groupes qui te ressemblent pour échanger sur tes délires.",
            icon: <Users size={40} />,
            label: "SQUAD GOALS",
            bg: 'from-[#8E00C7] to-[#A300E0]',
        },
        {
            id: 6,
            type: 'icon_focus',
            title: "PROXIMITÉ 📍",
            subtitle: "PARTOUT EN IDF",
            content: "Pas que dans le centre de Paris.",
            detail: "On organise des événements partout pour que le kiff soit à ta porte.",
            icon: <MapPin size={40} />,
            label: "LOCAL LOVE",
            bg: 'from-[#8E00C7] to-[#A300E0]',
        },
        {
            id: 7,
            type: 'icon_focus',
            title: "MODE FLEMME ACTIVÉ 💻",
            subtitle: "LES APÉROS EN LIGNE",
            content: "Rire depuis ton canapé.",
            detail: "Nos visios sont là pour papoter sans même enlever son pyjama.",
            icon: <Monitor size={40} />,
            label: "PYJAMA PARTY",
            bg: 'from-[#8E00C7] to-[#A300E0]',
        },
        {
            id: 8,
            type: 'icon_focus',
            title: "LE JACKPOT FIDÉLITÉ 💰",
            subtitle: "TON KIFF = DU CASH",
            content: "1€ dépensé = 1 point gagné.",
            detail: "Tes sorties génèrent des points transformables en Bons d'Achat (jusqu'à 70€ !).",
            icon: <Coins size={40} />,
            label: "CASHBACK",
            bg: 'from-[#8E00C7] to-[#A300E0]',
        },
        {
            id: 9,
            type: 'icon_focus',
            title: "L'ENQUÊTEUR DU KIFF 🕵️♀️",
            subtitle: "ON CHERCHE, TU PROFITES",
            content: "On déniche les pépites pour toi.",
            detail: "On négocie les prix et on te livre nos recommandations sur un plateau.",
            icon: <Search size={40} />,
            label: "TOP SPOTS",
            bg: 'from-[#8E00C7] to-[#A300E0]',
        },
        {
            id: 10,
            type: 'icon_focus',
            title: "ACCÈS PRIORITAIRE ⚡️",
            subtitle: "PREMIÈRE SUR LA LISTE",
            content: "Réserve avant tout le monde.",
            detail: "Tu reçois les liens 48h avant l'ouverture. Ne sois plus jamais en liste d'attente.",
            icon: <Zap size={40} />,
            label: "FAST PASS",
            bg: 'from-[#8E00C7] to-[#A300E0]',
        },
        {
            id: 11,
            type: 'icon_focus',
            title: "RÉDUCTIONS 💎",
            subtitle: "LE KIFF ACCESSIBLE",
            content: "-10% à -50% sur tes kiffs partenaires.",
            detail: "Spa, ateliers, sport, thérapie, voyages, danse... accessibles uniquement pour les membres du club.",
            icon: <Star size={40} />,
            label: "MEMBER ONLY",
            bg: 'from-[#8E00C7] to-[#A300E0]',
        },
        {
            id: 12,
            type: 'icon_focus',
            title: "LA NOWME BOX 🎁",
            subtitle: "SURPRISE TRIMESTRIELLE",
            content: "Noël tous les 3 mois.",
            detail: "Gagne la box remplie de produits pépites (+100€) réservée aux membres, offerts par les partenaires",
            icon: <Gift size={40} />,
            label: "SURPRISE",
            bg: 'from-[#8E00C7] to-[#A300E0]',
        },
        {
            id: 13,
            type: 'icon_focus',
            title: "L'ACADEMY 🎓",
            subtitle: "GRANDIR ENSEMBLE",
            content: "Plus qu'un club social.",
            detail: "Book Club, Conférences & Masterclasses pour s'élever entre femmes inspirantes.",
            icon: <BookOpen size={40} />,
            label: "GROWTH",
            bg: 'from-[#8E00C7] to-[#A300E0]',
        },
        {
            id: 19,
            type: 'icon_focus',
            title: "NEWSLETTER DU KIFF 💌",
            subtitle: "GÉRER TA VIE À 100 À L'HEURE",
            content: "Conseils, Astuces & Motivation.",
            detail: "Le shot d'énergie hebdo pour t'aider à tout concilier sans t'oublier.",
            icon: <Mail size={40} />,
            label: "WEEKLY BOOST",
            bg: 'from-[#8E00C7] to-[#A300E0]',
        },
        {
            id: 14,
            type: 'vision',
            title: "L'UNION FAIT LA MAGIE",
            argument: "On loue des lieux à 4000€ et on casse les prix pour toi grâce à la force du collectif.",
            highlight: "Privatisation & Exclusivité.",
            bg: 'from-[#8E00C7] to-[#A300E0]',
        },
        {
            id: 15,
            type: 'value_price',
            title: "RENTABILITÉ IMMÉDIATE",
            subtitle: "Arrête de payer le prix fort.",
            publicPrice: "40€",
            clubPrice: "20€",
            highlight: "Une seule sortie et ton mois est déjà remboursé.",
            bg: 'from-[#8E00C7] to-[#A300E0]',
        },
        {
            id: 16,
            type: 'offer',
            title: "OFFRE LANCEMENT",
            price: "12,99€",
            subtitle: "Le 1er mois pour tester. Zéro risque, 100% kiff.",
            bg: 'from-[#8E00C7] to-[#A300E0]',
        },
        {
            id: 17,
            type: 'cta',
            title: "PRÊTE À KIFFER ?",
            content: "Rejoins nous, si tu veux encore plus de kiff dans ta vie.",
            button: "LIEN EN BIO",
            bg: 'from-[#8E00C7] to-[#A300E0]',
        },
        {
            id: 18,
            type: 'hook',
            title: "WELCOME TO THE CLUB",
            subtitle: "Ta nouvelle vie commence ici. 💖",
            bg: 'from-[#8E00C7] to-[#A300E0]',
        }
    ];

    const next = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
    const prev = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#F0F0F0] p-4 font-sans select-none">

            {/* Contrôles de prévisualisation */}
            <div className="mb-6 flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                <button onClick={prev} className="p-2 hover:bg-slate-100 rounded-lg text-purple-600 transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Slide {currentSlide + 1}</span>
                <button onClick={next} data-testid="next-button" className="p-2 hover:bg-slate-100 rounded-lg text-purple-600 transition-colors">
                    <ChevronRight size={24} />
                </button>
                <div className="w-px h-6 bg-slate-200" />
                <button
                    onClick={() => setShowSafeZone(!showSafeZone)}
                    data-testid="toggle-safe-zone"
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter flex items-center gap-2 transition-all ${showSafeZone ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-slate-100 text-slate-500'}`}
                >
                    {showSafeZone ? <EyeOff size={14} /> : <Eye size={14} />} Simulation Instagram
                </button>
            </div>

            {/* Frame Instagram 4:5 */}
            <div data-testid="slide-container" className="relative w-full max-w-[400px] aspect-[4/5] bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] overflow-hidden">

                {/* SIMULATION INTERFACE INSTAGRAM (SAFE ZONES) */}
                {showSafeZone && (
                    <div className="absolute inset-0 z-50 pointer-events-none">
                        {/* Header (Profil) */}
                        <div className="absolute top-0 w-full h-[60px] bg-gradient-to-b from-black/40 to-transparent flex items-center px-4 gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30" />
                            <div className="w-24 h-2 bg-white/40 rounded" />
                        </div>
                        {/* Footer (Actions + Caption) */}
                        <div className="absolute bottom-0 w-full h-[120px] bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4 gap-2">
                            <div className="flex gap-4 mb-2">
                                <div className="w-6 h-6 rounded-full border-2 border-white/60" />
                                <div className="w-6 h-6 rounded-full border-2 border-white/60" />
                                <div className="w-6 h-6 rounded-full border-2 border-white/60" />
                            </div>
                            <div className="w-1/2 h-2 bg-white/30 rounded" />
                        </div>
                        {/* Indicateur de Danger Zone */}
                        <div className="absolute top-0 w-full h-[60px] border-b border-dashed border-red-500/30 flex items-center justify-center bg-red-500/5">
                            <span className="text-[8px] text-red-400 font-black uppercase">Interdit : Zone de profil</span>
                        </div>
                        <div className="absolute bottom-0 w-full h-[120px] border-t border-dashed border-red-500/30 flex items-center justify-center bg-red-500/5">
                            <span className="text-[8px] text-red-400 font-black uppercase">Interdit : Zone d'interaction</span>
                        </div>
                    </div>
                )}

                {/* CONTENU SLIDE - Respectant les Safe Zones */}
                <div className={`w-full h-full bg-gradient-to-br ${slides[currentSlide].bg} text-white flex flex-col px-8 pt-[70px] pb-[130px] relative overflow-hidden`}>

                    {/* Filigrane Branding Recentré */}
                    <div className="absolute top-[80px] right-8 flex flex-col items-end opacity-20">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Nowme</span>
                        <div className="h-0.5 w-6 bg-white" />
                    </div>

                    <div className="flex-1 flex flex-col justify-center items-center text-center">

                        {/* HOOK TYPE */}
                        {slides[currentSlide].type === 'hook' && (
                            <div className="space-y-6">
                                <div className="bg-[#FFD700] text-[#8E00C7] p-6 -rotate-1 shadow-[8px_8px_0_white]">
                                    <h1 className="text-[28px] font-black uppercase leading-[0.9] tracking-tighter">
                                        {slides[currentSlide].title}
                                    </h1>
                                </div>
                                <p className="text-xl font-black italic tracking-tight px-2">
                                    {slides[currentSlide].subtitle}
                                </p>
                            </div>
                        )}

                        {/* JOKE TYPE */}
                        {slides[currentSlide].type === 'joke' && (
                            <div className="space-y-4">
                                <div className="text-7xl mb-4">{slides[currentSlide].icon}</div>
                                <h2 className="text-4xl font-black text-[#FFD700] uppercase italic tracking-tighter leading-none">
                                    {slides[currentSlide].title}
                                </h2>
                                <p className="text-lg font-bold italic opacity-80 border-l-2 border-[#FFD700] pl-4 py-2 mx-4 text-left">
                                    {slides[currentSlide].subtitle}
                                </p>
                            </div>
                        )}

                        {/* ICON FOCUS */}
                        {slides[currentSlide].type === 'icon_focus' && (
                            <div className="w-full text-left space-y-6">
                                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center text-[#A300E0] shadow-xl">
                                    {slides[currentSlide].icon}
                                </div>
                                <div className="space-y-2">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-[#FFD700]">{slides[currentSlide].title}</div>
                                    <h2 className="text-3xl font-black uppercase italic leading-none tracking-tighter">
                                        {slides[currentSlide].subtitle}
                                    </h2>
                                </div>
                                <div className="space-y-3">
                                    <p className="text-lg font-black italic text-[#FFD700] uppercase tracking-tight">
                                        {slides[currentSlide].content}
                                    </p>
                                    <p className="text-sm font-medium opacity-70 leading-snug max-w-[90%]">
                                        {slides[currentSlide].detail}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* VISION TYPE */}
                        {slides[currentSlide].type === 'vision' && (
                            <div className="space-y-6 text-left w-full">
                                <Trophy size={48} className="text-[#FFD700]" />
                                <h2 className="text-4xl font-black uppercase italic leading-[0.85] tracking-tighter">
                                    {slides[currentSlide].title}
                                </h2>
                                <div className="bg-white/10 backdrop-blur-md p-6 border-l-4 border-[#FFD700]">
                                    <p className="text-lg font-black italic leading-tight uppercase">
                                        "{slides[currentSlide].argument}"
                                    </p>
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-[#FFD700]">
                                    {slides[currentSlide].highlight}
                                </div>
                            </div>
                        )}

                        {/* VALUE PRICE TYPE */}
                        {slides[currentSlide].type === 'value_price' && (
                            <div className="w-full space-y-6">
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter leading-none">{slides[currentSlide].title}</h2>
                                <div className="bg-[#FFD700] text-[#8E00C7] p-8 shadow-xl relative overflow-hidden">
                                    <div className="flex items-center justify-center gap-4">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] font-black line-through opacity-40 italic">{slides[currentSlide].publicPrice}</span>
                                            <span className="text-xs font-black uppercase opacity-40">Public</span>
                                        </div>
                                        <div className="text-7xl font-black italic tracking-tighter">{slides[currentSlide].clubPrice}</div>
                                        <div className="flex flex-col items-start leading-none">
                                            <span className="text-xs font-black uppercase">Club</span>
                                            <span className="text-xs font-black uppercase text-white">Nowme</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-base font-black italic uppercase leading-tight border-t border-white/20 pt-4">
                                    "{slides[currentSlide].highlight}"
                                </p>
                            </div>
                        )}

                        {/* OFFER TYPE */}
                        {slides[currentSlide].type === 'offer' && (
                            <div className="space-y-4">
                                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FFD700]">Lancement Exclusif</div>
                                <h2 className="text-4xl font-black uppercase tracking-tighter italic leading-none">{slides[currentSlide].title}</h2>
                                <div className="text-9xl font-black text-white italic tracking-tighter drop-shadow-lg">
                                    {slides[currentSlide].price}
                                </div>
                                <p className="text-base font-bold italic uppercase opacity-80 mt-2">
                                    {slides[currentSlide].subtitle}
                                </p>
                            </div>
                        )}

                        {/* CTA TYPE */}
                        {slides[currentSlide].type === 'cta' && (
                            <div className="w-full space-y-8">
                                <div className="space-y-2">
                                    <h2 className="text-5xl font-black uppercase italic leading-[0.8] tracking-tighter">
                                        {slides[currentSlide].title}
                                    </h2>
                                    <p className="text-lg font-black italic uppercase opacity-70">
                                        {slides[currentSlide].content}
                                    </p>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-white translate-x-2 translate-y-2" />
                                    <button className="relative w-full bg-[#FFD700] text-[#A300E0] py-5 font-black text-2xl uppercase italic tracking-tighter border-2 border-[#8E00C7]">
                                        {slides[currentSlide].button}
                                    </button>
                                </div>
                                <div className="flex justify-center gap-6 opacity-40">
                                    <Heart size={18} />
                                    <Sparkles size={18} />
                                    <Star size={18} />
                                </div>
                            </div>
                        )}

                    </div>

                </div>
            </div>

            <div className="mt-6 max-w-[400px] text-[10px] text-center font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                Contenu recentré sur le <span className="text-red-500">"Safe Square"</span> pour éviter les coupures de l'interface Instagram.
            </div>
        </div>
    );
};

export default InstagramSlides;
