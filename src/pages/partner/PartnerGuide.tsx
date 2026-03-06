
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
    DollarSign,
    Gift
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
                    Tout ce qu'il faut savoir pour réussir votre partenariat, gérer vos offres et booster votre chiffre d'affaires avec la communauté.
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
                            1. Votre Profil & Votre Visibilité
                        </h2>
                    </div>
                    <div className="pl-0 md:pl-4 space-y-4 text-gray-600 leading-relaxed">
                        <p>
                            Votre profil est votre carte de visite. C'est la première chose que les abonnées voient.
                            Un profil complet inspire confiance et augmente vos réservations.
                        </p>
                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                                À vérifier absolument :
                            </h3>
                            <ul className="space-y-2 list-disc list-inside">
                                <li><strong>Photo de profil :</strong> Mettez votre logo ou une photo de vous (accueillante !).</li>
                                <li><strong>Adresse & Contact :</strong> Vérifiez que votre numéro et adresse sont à jour pour faciliter la localisation.</li>
                                <li><strong>Liens réseaux sociaux :</strong> Ajoutez votre Instagram pour partager votre univers avec les membres.</li>
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
                            Pour ajouter une prestation, rendez-vous dans l'onglet <strong>"Mes Offres"</strong> et cliquez sur <strong>"Nouvelle Offre"</strong>.
                        </p>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-gray-50 p-5 rounded-2xl">
                                <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                    <Image className="w-5 h-5 text-purple-500" />
                                    Les Visuels
                                </h4>
                                <p className="text-sm">
                                    Utilisez des photos lumineuses et de haute qualité. Une belle photo augmente le taux de clic de <strong>40%</strong> ! Évitez les images floues ou trop sombres.
                                </p>
                            </div>
                            <div className="bg-gray-50 p-5 rounded-2xl">
                                <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-purple-500" />
                                    La Description
                                </h4>
                                <p className="text-sm">
                                    Soyez précis(e) : durée, déroulement, tenue conseillée... Utilisez le "Tu" pour parler directement à l'abonnée dans la description est conseillé pour créer de la proximité, mais restez professionnel(le). Faites rêver !
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
                                    <span>Votre offre est sauvegardée mais visible <strong>uniquement par vous</strong>. Prenez le temps de la peaufiner.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold mt-1">PRÊTE</span>
                                    <span>Vous avez fini la rédaction. Vous pouvez maintenant cliquer sur <strong>"Soumettre"</strong> pour l'envoyer à l'équipe Nowme.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-bold mt-1">EN VALIDATION</span>
                                    <span>L'équipe Nowme relit votre offre (orthographe, qualité, conformité). Nous vous répondons sous 24h/48h.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold mt-1">APPROUVÉE</span>
                                    <span>Félicitations ! Votre offre est en ligne et visible par toutes les abonnées.</span>
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
                            3. Gérer vos Réservations
                        </h2>
                    </div>
                    <div className="pl-0 md:pl-4 space-y-6 text-gray-600 leading-relaxed">
                        <p>
                            Vous avez deux façons principales de gérer vos créneaux sur Club Nowme :
                        </p>

                        <div className="space-y-4">
                            <div className="border border-green-200 rounded-xl p-5 hover:bg-green-50/50 transition-colors">
                                <h3 className="font-bold text-gray-900 text-lg mb-2">🔗 Option 1 : Lien de Réservation Externe</h3>
                                <p className="mb-3">
                                    Idéal si vous avez votre propre système (Doctolib, Planity, Calendly, etc.). Ajoutez simplement votre lien dans l'offre.
                                </p>
                                <ul className="list-disc list-inside text-sm space-y-1">
                                    <li>L'abonnée réserve son créneau via votre lien habituel.</li>
                                    <li>Elle règle la prestation selon vos modalités ou via le Club si configuré.</li>
                                    <li>Simple et efficace si vous avez déjà un agenda bien rempli.</li>
                                </ul>
                            </div>

                            <div className="border border-green-200 rounded-xl p-5 hover:bg-green-50/50 transition-colors">
                                <h3 className="font-bold text-gray-900 text-lg mb-2">🎟️ Option 2 : Date Fixe (Événement)</h3>
                                <p className="mb-3">
                                    Idéal pour un atelier ponctuel ("Samedi 12 Juin à 14h") ou un événement de groupe.
                                </p>
                                <ul className="list-disc list-inside text-sm space-y-1">
                                    <li>Vous définissez la date et l'heure précise dans l'offre.</li>
                                    <li>Vous gérez le stock (nombre de places) via les variantes.</li>
                                    <li>Une fois complet, l'offre affiche "Épuisé".</li>
                                </ul>
                            </div>
                        </div>

                        <div className="bg-red-50 p-4 rounded-xl border border-red-100 mt-4 flex gap-3">
                            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                            <div>
                                <h4 className="font-bold text-red-900 text-sm">Politique d'annulation</h4>
                                <p className="text-sm text-red-800 mt-1">
                                    Si VOUS devez annuler : prévenez l'abonnée le plus tôt possible. Vous pouvez proposer un autre créneau ou <strong>lui attribuer un avoir</strong> (voir section 6) pour qu'elle puisse réserver une autre de vos prestations ultérieurement.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. AVIS & RÉPUTATION */}
                <section>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-yellow-100 rounded-xl text-yellow-600">
                            <HelpCircle className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                            4. Vos Avis & Votre Réputation
                        </h2>
                    </div>
                    <div className="pl-0 md:pl-4 space-y-6 text-gray-600 leading-relaxed">
                        <p>
                            Les avis sont cruciaux pour rassurer les futures clientes. Une offre avec des avis positifs est <strong>3x plus réservée</strong>.
                        </p>
                        <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-100">
                            <h3 className="font-bold text-gray-900 mb-3 text-lg">Comment avoir de bons avis ?</h3>
                            <ul className="space-y-3 list-disc list-inside">
                                <li><strong>Soignez l'accueil :</strong> Un sourire et une petite attention font la différence.</li>
                                <li><strong>Sollicitez-les :</strong> Après la prestation, n'hésitez pas à dire : "Si ça t'a plu, un petit avis sur le Club me ferait très plaisir !".</li>
                                <li><strong>Répondez :</strong> Prenez le temps de répondre aux avis (même les courts) pour montrer votre engagement.</li>
                            </ul>
                            <div className="mt-4">
                                <Link to="/partner/reviews" className="text-yellow-700 font-semibold hover:underline">
                                    👉 Voir mes avis
                                </Link>
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
                                C'est une offre spéciale qui permet à l'abonnée d'acheter un crédit à dépenser chez vous (ex: "Payez 40€, dépensez 50€").
                            </p>
                            <ul className="list-disc pl-5 mt-2 space-y-2 text-sm">
                                <li><strong>Comment ça marche ?</strong> L'abonnée achète le pack sur l'appli. L'argent est sécurisé chez NowMe.</li>
                                <li><strong>Validité :</strong> Chaque pack est valable 6 mois à partir de la date d'achat.</li>
                                <li><strong>Paiement :</strong> Vous êtes payé(e) uniquement lors de la <strong>consommation réelle</strong> par la cliente.</li>
                            </ul>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-bold text-gray-900 mb-3">✅ Comment encaisser une cliente ?</h4>
                                <ol className="list-decimal pl-5 space-y-2 text-sm">
                                    <li>La cliente se présente dans votre établissement.</li>
                                    <li>Au moment de payer, elle ouvre son appli <strong>Mon Ardoise</strong>.</li>
                                    <li>Elle saisit le montant de l'addition et valide devant vous.</li>
                                    <li>Un <strong>Écran Vert de Validation</strong> apparaît instantanément sur son téléphone.</li>
                                    <li>C'est validé ! La somme est déduite de son Ardoise et créditée sur votre compte.</li>
                                </ol>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 mb-3">📅 Quand reçois-je l'argent ?</h4>
                                <p className="text-sm mb-3">
                                    Nous utilisons <strong>Stripe Connect</strong> pour des virements sécurisés.
                                </p>
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                    <li><strong>Achats directs :</strong> Vous recevez l'argent (moins la commission) quelques jours après l'achat.</li>
                                    <li><strong>Packs Ardoise :</strong> Vous recevez l'argent (moins la commission) quelques jours après le <strong>passage en caisse (validation Ardoise)</strong>.</li>
                                </ul>
                                <p className="text-xs text-gray-500 mt-2 italic">
                                    Les virements vers votre compte bancaire sont effectués automatiquement par Stripe selon votre fréquence choisie (quotidienne, hebdo...).
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 6. LES AVOIRS PARTENAIRES */}
                <section>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-pink-100 rounded-xl text-primary">
                            <Gift className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                            6. Les Avoirs Partenaires 🎁
                        </h2>
                    </div>
                    <div className="pl-0 md:pl-4 space-y-6 text-gray-600 leading-relaxed">
                        <p>
                            Le système d'avoir vous permet de fidéliser une cliente ou de la dédommager (par exemple suite à un imprévu ou une annulation de votre part) sans passer par un remboursement bancaire complexe.
                        </p>

                        <div className="bg-pink-50 p-6 rounded-2xl border border-pink-100">
                            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-primary" />
                                Comment ça marche ?
                            </h3>
                            <ul className="space-y-3">
                                <li>
                                    <strong>Attribution :</strong> Allez dans <strong>"Mes Réservations"</strong>, sélectionnez la réservation de la cliente, et cliquez sur le bouton <strong>"Attribuer un avoir"</strong>.
                                </li>
                                <li>
                                    <strong>Utilisation :</strong> L'avoir est lié à VOTRE profil partenaire. La cliente pourra l'utiliser automatiquement lors de son prochain achat sur l'une de VOS offres.
                                </li>
                                <li>
                                    <strong>Visibilité :</strong> La cliente voit son solde d'avoir directement sur la page de vos offres au moment de payer.
                                </li>
                            </ul>
                        </div>

                        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                            <h4 className="font-bold text-gray-900 mb-2">Quand utiliser l'avoir ?</h4>
                            <p className="text-sm italic">
                                "Je dois annuler un atelier car je suis malade, j'attribue un avoir du montant de la place à mes clientes pour qu'elles puissent s'inscrire à la prochaine session ou choisir un autre de mes services sur le Club."
                            </p>
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
                                Vérifiez que la cliente a bien du réseau internet. Si le problème persiste, notez son nom, le montant et l'heure, et contactez-nous via WhatsApp ou email.
                            </p>
                        </details>

                        <details className="group bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer">
                            <summary className="font-semibold text-gray-900 list-none flex justify-between items-center">
                                <span>Puis-je modifier une offre après publication ?</span>
                                <span className="text-primary group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <p className="mt-3 text-gray-600">
                                Oui, allez dans "Mes Offres" et cliquez sur l'icône crayon. Attention, toute modification sur une offre "Active" devra être re-validée par l'équipe, ce qui la rendra temporairement indisponible.
                            </p>
                        </details>

                        <details className="group bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer">
                            <summary className="font-semibold text-gray-900 list-none flex justify-between items-center">
                                <span>Combien coûte le partenariat ?</span>
                                <span className="text-primary group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <p className="mt-3 text-gray-600">
                                L'inscription et la création d'offres sont 100% gratuites ! Nous prélevons uniquement une commission sur les encaissements réalisés via la plateforme. Zéro risque pour vous.
                            </p>
                        </details>

                        <details className="group bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer">
                            <summary className="font-semibold text-gray-900 list-none flex justify-between items-center">
                                <span>J'ai un problème technique, qui contacter ?</span>
                                <span className="text-primary group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <p className="mt-3 text-gray-600">
                                Vous pouvez contacter l'équipe support directement par email à <strong>contact@nowme.fr</strong>.
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
