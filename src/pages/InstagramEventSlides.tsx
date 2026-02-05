import React, { useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    Calendar,
    MapPin,
    Clock,
    Heart,
    Plane,
    Music,
    Wine,
    Crown,
    Sparkles,
    AlertTriangle,
    Star
} from 'lucide-react';

const InstagramEventSlides = () => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [showSafeZone, setShowSafeZone] = useState(true);

    const events = [
        {
            id: 'recap',
            type: 'recap',
            title: "L'AGENDA",
            subtitle: "DES KIFFS À VENIR",
            month: "FEV - AVR",
            list: [
                { date: "13 FÉV", name: "Apéro en ligne", location: "En ligne" },
                { date: "08 MARS", name: "Veux-tu t'épouser ?", location: "Ki Space Hotel & Spa" },
                { date: "04 AVRIL", name: "Girlz Day Out", location: "La Villette" },
                { date: "NOV 26", name: "Thaïlande", location: "Voyage" }
            ],
            bg: 'from-[#8E00C7] to-[#450061]'
        },
        {
            id: 1,
            type: 'event',
            title: "APÉRO EN LIGNE",
            subtitle: "Gallentines",
            copy: "On s'éclate depuis son canapé ! Saint-Valentin ou pas, on se retrouve entre nous pour rire, échanger et kiffer.",
            date: "13 FÉVRIER",
            location: "EN LIGNE",
            price_public: "10€",
            price_member: "5€",
            icon: <Wine size={48} />,
            tag: "APÉRO ZOOM",
            bg: 'from-[#A300E0] to-[#8E00C7]'
        },
        {
            id: 2,
            type: 'event_variants',
            title: "VEUX-TU T'ÉPOUSER ?",
            subtitle: "Le jour où tu t'as dit OUI.",
            copy: "Un vrai mariage à soi-même. Conférences inspirantes, Dîner de Gala & Spa. Le cadeau ultime à te faire.",
            date: "08 MARS",
            location: "KI SPACE HOTEL & SPA (77)",
            tag: "GALA & SPA",
            warning: "⚠️ PLUS QUE 20 PLACES !",
            bg: 'from-[#8E00C7] to-[#A300E0]',
            variants: [
                { name: "PASS APRÈS-MIDI", public: "69€", member: "49€" },
                { name: "PASS COMPLET", public: "179€", member: "149€" }
            ]
        },
        {
            id: 3,
            type: 'event',
            title: "GIRLZ DAY OUT",
            subtitle: "Clubbing entre femmes 30-40-50+ ans",
            copy: "Massages, cours de danse et dancefloor ! Au Movida Club, on lâche prise sans attendre minuit.",
            date: "04 AVRIL",
            location: "MOVIDA CLUB, LA VILLETTE",
            price_public: "15€",
            price_member: "5€",
            icon: <Music size={48} />,
            tag: "CLUBBING DE JOUR",
            warning: "⚠️ PREMIÈRES PLACES (PUIS 20€)",
            bg: 'from-[#A300E0] to-[#6A0091]'
        },
        {
            id: 4,
            type: 'event',
            title: "THAÏLANDE",
            subtitle: "C'est maintenant qu'on book !",
            copy: "9 jours entre femmes pour te reconnecter à l'essentiel. Temples, nature, et sororité. Inoubliable.",
            date: "NOV 2026",
            location: "CHIANG MAI & KRABI",
            price_public: "1690€",
            price_member: "1590€",
            icon: <Plane size={48} />,
            tag: "VOYAGE EXCLUSIF",
            warning: "⚠️ IL RESTE 8 PLACES",
            bg: 'from-[#8E00C7] to-[#450061]'
        },
        {
            id: 'cta',
            type: 'cta',
            title: "REJOINS-NOUS",
            subtitle: "BOOK AVANT QUE DES RESPONSABILITÉS NE PRENNENT LA PLACE DE TON KIFF",
            button: "LIEN EN BIO",
            bg: 'from-[#FFD700] to-[#FDB931]'
        }
    ];

    const next = () => setCurrentSlide((prev) => (prev + 1) % events.length);
    const prev = () => setCurrentSlide((prev) => (prev - 1 + events.length) % events.length);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#F0F0F0] p-4 font-sans select-none">

            {/* Controls */}
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
                    {showSafeZone ? <EyeOff size={14} /> : <Eye size={14} />} Simulation 1:1
                </button>
            </div>

            {/* Frame Instagram 4:5 (400x500px CSS, generates 1200x1500px images) */}
            <div data-testid="slide-container" className="relative w-[400px] h-[500px] bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] overflow-hidden">

                {/* SAFE ZONES OVERLAY (1:1 SQUARE) */}
                {showSafeZone && (
                    <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center">
                        {/* The 1:1 box is 400px wide, so 400px high in the center */}
                        <div className="w-full h-[400px] border-y-2 border-red-500/50 bg-red-500/5 flex items-center justify-center">
                            <span className="text-[10px] font-black uppercase text-red-500/50">Zone 1:1 (Feed)</span>
                        </div>
                    </div>
                )}

                {/* CONTENT */}
                <div className={`w-full h-full bg-gradient-to-br ${events[currentSlide].bg} text-white flex flex-col relative overflow-hidden`}>

                    {/* Watermark in safe zone */}
                    <div className="absolute top-[60px] right-6 opacity-30 flex flex-col items-end z-10">
                        <span className="text-[10px] font-black tracking-[0.4em]">NOWME</span>
                        <div className="h-[2px] w-8 bg-white mt-1" />
                    </div>

                    {/* BACKGROUND PATTERN DECO */}
                    <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] opacity-10 pointer-events-none">
                        <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 to-transparent animate-pulse" />
                    </div>

                    {/**************** RECAP SLIDE ****************/}
                    {events[currentSlide].type === 'recap' && (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6">
                            <div className="flex flex-col items-center gap-4 w-full max-w-[320px]">
                                <div className="text-center mt-[-20px]">
                                    <div className="bg-white text-[#8E00C7] px-4 py-1 font-black tracking-widest text-[10px] rounded-full inline-block mb-3 shadow-lg">
                                        {events[currentSlide].month}
                                    </div>
                                    <h1 className="text-5xl font-black italic tracking-tighter leading-[0.85] mb-1">
                                        {events[currentSlide].title}
                                    </h1>
                                    <h2 className="text-lg font-bold uppercase tracking-widest text-[#FFD700] opacity-90">
                                        {events[currentSlide].subtitle}
                                    </h2>
                                </div>

                                <div className="w-full flex flex-col gap-3">
                                    {events[currentSlide].list && events[currentSlide].list.map((evt, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-white/10 p-2 px-3 rounded-lg backdrop-blur-sm border border-white/5">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-[#FFD700] uppercase tracking-wider">{evt.date}</span>
                                                <span className="font-bold text-sm leading-tight truncate max-w-[180px]">{evt.name}</span>
                                            </div>
                                            <span className="text-[9px] font-medium opacity-60 uppercase text-right leading-tight max-w-[60px]">{evt.location}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/**************** EVENT SLIDE (STANDARD) ****************/}
                    {events[currentSlide].type === 'event' && (
                        <div className="w-full h-full flex flex-col p-6 items-center justify-center relative z-10">
                            {/* Centered within 1:1 zone (approx vertically center of container) */}

                            <div className="w-full max-w-[340px] flex flex-col gap-3 translate-y-[-10px]">

                                {/* Header */}
                                <div>
                                    <div className="flex justify-between items-start">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-[#FFD700] border border-[#FFD700] px-2 py-1 rounded mb-2 inline-block">
                                            {events[currentSlide].tag}
                                        </span>
                                        {/* Warning Badge */}
                                        {events[currentSlide].warning && (
                                            <div className="animate-pulse bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded flex items-center gap-1 shadow-lg">
                                                <AlertTriangle size={10} /> {events[currentSlide].warning}
                                            </div>
                                        )}
                                    </div>

                                    <h2 className="text-[38px] font-black italic leading-[0.9] tracking-tighter drop-shadow-lg mb-1 uppercase">
                                        {events[currentSlide].title}
                                    </h2>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-purple-200">
                                        {events[currentSlide].subtitle}
                                    </h3>
                                </div>

                                {/* Copy */}
                                <p className="text-sm font-medium leading-snug opacity-90 italic border-l-2 border-[#FFD700] pl-3 py-1">
                                    "{events[currentSlide].copy}"
                                </p>

                                {/* Details */}
                                <div className="flex items-center gap-6 mt-1 mb-1 bg-black/10 p-2 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="text-[#FFD700]" size={14} />
                                        <span className="font-black text-base italic">{events[currentSlide].date}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="text-[#FFD700]" size={14} />
                                        <span className="font-bold text-[10px] uppercase leading-tight">{events[currentSlide].location}</span>
                                    </div>
                                </div>

                                {/* Pricing */}
                                <div className="flex gap-3 items-end">
                                    <div className="flex-1 bg-white/10 p-2 rounded-lg border border-white/10 backdrop-blur-sm">
                                        <span className="text-[9px] font-bold uppercase tracking-wider block text-white/70 mb-1">Public</span>
                                        <span className="text-xl font-black italic">{events[currentSlide].price_public}</span>
                                    </div>
                                    <div className="flex-1 bg-[#FFD700] p-2 rounded-lg border-2 border-white shadow-xl text-[#8E00C7] transform scale-105 relative z-10">
                                        <div className="flex items-center gap-1 mb-1">
                                            <Crown size={10} strokeWidth={3} />
                                            <span className="text-[9px] font-black uppercase tracking-wider">Membre</span>
                                        </div>
                                        <span className="text-2xl font-black italic tracking-tighter">{events[currentSlide].price_member}</span>
                                    </div>
                                </div>

                            </div>

                            {/* Background Icon */}
                            <div className="absolute right-[-10px] bottom-[100px] opacity-10 transform rotate-[-15deg] scale-[2] pointer-events-none">
                                {events[currentSlide].icon}
                            </div>

                        </div>
                    )}

                    {/**************** EVENT SLIDE (VARIANTS) ****************/}
                    {events[currentSlide].type === 'event_variants' && (
                        <div className="w-full h-full flex flex-col p-6 items-center justify-center relative z-10">
                            <div className="w-full max-w-[340px] flex flex-col gap-3 translate-y-[-10px]">

                                {/* Header */}
                                <div>
                                    <div className="flex justify-between items-start">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-[#FFD700] border border-[#FFD700] px-2 py-1 rounded mb-2 inline-block">
                                            {events[currentSlide].tag}
                                        </span>
                                        {events[currentSlide].warning && (
                                            <div className="animate-pulse bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded flex items-center gap-1 shadow-lg">
                                                <AlertTriangle size={10} /> {events[currentSlide].warning}
                                            </div>
                                        )}
                                    </div>

                                    <h2 className="text-[38px] font-black italic leading-[0.9] tracking-tighter drop-shadow-lg mb-1 uppercase">
                                        {events[currentSlide].title}
                                    </h2>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-purple-200">
                                        {events[currentSlide].subtitle}
                                    </h3>
                                </div>

                                {/* Copy */}
                                <p className="text-xs font-medium leading-snug opacity-90 italic border-l-2 border-[#FFD700] pl-3 py-1">
                                    "{events[currentSlide].copy}"
                                </p>

                                {/* Details */}
                                <div className="flex items-center gap-4 mt-1 mb-1 bg-black/10 p-2 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="text-[#FFD700]" size={14} />
                                        <span className="font-black text-sm italic">{events[currentSlide].date}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="text-[#FFD700]" size={14} />
                                        <span className="font-bold text-[9px] uppercase leading-tight truncate max-w-[150px]">{events[currentSlide].location}</span>
                                    </div>
                                </div>

                                {/* Variants Pricing Table */}
                                <div className="flex flex-col gap-2 mt-1">
                                    {events[currentSlide].variants?.map((v, i) => (
                                        <div key={i} className="flex items-center justify-between bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/5">
                                            <span className="text-[10px] font-black uppercase tracking-wider flex-1">{v.name}</span>
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col items-end opacity-70">
                                                    <span className="text-[8px] font-medium uppercase">Public</span>
                                                    <span className="text-xs font-bold">{v.public}</span>
                                                </div>
                                                <div className="flex flex-col items-end text-[#FFD700]">
                                                    <div className="flex items-center gap-1">
                                                        <Crown size={8} /> <span className="text-[8px] font-black uppercase">Club</span>
                                                    </div>
                                                    <span className="text-lg font-black italic">{v.member}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/**************** CTA SLIDE ****************/}
                    {events[currentSlide].type === 'cta' && (
                        <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 gap-6 z-20">
                            <div className="text-[#8E00C7]">
                                <h2 className="text-5xl font-black italic tracking-tighter leading-[0.85]">
                                    {events[currentSlide].title}
                                </h2>
                                <p className="text-lg font-black uppercase tracking-widest mt-3 opacity-80">
                                    {events[currentSlide].subtitle}
                                </p>
                            </div>

                            <div className="relative group w-full max-w-[260px]">
                                <div className="absolute inset-0 bg-[#8E00C7] translate-x-1 translate-y-1 rounded-lg" />
                                <button className="relative w-full bg-white text-[#8E00C7] py-3 px-6 font-black text-xl uppercase italic tracking-tighter border-2 border-[#8E00C7] rounded-lg shadow-xl">
                                    {events[currentSlide].button}
                                </button>
                            </div>

                            <div className="flex gap-4 opacity-50 text-[#8E00C7] mt-4">
                                <Heart className="animate-bounce" />
                                <Sparkles className="animate-spin-slow" />
                            </div>
                        </div>
                    )}

                </div>
            </div>

        </div>
    );
};

export default InstagramEventSlides;
