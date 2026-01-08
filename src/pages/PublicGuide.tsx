import React from 'react';
import { SEO } from '../components/SEO';
import { Link } from 'react-router-dom';
import { MessageCircle, Calendar, CreditCard, Gift, ArrowRight, Lock, Heart, Users } from 'lucide-react';
import { VideoTestimonials } from '../components/VideoTestimonials';

export function PublicGuide() {
    return (
        <div className="min-h-screen bg-white font-sans text-gray-800">
            <SEO
                title="Découvre le Club Nowme - Mode d'emploi"
                description="Plonge dans l'univers Nowme avant même de t'abonner. WhatsApp, Sorties, Avantages : tout ce qui t'attend !"
            />

            {/* Hero Section */}
            <div className="relative bg-[#FFF0F5] overflow-hidden">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-pink-200 rounded-full blur-3xl opacity-50"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-purple-200 rounded-full blur-3xl opacity-50"></div>

                <div className="relative pt-24 pb-16 px-4 text-center max-w-5xl mx-auto">
                    <span className="inline-block px-4 py-1.5 bg-white text-pink-600 font-bold text-sm tracking-wide uppercase rounded-full shadow-sm mb-6 animate-fade-in-down">
                        ✨ Sneak Peek
                    </span>
                    <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
                        Voilà ce qui t'attend <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                            de l'autre côté.
                        </span>
                    </h1>
                    <p className="text-gray-600 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
                        Tu hésites encore ? On te montre les coulisses.
                        Regarde comment le Club va transformer ton quotidien dès ton inscription.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/subscription"
                            className="inline-flex items-center px-8 py-4 rounded-full bg-pink-500 text-white font-bold text-lg hover:bg-pink-600 transition-all shadow-lg hover:scale-105"
                        >
                            Je m'abonne maintenant <ArrowRight className="ml-2 w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* New Use Cases Section */}
            <div className="py-20 px-4 max-w-7xl mx-auto space-y-24">

                {/* Use Case 1: Creator */}
                <div className="flex flex-col md:flex-row items-center gap-12">
                    <div className="flex-1 order-2 md:order-1">
                        <div className="w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center text-pink-600 mb-6">
                            <Users className="w-8 h-8" />
                        </div>
                        <h3 className="text-3xl font-bold mb-4 text-gray-900">Tu es l'organisatrice (si tu veux)</h3>
                        <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                            Tu es la seule de tes amies à aimer le Jazz ? Ou à vouloir tester ce nouveau resto coréen ? <br />
                            <strong className="text-pink-600">Ici, tu ne seras plus jamais seule.</strong><br />
                            Crée ta sortie en 2 clics, et trouve instantanément des copines motivées pour t'accompagner.
                        </p>
                    </div>
                    <div className="flex-1 order-1 md:order-2">
                        <div className="relative rounded-3xl overflow-hidden shadow-2xl transform hover:rotate-2 transition-transform duration-500">
                            <img src="https://plus.unsplash.com/premium_photo-1764592023835-89a3db64a5f8?auto=format&fit=crop&q=80" alt="Sortie entre filles" className="w-full h-auto" />
                        </div>
                    </div>
                </div>

                {/* Use Case 2: Daily Perks */}
                <div className="flex flex-col md:flex-row items-center gap-12">
                    <div className="flex-1">
                        <div className="relative rounded-3xl overflow-hidden shadow-2xl transform hover:-rotate-2 transition-transform duration-500">
                            <img src="https://plus.unsplash.com/premium_photo-1681486904214-1eefdaaf1753?auto=format&fit=crop&q=80" alt="Spa et détente" className="w-full h-auto" />
                        </div>
                    </div>
                    <div className="flex-1">
                        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-6">
                            <Gift className="w-8 h-8" />
                        </div>
                        <h3 className="text-3xl font-bold mb-4 text-gray-900">Ton quotidien, en mieux</h3>
                        <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                            Ce n'est pas que pour les grandes occasions.<br />
                            C'est l'Happy Hour prolongé le mardi soir, le Spa à -30% le dimanche, ou juste le café offert dans ton spot préféré.<br />
                            <strong className="text-purple-600">Rentabilise ton abonnement juste en vivant ta vie.</strong>
                        </p>
                    </div>
                </div>

                {/* Use Case 3: Thematic & Local */}
                <div className="flex flex-col md:flex-row items-center gap-12">
                    <div className="flex-1 order-2 md:order-1">
                        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-6">
                            <Heart className="w-8 h-8" />
                        </div>
                        <h3 className="text-3xl font-bold mb-4 text-gray-900">Partout & Pour Tout</h3>
                        <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                            Que tu habites à Versailles, Cergy ou Paris centre, il y a des événements à côté de chez toi.<br />
                            Et pour tes passions ? Rejoins nos <strong className="text-indigo-600">Clubs Thématiques</strong> :<br />
                            <span className="inline-flex flex-wrap gap-2 mt-3">
                                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">📚 Book Club</span>
                                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">🎨 Art Club</span>
                                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">👟 Sport</span>
                                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">🍷 Œnologie</span>
                            </span>
                        </p>
                    </div>
                    <div className="flex-1 order-1 md:order-2">
                        <div className="relative rounded-3xl overflow-hidden shadow-2xl transform hover:rotate-1 transition-transform duration-500">
                            <img src="https://plus.unsplash.com/premium_photo-1670884128402-ee91907adab0?auto=format&fit=crop&q=80" alt="Groupe d'amies" className="w-full h-auto" />
                        </div>
                    </div>
                </div>

            </div>

            {/* Checklist Section ("What's in the box") */}
            <div className="bg-gray-900 text-white py-24 my-12">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-extrabold mb-6">Tout ce qui est inclus.</h2>
                        <p className="text-xl text-gray-300">Pas de frais cachés. Une tonne de valeur.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-x-12 gap-y-6">
                        {[
                            "Ventes Privées (-20% à -50%)",
                            "WhatsApp Privé (Groupes quartiers & thèmes)",
                            "L'Agenda Secret (Accès prioritaire)",
                            "Traitement de Reine (Service inclus)",
                            "Sorties Gratuites incluses",
                            "Mon Ardoise (Paiement fluide)",
                            "Safe & Bienveillant (Modéré)",
                            "Masterclass & Coaching (Grandir)",
                            "100% Digital (Apéros Visio)",
                            "Partout en IDF & Clubs Thématiques"
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-4 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                                <span className="font-bold text-lg">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Social Proof Section */}
            <div className="bg-gray-50 py-20">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <Heart className="w-12 h-12 text-pink-500 mx-auto mb-4 fill-current animate-pulse" />
                        <h2 className="text-3xl font-bold">Elles ont déjà testé les événements</h2>
                        <p className="text-gray-600 mt-2">Ce n'est pas juste une promesse, c'est leur réalité.</p>
                    </div>
                    <VideoTestimonials />
                </div>
            </div>

            {/* Final CTA */}
            <div className="bg-white py-20 px-4 text-center">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold mb-8">
                        Prête à changer tes soirées (et tes week-ends) ?
                    </h2>
                    <Link
                        to="/subscription"
                        className="inline-flex items-center px-10 py-5 rounded-full bg-gray-900 text-white font-bold text-xl hover:bg-black transition-all shadow-2xl hover:-translate-y-1"
                    >
                        Rejoindre le Club maintenant
                    </Link>
                    <p className="mt-6 text-sm text-gray-400">
                        Sans engagement. Satisfait ou remboursé.
                    </p>
                </div>
            </div>

        </div>
    );
}
