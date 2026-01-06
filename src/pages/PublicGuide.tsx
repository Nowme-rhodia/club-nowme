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

            {/* The 4 Pillars */}
            <div className="py-20 px-4 max-w-7xl mx-auto">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">

                    {/* Card 1 */}
                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-100/50 hover:border-green-100 transition-all group">
                        <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-500 mb-6 group-hover:scale-110 transition-transform">
                            <MessageCircle className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">1. Ta nouvelle "Team"</h3>
                        <p className="text-gray-600 mb-4">
                            Dès ton arrivée, tu rejoins nos communautés WhatsApp privées. C'est là que la magie opère.
                        </p>
                        <div className="bg-green-50 rounded-xl p-4 text-sm text-green-800 font-medium">
                            Use Case : "Qui est chaud pour un resto ce soir ?" -&gt; 5 réponses en 10 min.
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-100/50 hover:border-purple-100 transition-all group">
                        <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-500 mb-6 group-hover:scale-110 transition-transform">
                            <Calendar className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">2. Sorties illimitées</h3>
                        <p className="text-gray-600 mb-4">
                            Accès complet à l'agenda : Afterworks, Ateliers, Sport, Dîners...
                        </p>
                        <div className="bg-purple-50 rounded-xl p-4 text-sm text-purple-800 font-medium flex items-center gap-2">
                            <Lock className="w-4 h-4" />
                            <span>Agenda "Secret" réservé aux membres.</span>
                        </div>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-100/50 hover:border-indigo-100 transition-all group">
                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 mb-6 group-hover:scale-110 transition-transform">
                            <CreditCard className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">3. Mon Ardoise</h3>
                        <p className="text-gray-600 mb-4">
                            Notre monnaie interne qui booste ton pouvoir d'achat. Paye 40€, reçois 50€ de crédit.
                        </p>
                        <div className="bg-indigo-50 rounded-xl p-4 text-sm text-indigo-800 font-medium">
                            Résultat : Tes verres et repas te coûtent -20% toute l'année.
                        </div>
                    </div>

                    {/* Card 4 */}
                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-100/50 hover:border-yellow-100 transition-all group">
                        <div className="w-14 h-14 bg-yellow-50 rounded-2xl flex items-center justify-center text-yellow-500 mb-6 group-hover:scale-110 transition-transform">
                            <Gift className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">4. Cadeaux & Ventes Privées</h3>
                        <p className="text-gray-600 mb-4">
                            Codes promo exclusifs, produits offerts, et accès aux ventes flash.
                        </p>
                        <div className="bg-yellow-50 rounded-xl p-4 text-sm text-yellow-800 font-medium">
                            Moyenne économisée par membre : 150€ / an.
                        </div>
                    </div>

                </div>
            </div>

            {/* Social Proof Section */}
            <div className="bg-gray-50 py-20">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <Heart className="w-12 h-12 text-pink-500 mx-auto mb-4 fill-current animate-pulse" />
                        <h2 className="text-3xl font-bold">Elles l'utilisent déjà tous les jours</h2>
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
