
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

export function Guide() {
    return (
        <div className="min-h-screen bg-[#FDF8F4] pb-20 font-sans text-gray-800">
            <SEO
                title="Mode d'emploi complet"
                description="Tout savoir sur le fonctionnement du Club Nowme : WhatsApp, Sorties, Compte et Avantages."
            />

            {/* Hero */}
            <div className="bg-primary pt-24 pb-16 px-4 text-center">
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-6">
                    Bienvenue chez toi ! 🏠
                </h1>
                <p className="text-white/90 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
                    Prends un thé ☕️ et installe-toi confortablement.<br />
                    On t'explique tout, pas à pas, pour que tu te sentes ici comme chez toi.
                </p>
            </div>

            <div className="max-w-4xl mx-auto px-4 -mt-10 space-y-12">

                {/* 1. WHATSAPP & COMMUNAUTÉ */}
                <section className="bg-white rounded-3xl shadow-lg p-6 md:p-10 border border-gray-100">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 bg-green-100 rounded-2xl text-green-600">
                            <MessageCircle className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                            1. Comment fonctionne WhatsApp ?
                        </h2>
                    </div>

                    <div className="pl-0 md:pl-4 space-y-6 text-lg leading-relaxed text-gray-600">
                        <p>
                            Pour faciliter les échanges tout en respectant ta tranquillité, nous utilisons le système de <strong>Communauté WhatsApp</strong>.
                        </p>

                        <div className="grid md:grid-cols-2 gap-6 mt-6">
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                                <h3 className="font-bold text-gray-900 flex items-center mb-3 text-xl">
                                    🔇 Les Groupes "Région"
                                </h3>
                                <p className="text-sm">
                                    <em>Exemple : "Nowme - 75 Paris", "Nowme - 92"...</em>
                                </p>
                                <ul className="mt-4 space-y-2 list-disc list-inside">
                                    <li>Ce sont des groupes <strong>d'annonces uniquement</strong>.</li>
                                    <li>Seules les administratrices peuvent poster.</li>
                                    <li><strong>Pourquoi ?</strong> Pour que ton téléphone ne sonne pas toutes les 2 minutes ! C'est ici que tu verras les infos importantes près de chez toi sans être dérangée.</li>
                                </ul>
                            </div>

                            <div className="bg-green-50 p-6 rounded-2xl border border-green-200">
                                <h3 className="font-bold text-gray-900 flex items-center mb-3 text-xl">
                                    🗣️ Les Groupes "Thématiques"
                                </h3>
                                <p className="text-sm">
                                    <em>Exemple : "On va danser", "Maman la galère"...</em>
                                </p>
                                <ul className="mt-4 space-y-2 list-disc list-inside">
                                    <li>Ici, <strong>la discussion est ouverte !</strong></li>
                                    <li>Tu peux papoter, échanger des conseils, rire et organiser des choses.</li>
                                    <li>C'est le lieu de vie de la communauté.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. PROPOSER UNE SORTIE */}
                <section className="bg-white rounded-3xl shadow-lg p-6 md:p-10 border border-gray-100">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 bg-purple-100 rounded-2xl text-purple-600">
                            <Calendar className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                            2. Envie de proposer une sortie ?
                        </h2>
                    </div>

                    <div className="pl-0 md:pl-4 space-y-6 text-lg leading-relaxed text-gray-600">
                        <p>
                            Tu veux aller voir une expo, marcher en forêt ou boire un verre, mais pas toute seule ?<br />
                            <strong>C'est très simple, suis ces 2 étapes :</strong>
                        </p>

                        <div className="space-y-4 bg-purple-50 p-6 rounded-2xl">
                            <div className="flex gap-4">
                                <span className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">1</span>
                                <div>
                                    <h4 className="font-bold text-gray-900">Crée la sortie sur l'Application (Le QG)</h4>
                                    <p>Va dans l'onglet <Link to="/community-space" className="text-purple-700 underline font-bold">Le QG</Link>, choisis ton groupe (ex: Paris) et clique sur <strong>"Proposer une sortie"</strong>. Remplis les infos (Lieu, Date, Heure).</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <span className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">2</span>
                                <div>
                                    <h4 className="font-bold text-gray-900">Partage-la sur WhatsApp</h4>
                                    <p>Une fois créée sur l'app, copie le lien et partage-le dans la conversation WhatsApp <strong>Thématique</strong> correspondante (ex: "On va bouger" pour du sport) pour prévenir les copines !</p>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm italic text-gray-500 bg-white p-3 rounded-lg border">
                            ⚠️ <strong>Important :</strong> On crée toujours la sortie sur l'App d'abord. Cela permet aux nouvelles d'avoir toutes les infos claires et d'éviter que l'info ne se perde dans le flux de messages WhatsApp.
                        </p>
                    </div>
                </section>

                {/* 3. MON COMPTE */}
                <section className="bg-white rounded-3xl shadow-lg p-6 md:p-10 border border-gray-100">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 bg-blue-100 rounded-2xl text-blue-600">
                            <Settings className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                            3. Gérer mon Compte
                        </h2>
                    </div>

                    <div className="pl-0 md:pl-4 space-y-6 text-lg leading-relaxed text-gray-600">
                        <p>
                            Ton espace personnel est accessible en cliquant sur ton Prénom (ou le petit bonhomme) en haut à droite.
                        </p>

                        <div className="space-y-4">
                            <details className="group bg-gray-50 rounded-xl p-4 cursor-pointer">
                                <summary className="font-bold text-gray-900 list-none flex justify-between items-center">
                                    <span>👤 Mes informations personnelles</span>
                                    <span className="text-primary group-open:rotate-180 transition-transform">▼</span>
                                </summary>
                                <p className="mt-4 text-base">
                                    C'est ici que tu peux modifier ton <strong>numéro de téléphone</strong>, ta date d'anniversaire (pour les surprises !) ou ta photo de profil. C'est important que ce soit à jour pour qu'on puisse te joindre si besoin.
                                </p>
                            </details>

                            <details className="group bg-gray-50 rounded-xl p-4 cursor-pointer">
                                <summary className="font-bold text-gray-900 list-none flex justify-between items-center">
                                    <span>💳 Mon abonnement & Factures</span>
                                    <span className="text-primary group-open:rotate-180 transition-transform">▼</span>
                                </summary>
                                <p className="mt-4 text-base">
                                    Tu peux voir si tu es "Active" ou "VIP".<br />
                                    Pour télécharger tes factures ou modifier ta carte bancaire, il y a un bouton <strong>"Gérer mon abonnement"</strong> qui t'emmène sur ton espace sécurisé Stripe.
                                </p>
                            </details>

                            <details className="group bg-gray-50 rounded-xl p-4 cursor-pointer">
                                <summary className="font-bold text-gray-900 list-none flex justify-between items-center">
                                    <span>😢 Comment annuler mon abonnement ?</span>
                                    <span className="text-primary group-open:rotate-180 transition-transform">▼</span>
                                </summary>
                                <div className="mt-4 text-base space-y-2">
                                    <p>On serait tristes de te voir partir, mais c'est très simple et sans engagement.</p>
                                    <ol className="list-decimal list-inside ml-2">
                                        <li>Va dans "Mon Compte".</li>
                                        <li>Clique sur "Gérer mon abonnement".</li>
                                        <li>Clique sur "Annuler le plan".</li>
                                    </ol>
                                    <p>L'accès s'arrêtera à la fin de la période payée (fin du mois ou de l'année en cours).</p>
                                </div>
                            </details>
                        </div>
                    </div>
                </section>

                {/* 4. ACHATS & OFFRES */}
                <section className="bg-white rounded-3xl shadow-lg p-6 md:p-10 border border-gray-100">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 bg-yellow-100 rounded-2xl text-yellow-600">
                            <Gift className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                            4. Les Achats & Kiffs
                        </h2>
                    </div>

                    <div className="pl-0 md:pl-4 space-y-6 text-lg leading-relaxed text-gray-600">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-bold text-gray-900 mb-2">🎁 Comment utiliser une offre ?</h3>
                                <p className="text-base mb-2">
                                    Sur la page <Link to="/tous-les-kiffs" className="text-primary underline">Tous les Kiffs</Link>, tu verras plein d'avantages.
                                </p>
                                <ul className="list-disc list-inside text-sm space-y-1">
                                    <li><strong>Code Promo :</strong> Copie le code et colle-le sur le site du partenaire.</li>
                                    <li><strong>Lien secret :</strong> Clique pour accéder à une vente privée.</li>
                                    <li><strong>Produit Digital :</strong> E-books et guides dispo dans "Mes Réservations".</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 mb-2">🛡️ Conditions & Sécurité</h3>
                                <p className="text-base mb-2">
                                    Tous les paiements sur le site sont 100% sécurisés par Stripe.
                                </p>
                                <p className="text-sm">
                                    Annulation jusqu'à 48h avant pour la plupart des événements (voir fiche offre).
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 5. MON ARDOISE */}
                <section className="bg-white rounded-3xl shadow-lg p-6 md:p-10 border border-gray-100">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 bg-indigo-100 rounded-2xl text-indigo-600">
                            <CreditCard className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                            5. Payer avec "Mon Ardoise"
                        </h2>
                    </div>

                    <div className="pl-0 md:pl-4 space-y-6 text-lg leading-relaxed text-gray-600">
                        <p>
                            Certains partenaires proposent des <strong>Packs Ardoise</strong> (ex: achète 40€, dépense 50€). C'est le moyen le plus malin de payer ta consommation !
                        </p>

                        <div className="space-y-4 bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                            <div className="flex gap-4">
                                <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">1</span>
                                <div>
                                    <h4 className="font-bold text-gray-900">Achète un Pack</h4>
                                    <p className="text-sm">Prends le Pack Ardoise de ton lieu préféré sur l'appli. Ton solde (crédité du bonus) apparaît immédiatement dans "Mon Compte &gt; Mon Ardoise".</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">2</span>
                                <div>
                                    <h4 className="font-bold text-gray-900">Savoure l'instant</h4>
                                    <p className="text-sm">Profite de ton moment, sans te soucier de l'addition pour l'instant.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">3</span>
                                <div>
                                    <h4 className="font-bold text-gray-900">Valide sur place</h4>
                                    <p className="text-sm">Au moment de partir, ouvre ton appli, va dans <strong>Mon Ardoise</strong>, clique sur le lieu et entre le montant exact à payer. Montre <strong>l'Écran Vert ✅</strong> au serveur. C'est réglé !</p>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm italic text-gray-500">
                            * Les crédits Ardoise sont valables <strong>6 mois</strong> à partir de la date d'achat.
                        </p>
                    </div>
                </section>

                {/* BESOIN D'AIDE */}
                <section className="text-center py-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Encore une question ?</h2>
                    <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                        Il n'y a pas de question bête ! Que ce soit pour un souci technique ou juste pour dire bonjour, écris-nous à :
                    </p>

                    <div className="bg-white inline-flex flex-col items-center p-6 rounded-2xl shadow-md border border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-xl md:text-2xl font-bold text-primary select-all">contact@nowme.fr</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                            (Tu peux copier l'adresse et nous écrire depuis ta boîte mail habituelle)
                        </p>
                        <a
                            href="mailto:contact@nowme.fr"
                            className="inline-flex items-center px-6 py-2 bg-gray-100 text-gray-700 rounded-full font-medium text-sm hover:bg-gray-200 transition-colors"
                        >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Ou clique ici pour ouvrir ta messagerie
                        </a>
                    </div>
                </section>

                <div className="text-center pb-8">
                    <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm underline">
                        Retour à l'accueil
                    </Link>
                </div>

            </div>
        </div>
    );
}
