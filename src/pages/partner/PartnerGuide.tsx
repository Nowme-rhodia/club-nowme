
import React from 'react';
import {
    Briefcase,
    Calendar,
    CreditCard,
    HelpCircle,
    User,
    CheckCircle2,
    AlertCircle,
    Image,
    MapPin,
    Clock,
    DollarSign
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PartnerGuide() {
    return (
        <div className="bg-white min-h-[calc(100vh-4rem)] pb-20">
            {/* Hero */}
            <div className="bg-primary pt-12 pb-16 px-6 text-center rounded-b-3xl shadow-soft mb-12">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                    Guide Partenaire Club Nowme 🚀
                </h1>
                <p className="text-white/90 text-lg max-w-2xl mx-auto">
                    Tout ce que tu dois savoir pour réussir ton partenariat, gérer tes offres et booster ton chiffre d'affaires avec la communauté.
                </p>
            </div>

            <div className="max-w-5xl mx-auto px-4 space-y-16">

                {/* 1. MON PROFIL & VISIBILITÉ */}
                <section>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                            <User className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                            1. Ton Profil & Ta Visibilité
                        </h2>
                    </div>
                    <div className="pl-0 md:pl-4 space-y-4 text-gray-600 leading-relaxed">
                        <p>
                            Ton profil est ta carte de visite. C'est la première chose que les abonnées voient.
                            Un profil complet inspire confiance et augmente tes réservations.
                        </p>
                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                                À vérifier absolument :
                            </h3>
                            <ul className="space-y-2 list-disc list-inside">
                                <li><strong>Photo de profil :</strong> Mets ton logo ou une photo de toi (souriante !).</li>
                                <li><strong>Adresse & Contact :</strong> Vérifie que ton numéro et adresse sont à jour pour qu'on puisse te trouver.</li>
                                <li><strong>Liens réseaux sociaux :</strong> Ajoute ton Instagram pour que les filles puissent voir ton univers.</li>
                            </ul>
                            <div className="mt-4">
                                <Link to="/partner/settings/general" className="text-blue-700 font-semibold hover:underline">
                                    👉 Mettre à jour mon profil maintenant
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. CRÉER UNE OFFRE */}
                <section>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-purple-100 rounded-xl text-purple-600">
                            <Briefcase className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                            2. Créer une Offre Irrésistible
                        </h2>
                    </div>
                    <div className="pl-0 md:pl-4 space-y-6 text-gray-600 leading-relaxed">
                        <p>
                            Pour ajouter une prestation, va dans l'onglet <strong>"Mes Offres"</strong> et clique sur <strong>"Nouvelle Offre"</strong>.
                        </p>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-gray-50 p-5 rounded-2xl">
                                <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                    <Image className="w-5 h-5 text-purple-500" />
                                    Les Visuels
                                </h4>
                                <p className="text-sm">
                                    Utilise des photos lumineuses et de haute qualité. Une belle photo augmente le taux de clic de <strong>40%</strong> ! Évite les images floues ou trop sombres.
                                </p>
                            </div>
                            <div className="bg-gray-50 p-5 rounded-2xl">
                                <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-purple-500" />
                                    La Description
                                </h4>
                                <p className="text-sm">
                                    Sois précise : durée, déroulement, tenue conseillée... Utilise le "Tu" pour parler directement à l'abonnée. Fais rêver !
                                </p>
                            </div>
                        </div>

                        <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-100">
                            <h3 className="font-bold text-gray-900 mb-3 text-lg">
                                🚦 Comprendre les statuts
                            </h3>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3">
                                    <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs font-bold mt-1">BROUILLON</span>
                                    <span>Ton offre est sauvegardée mais visible <strong>uniquement par toi</strong>. Prends le temps de la peaufiner.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold mt-1">PRÊTE</span>
                                    <span>Tu as fini la rédaction. Tu peux maintenant cliquer sur <strong>"Soumettre"</strong> pour l'envoyer à l'équipe Nowme.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-bold mt-1">EN VALIDATION</span>
                                    <span>L'équipe Nowme relit ton offre (orthographe, qualité, conformité). On te répond sous 24h/48h.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold mt-1">APPROUVÉE</span>
                                    <span>Félicitations ! Ton offre est en ligne et visible par toutes les abonnées.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* 3. GESTION DES RÉSERVATIONS */}
                <section>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-green-100 rounded-xl text-green-600">
                            <Calendar className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                            3. Gérer tes Réservations
                        </h2>
                    </div>
                    <div className="pl-0 md:pl-4 space-y-6 text-gray-600 leading-relaxed">
                        <p>
                            Tu as deux façons principales de gérer tes créneaux sur Club Nowme :
                        </p>

                        <div className="space-y-4">
                            <div className="border border-green-200 rounded-xl p-5 hover:bg-green-50/50 transition-colors">
                                <h3 className="font-bold text-gray-900 text-lg mb-2">📅 Option 1 : Via Calendly (Recommandé)</h3>
                                <p className="mb-3">
                                    Idéal si tu as des horaires flexibles. Connecte ton lien Calendly dans l'offre.
                                </p>
                                <ul className="list-disc list-inside text-sm space-y-1">
                                    <li>L'abonnée réserve son créneau directement sur ton calendrier.</li>
                                    <li>Elle paie ensuite sur Club Nowme pour valider.</li>
                                    <li>Tu reçois une confirmation par email automatique.</li>
                                </ul>
                            </div>

                            <div className="border border-green-200 rounded-xl p-5 hover:bg-green-50/50 transition-colors">
                                <h3 className="font-bold text-gray-900 text-lg mb-2">🎟️ Option 2 : Date Fixe (Événement)</h3>
                                <p className="mb-3">
                                    Idéal pour un atelier ponctuel (ex: "Samedi 12 Juin à 14h").
                                </p>
                                <ul className="list-disc list-inside text-sm space-y-1">
                                    <li>Tu définis la date et l'heure précise dans l'offre.</li>
                                    <li>Tu gères le stock (nombre de places) via les variantes.</li>
                                    <li>Une fois complet, l'offre affiche "Épuisé".</li>
                                </ul>
                            </div>
                        </div>

                        <div className="bg-red-50 p-4 rounded-xl border border-red-100 mt-4 flex gap-3">
                            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                            <div>
                                <h4 className="font-bold text-red-900 text-sm">Politique d'annulation</h4>
                                <p className="text-sm text-red-800 mt-1">
                                    Si TU dois annuler : préviens l'abonnée le plus tôt possible et propose un autre créneau.
                                    Si l'ABONNÉE annule : voir les conditions d'annulation définies dans ton offre (généralement non-remboursable à moins de 48h).
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 5. LE PACK ARDOISE & PAIEMENTS SUR PLACE */}
                <section>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
                            <CreditCard className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                            5. Les Packs Ardoise & Paiements
                        </h2>
                    </div>
                    <div className="pl-0 md:pl-4 space-y-6 text-gray-600 leading-relaxed">
                        <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 p-6 rounded-2xl">
                            <h3 className="font-bold text-gray-900 text-lg mb-3">💡 Qu'est-ce qu'un Pack Ardoise ?</h3>
                            <p className="mb-3">
                                C'est une offre spéciale qui permet à l'abonnée d'acheter un crédit à dépenser chez toi (ex: "Payez 40€, dépensez 50€").
                            </p>
                            <ul className="list-disc pl-5 mt-2 space-y-2 text-sm">
                                <li><strong>Comment ça marche ?</strong> L'abonnée achète le pack sur l'appli. L'argent est sécurisé chez NowMe.</li>
                                <li><strong>Validité :</strong> Les crédits sont valables 6 mois.</li>
                                <li><strong>Paiement :</strong> Tu es payée uniquement lors de la <strong>consommation réelle</strong> par la cliente.</li>
                            </ul>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-bold text-gray-900 mb-3">✅ Comment encaisser une cliente ?</h4>
                                <ol className="list-decimal pl-5 space-y-2 text-sm">
                                    <li>La cliente vient dans ton établissement.</li>
                                    <li>Au moment de payer, elle ouvre son appli <strong>Mon Ardoise</strong>.</li>
                                    <li>Elle saisit le montant de l'addition et valide devant toi.</li>
                                    <li>Un <strong>Écran Vert de Validation</strong> apparaît instantanément.</li>
                                    <li>C'est bon ! La somme est ajoutée à ton solde à reverser.</li>
                                </ol>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 mb-3">📅 Quand reçois-je l'argent ?</h4>
                                <p className="text-sm mb-3">
                                    Nous utilisons <strong>Stripe Connect</strong>.
                                </p>
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                    <li><strong>Achats directs :</strong> Tu reçois l'argent (moins comm.) quelques jours après l'achat.</li>
                                    <li><strong>Packs Ardoise :</strong> Tu reçois l'argent (moins comm.) quelques jours après le <strong>passage en caisse (écran vert)</strong> de la cliente.</li>
                                </ul>
                                <p className="text-xs text-gray-500 mt-2 italic">
                                    Les virements vers ton compte bancaire sont automatiques (selon ton paramétrage Stripe).
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section className="pt-8 border-t border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Foire Aux Questions</h2>
                    <div className="space-y-4 max-w-3xl mx-auto">
                        <details className="group bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer">
                            <summary className="font-semibold text-gray-900 list-none flex justify-between items-center">
                                <span>Que faire si l'écran vert n'apparaît pas ?</span>
                                <span className="text-primary group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <p className="mt-3 text-gray-600">
                                Vérifie que la cliente a bien du réseau. Si le problème persiste, note son nom et le montant, et contacte-nous. Ne la laisse pas partir sans paiement ou validation.
                            </p>
                        </details>

                        <details className="group bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer">
                            <summary className="font-semibold text-gray-900 list-none flex justify-between items-center">
                                <span>Puis-je modifier une offre après publication ?</span>
                                <span className="text-primary group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <p className="mt-3 text-gray-600">
                                Oui, mais toute modification sur une offre "Active" ou "Approuvée" la repassera temporairement en statut <strong>"En validation"</strong> par sécurité. Cela permet de vérifier que les changements respectent nos standards.
                            </p>
                        </details>

                        <details className="group bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer">
                            <summary className="font-semibold text-gray-900 list-none flex justify-between items-center">
                                <span>Combien coûte le partenariat ?</span>
                                <span className="text-primary group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <p className="mt-3 text-gray-600">
                                L'inscription est gratuite ! Nous prélevons uniquement une commission de fonctionnement sur les ventes réalisées. Si tu ne vends rien, tu ne paies rien. C'est gagnant-gagnant.
                            </p>
                        </details>

                        <details className="group bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer">
                            <summary className="font-semibold text-gray-900 list-none flex justify-between items-center">
                                <span>J'ai un problème technique, qui contacter ?</span>
                                <span className="text-primary group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <p className="mt-3 text-gray-600">
                                Tu peux contacter l'équipe support directement par email à <strong>contact@nowme.fr</strong> ou via le chat WhatsApp administrateur.
                            </p>
                        </details>
                    </div>
                </section>

                <div className="mt-16 text-center">
                    <Link to="/partner/offers" className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-full font-bold shadow-lg hover:bg-primary-dark transition-transform hover:-translate-y-1">
                        C'est parti ! Je crée mon offre 🚀
                    </Link>
                </div>
            </div>
        </div>
    );
}
