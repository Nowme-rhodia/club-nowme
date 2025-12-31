import React from 'react';
import { SEO } from '../../components/SEO';

export default function CGV() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <SEO title="Conditions Générales de Vente" description="CGV et CGU de la plateforme Nowme" />

            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm p-8 sm:p-12">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Conditions Générales de Vente et d'Utilisation (CGV/CGU)</h1>

                <div className="prose prose-pink max-w-none text-gray-600">
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 text-sm">
                        <strong>Note importante :</strong> NOWME intervient en qualité d'opérateur de plateforme et de mandataire de facturation. Nous ne sommes pas le vendeur final des prestations proposées par nos Partenaires.
                    </div>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">1. Objet</h2>
                        <p>
                            Les présentes Conditions Générales régissent l'accès et l'utilisation de la plateforme NOWME (le "Site"), ainsi que la souscription à l'abonnement "Le Club" et la réservation de prestations auprès de Partenaires tiers.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">2. L'Abonnement "Le Club"</h2>
                        <p>
                            NOWME propose un service d'abonnement mensuel ou annuel donnant accès à des tarifs préférentiels et des contenus exclusifs. Cet abonnement est un service vendu directement par NOWME à l'Utilisateur.
                        </p>
                        <ul className="list-disc pl-5 space-y-2 mt-2">
                            <li><strong>Prix :</strong> Indiqué toutes taxes comprises (TTC) sur le site.</li>
                            <li><strong>Renouvellement :</strong> Tacite reconduction sauf résiliation via l'espace membre avant l'échéance.</li>
                            <li><strong>Rétractation :</strong> Conformément à la loi, vous disposez de 14 jours pour vous rétracter, sauf si vous avez commencé à utiliser les services (accès au contenu ou réservation avec réduction) avant la fin de ce délai.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">3. Réservation de Prestations via la Marketplace</h2>
                        <h3 className="font-bold text-gray-800 mt-4 mb-2">3.1. Rôle de NOWME (Mandataire)</h3>
                        <p>
                            Pour la vente de prestations de services (ateliers, coachings, etc.), NOWME agit en tant qu'<strong>intermédiaire technique et mandataire de facturation</strong> ("Billing Agent") au nom et pour le compte des Partenaires (les "Vendeurs").
                        </p>
                        <p className="mt-2">
                            En conséquence :
                        </p>
                        <ul className="list-disc pl-5 space-y-2 mt-2">
                            <li>Le contrat de vente de la prestation est conclu directement entre l'Utilisateur et le Partenaire.</li>
                            <li>La facture est émise par NOWME au nom et pour le compte du Partenaire.</li>
                            <li>La responsabilité de la bonne exécution de la prestation incombe exclusivement au Partenaire.</li>
                        </ul>

                        <h3 className="font-bold text-gray-800 mt-4 mb-2">3.2. Paiement et Facturation</h3>
                        <p>
                            Le paiement est réalisé via la plateforme sécurisée Stripe. NOWME encaisse les fonds au nom du Partenaire via un mandat d'encaissement.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">4. Annulation et Remboursement</h2>
                        <p>
                            Les conditions d'annulation des prestations sont fixées par chaque Partenaire et précisées lors de la commande. Sauf mention contraire :
                        </p>
                        <ul className="list-disc pl-5 space-y-2 mt-2">
                            <li>Toute réservation est ferme et définitive.</li>
                            <li>En cas d'annulation par le Partenaire, l'Utilisateur sera intégralement remboursé.</li>
                            <li>Le droit de rétractation ne s'applique généralement pas aux prestations de services de loisirs fournis à une date déterminée (art. L221-28 du Code de la consommation).</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">5. Responsabilité</h2>
                        <p>
                            NOWME ne saurait être tenu responsable de l'inexécution ou de la mauvaise exécution des prestations fournies par les Partenaires, ces derniers agissant sous leur seule responsabilité professionnelle.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">6. Espace Communauté et Règles de Conduite</h2>
                        <p>
                            L'abonnement "Le Club" donne accès à un espace communautaire (Mur des Kiffs, Boîte à Idées). En publiant du contenu, l'Utilisateur s'engage à respecter les règles de bienséance et de courtoisie.
                        </p>
                        <p className="mt-2">
                            Sont strictement interdits : les propos injurieux, diffamatoires, racistes, ou contraires aux bonnes mœurs. NOWME se réserve le droit de supprimer tout contenu illicite et de suspendre le compte de l'auteur en cas de récidive, sans remboursement.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">7. Propriété Intellectuelle</h2>
                        <p>
                            Tous les éléments du Site (textes, images, logos) sont la propriété exclusive de NOWME ou de ses Partenaires. Toute reproduction est interdite sans autorisation.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
