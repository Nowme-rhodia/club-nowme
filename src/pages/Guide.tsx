
import React from 'react';
import { SEO } from '../components/SEO';
import {
    Heart,
    Calendar,
    Users,
    Gift,
    MessageCircle,
    Star,
    MapPin,
    ShoppingBag,
    Phone,
    HelpCircle,
    Settings,
    LogOut,
    ShieldCheck,
    CreditCard
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ... imports

export function Guide() {
    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans text-gray-800">
            <SEO
                title="Mode d'emploi - Nowme"
                description="Comment fonctionne le club ? WhatsApp, Sorties, Paiements..."
            />

            {/* Hero */}
            <div className="bg-white border-b border-gray-100 pt-24 pb-12 px-4 text-center">
                <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full mb-4">ONBOARDING</span>
                <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
                    Bienvenue au Club ! 🏠
                </h1>
                <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                    L'essentiel pour bien démarrer en 2 minutes chrono.
                </p>
            </div>

            <div className="max-w-6xl mx-auto px-4 mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

                {/* Card 1: WhatsApp */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 mb-4">
                        <MessageCircle className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">1. WhatsApp</h2>
                    <p className="text-gray-600 text-sm mb-4">
                        On utilise les Communautés pour ne pas te spammer.
                    </p>
                    <ul className="space-y-3 text-sm">
                        <li className="flex gap-2">
                            <span className="font-bold whitespace-nowrap">🔇 Groupes Région :</span>
                            <span className="text-gray-500">Annonces seules (0 blabla). Active les notifs !</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="font-bold whitespace-nowrap">🗣️ Groupes Thèmes :</span>
                            <span className="text-gray-500">Discussion libre (Sport, Moms, Business...).</span>
                        </li>
                    </ul>
                </div>

                {/* Card 2: Proposer une sortie */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-4">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">2. Proposer une sortie</h2>
                    <p className="text-gray-600 text-sm mb-4">
                        Envie d'un ciné ou d'une rando ?
                    </p>
                    <ol className="space-y-3 text-sm list-decimal list-inside text-gray-600 font-medium">
                        <li>Crée la sortie sur l'App (Onglet QG).</li>
                        <li>Copie le lien de la sortie.</li>
                        <li>Partage-le sur WhatsApp dans le groupe concerné.</li>
                    </ol>
                    <div className="mt-4 p-2 bg-purple-50 text-purple-700 text-xs rounded-lg text-center">
                        Toujours App d'abord, WhatsApp ensuite !
                    </div>
                </div>

                {/* Card 3: Mon Ardoise */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">3. Payer sur place</h2>
                    <p className="text-gray-600 text-sm mb-4">
                        Utilise "Mon Ardoise" pour payer tes consommations et gagner du bonus.
                    </p>
                    <div className="space-y-2 text-sm text-gray-600">
                        <p>1. Achète un crédit (ex: paye 40€, reçois l'offre du partenaire).</p>
                        <p>2. Au moment de payer, ouvre l'app.</p>
                        <p>3. Saisis le montant et montre <strong className="text-green-600">l'Écran Vert ✅</strong> au serveur.</p>
                    </div>
                </div>

                {/* Card 4: Programme Fidélité (NEW) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center text-pink-600 mb-4">
                        <Gift className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">4. Programme Fidélité</h2>
                    <p className="text-gray-600 text-sm mb-4">
                        Ton kiff est récompensé !
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600">
                        <li>💰 <strong>1€ dépensé = 1 point</strong></li>
                        <li>📅 <strong>1 Sortie organisée = 50 points</strong></li>
                        <li>🎁 <strong>Débloque jusqu'à 70€</strong> de bon d'achat !</li>
                    </ul>
                </div>

                {/* Card 5: Ventes Privées */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center text-yellow-600 mb-4">
                        <ShoppingBag className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">5. Ventes Privées</h2>
                    <ul className="space-y-2 text-sm text-gray-600">
                        <li><strong>Code Promo :</strong> Copier-coller sur le site partenaire.</li>
                        <li><strong>Lien secret :</strong> Accès direct aux tarifs négociés.</li>
                        <li><strong>E-books :</strong> Retrouve-les dans "Mes Réservations".</li>
                    </ul>
                </div>

                {/* Card 6: Mon Compte */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4">
                        <Settings className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">6. Mon Compte</h2>
                    <p className="text-gray-600 text-sm mb-4">
                        Accessible via ton profil en haut à droite.
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600">
                        <li>• Modifier photo / téléphone.</li>
                        <li>• Gérer l'abonnement (Factures, CB).</li>
                        <li>• Résilier (en 1 clic, sans blabla).</li>
                    </ul>
                </div>

                {/* Card 6: Aide */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow flex flex-col items-center text-center justify-center">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600 mb-4">
                        <HelpCircle className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">Une question ?</h2>
                    <p className="text-gray-600 text-sm mb-4">
                        On est là pour toi, vraiment.
                    </p>
                    <a
                        href="mailto:contact@nowme.fr"
                        className="px-6 py-2 bg-gray-900 text-white rounded-full text-sm font-bold hover:bg-black transition-colors"
                    >
                        contact@nowme.fr
                    </a>
                </div>

            </div>

            <div className="text-center mt-12">
                <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm underline">
                    Retour à l'accueil
                </Link>
            </div>
        </div >
    );
}
