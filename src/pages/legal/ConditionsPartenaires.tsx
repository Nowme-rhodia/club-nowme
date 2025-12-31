import React from 'react';
import { SEO } from '../../components/SEO';

export default function ConditionsPartenaires() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <SEO title="Conditions Partenaires" description="Conditions générales de partenariat et mandat de facturation" />

            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm p-8 sm:p-12">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Conditions Générales de Partenariat & Mandat de Facturation</h1>

                <div className="prose prose-pink max-w-none text-gray-600">
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8 text-sm">
                        <strong>Objet :</strong> Ce document régit les relations entre NOWME SAS ("Le Mandataire") et le Partenaire ("Le Mandant") souhaitant proposer ses offres sur la plateforme Club Nowme.
                    </div>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">1. Mandat de Facturation et d'Encaissement</h2>
                        <p>
                            Par l'acceptation des présentes conditions lors de son inscription, le Partenaire donne expressément <strong>MANDAT</strong> à la société NOWME SAS (SIREN 933 108 011) pour :
                        </p>
                        <ul className="list-disc pl-5 space-y-2 mt-2">
                            <li><strong>Émettre des factures</strong> en son nom et pour son compte auprès des clients finaux (les "Abonnées").</li>
                            <li><strong>Encaisser les sommes</strong> relatives à la vente de ses prestations via le prestataire de paiement sécurisé Stripe.</li>
                        </ul>
                        <p className="mt-2 text-sm italic">
                            Conformément à l'article 289 I du Code Général des Impôts, le Partenaire (Mandant) conserve l'entière responsabilité de ses obligations en matière de facturation et de TVA. Il s'engage à verser au Trésor la taxe mentionnée sur les factures émises en son nom.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">2. Obligations du Partenaire</h2>
                        <p>Le Partenaire s'engage à :</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Fournir toutes les informations légales nécessaires à l'établissement des factures (SIREN, Adresse, n° TVA si applicable).</li>
                            <li>Honorer les prestations réservées par les Abonnées aux conditions tarifaires indiquées sur la Plateforme.</li>
                            <li>Informer NOWME sans délai de toute modification de son statut juridique ou fiscal.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">3. Commission et Reversement</h2>
                        <p>
                            En contrepartie de la mise en relation et de la gestion technique :
                        </p>
                        <ul className="list-disc pl-5 space-y-2 mt-2">
                            <li>NOWME prélève une commission de <strong>[X]% HT</strong> sur le montant total de chaque transaction réalisée via la plateforme.</li>
                            <li>Le solde est reversé au Partenaire selon les délais de virement du prestataire de paiement Stripe (généralement J+3 à J+7).</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">4. Durée et Résiliation</h2>
                        <p>
                            Le présent mandat est conclu pour une durée indéterminée. Il peut être dénoncé à tout moment par l'une ou l'autre des parties par écrit (email ou courrier), entraînant la fermeture du compte Partenaire.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
