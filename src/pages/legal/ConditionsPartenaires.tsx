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
                        <strong>Objet :</strong> Les présentes conditions régissent la relation contractuelle entre <strong>NOWME SAS</strong> (ci-après "la Plateforme" ou "le Mandataire"), société par actions simplifiée au capital de 1 000 euros, immatriculée au RCS de Nanterre sous le numéro 933 108 011, et tout professionnel (ci-après "le Partenaire" ou "le Mandant") proposant ses services via la plateforme Club Nowme.
                    </div>

                    <p className="text-sm text-gray-500 mb-8 italic">Dernière mise à jour : 05 Janvier 2026</p>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">1. Acceptation et Objet</h2>
                        <p>
                            L'inscription sur la Plateforme en tant que Partenaire vaut acceptation pleine et entière des présentes Conditions Générales de Partenariat (CGP).
                            Le Partenaire autorise NOWME SAS à commercialiser ses offres auprès de sa communauté d'abonnés et à agir en tant qu'intermédiaire technique et financier.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">2. Mandat de Facturation (Auto-billing)</h2>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <p className="mb-2"><strong>DÉCLARATION DE MANDAT</strong></p>
                            <p>
                                Le Partenaire (Mandant) accepte expressément de confier à NOWME SAS (Mandataire) l'établissement de ses factures.
                                En conséquence, le Partenaire donne mandat à NOWME SAS d'émettre en son nom et pour son compte les factures originales relatives aux ventes réalisées via la Plateforme.
                            </p>
                        </div>
                        <p className="mt-4"><strong>Obligations du Partenaire (Mandant) :</strong></p>
                        <ul className="list-disc pl-5 space-y-2 mt-2">
                            <li>Fournir toutes les informations complètes et exactes nécessaires à la facturation (Identité, SIREN, Adresse, Numéro de TVA Intracommunautaire si assujetti).</li>
                            <li>Signaler immédiatement tout changement de statut (cessation d'activité, changement de régime fiscal).</li>
                            <li><strong>Verser au Trésor Public la TVA</strong> mentionnée sur les factures émises en son nom (si applicable à son régime).</li>
                            <li>Reconnaître que le mandat ne l'exonère pas de ses obligations fiscales personnelles.</li>
                            <li>Conserver un double de toutes les factures émises par la Plateforme.</li>
                        </ul>
                        <p className="mt-4"><strong>Obligations de NOWME SAS (Mandataire) :</strong></p>
                        <ul className="list-disc pl-5 space-y-2 mt-2">
                            <li>Émettre des factures conformes aux mentions légales en vigueur (Article 242 nonies A du CGI).</li>
                            <li>Indiquer sur les factures la mention : <em>"Facture émise par NOWME SAS au nom et pour le compte de [Nom du Partenaire]"</em>.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">3. Conditions Financières</h2>
                        <h3 className="font-bold text-gray-800 mt-4 mb-2">3.1. Commission</h3>
                        <p>
                            En rémunération de ses services (mise en relation, hébergement technique, frais de transaction), NOWME SAS prélève une commission sur chaque transaction.
                            Le taux de commission est indiqué lors de la création de l'offre et est accepté par le Partenaire avant publication.
                        </p>
                        <h3 className="font-bold text-gray-800 mt-4 mb-2">3.2. Modalités de paiement</h3>
                        <p>
                            Les fonds sont encaissés par le prestataire de paiement sécurisé <strong>Stripe</strong>.
                            Le "Montant Net" (Prix de vente - Commission Plateforme) est reversé automatiquement sur le compte bancaire du Partenaire selon les délais standards de Stripe (généralement J+3 à J+7 ouvrés après la transaction).
                        </p>

                        <h3 className="font-bold text-gray-800 mt-4 mb-2">3.3. Cas Spécifique : Packs "Mon Ardoise"</h3>
                        <p>
                            Pour les offres de type "Pack Crédit" ou "Ardoise", les fonds sont cantonnés par NOWME SAS.
                        </p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li><strong>Déclenchement du paiement :</strong> Le versement au Partenaire est déclenché par l'action de "Débit" (Consommation) effectuée par l'Abonnée dans l'application.</li>
                            <li><strong>Montant versé :</strong> Le montant versé correspond à la valeur réelle de la consommation validée.</li>
                            <li><strong>Expiration :</strong> Les crédits non consommés expirent au bout de 6 mois. Les fonds expirés restent acquis à la Plateforme au titre des frais de gestion et de marketing, sauf accord spécifique contraire.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">4. Engagements Qualité</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Le Partenaire s'engage à accueillir les abonnées Club Nowme avec bienveillance et professionnalisme.</li>
                            <li>Les prestations fournies doivent être conformes à la description faite sur l'offre.</li>
                            <li>Le Partenaire s'engage à ne pas annuler de prestations confirmées sauf cas de force majeure avéré.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">5. Annulation et Litiges</h2>
                        <h3 className="font-bold text-gray-800 mt-4 mb-2">5.1. Annulation par le Partenaire</h3>
                        <p>
                            Toute annulation par le Partenaire doit être exceptionnelle. Le Partenaire doit en informer l'Abonnée et la Plateforme immédiatement.
                            En cas d'annulations abusives ou répétées, NOWME se réserve le droit de suspendre ou résilier le compte du Partenaire.
                        </p>
                        <h3 className="font-bold text-gray-800 mt-4 mb-2">5.2. Annulation par l'Abonnée</h3>
                        <p>
                            Les conditions d'annulation définies par le Partenaire sur son offre s'appliquent. Si l'annulation est éligible à un remboursement, la Plateforme procédera au remboursement via Stripe (débitant le compte du Partenaire du montant perçu).
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">6. Résiliation</h2>
                        <p>
                            Chaque partie peut mettre fin au partenariat à tout moment par notification écrite.
                            La résiliation entraîne la désactivation immédiate des offres. Cependant, les réservations déjà confirmées devront être honorées par le Partenaire, et les commissions dues resteront acquises à la Plateforme.
                        </p>
                    </section>

                    <section className="mb-8 bg-gray-50 p-6 rounded-lg">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Besoin d'aide ?</h2>
                        <p>
                            Pour toute question relative à ces conditions ou à votre facturation, contactez notre service administratif :
                            <br />
                            <a href="mailto:compta@nowme.fr" className="text-primary font-bold hover:underline">compta@nowme.fr</a>
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
