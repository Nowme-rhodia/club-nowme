import React from 'react';
import { SEO } from '../../components/SEO';

export default function MentionsLegales() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <SEO title="Mentions Légales" description="Mentions légales de la plateforme Nowme" />

            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm p-8 sm:p-12">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Mentions Légales</h1>

                <div className="prose prose-pink max-w-none text-gray-600">
                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">1. Éditeur du Site</h2>
                        <p>
                            Le site <strong>club.nowme.fr</strong> est édité par la société <strong>NOWME</strong>.<br />
                            <strong>Forme juridique :</strong> SAS (Société par Actions Simplifiée)<br />
                            <strong>Capital social :</strong> 300 €<br />
                            <strong>Siège social :</strong> 59 RUE du Ponthieu, Bureau 326, 75008 Paris, FRANCE<br />
                            <strong>SIREN :</strong> 933 108 011<br />
                            <strong>RCS :</strong> 933 108 011 R.C.S. Paris<br />
                            <strong>Numéro de TVA Intracommunautaire :</strong> Non assujetti / En cours<br />
                            <strong>Directeur de la publication :</strong> Rhodia KWEMO<br />
                            <strong>Contact :</strong> contact@nowme.fr / 07 69 25 04 29
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">2. Hébergement</h2>
                        <p>
                            Le site est hébergé par :<br />
                            <strong>Supabase / Vercel (ou autre)</strong><br />
                            [Adresse de l'hébergeur]<br />
                            [Site web de l'hébergeur]
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">3. Activité Réglementée</h2>
                        <p>
                            Dans le cadre de son activité de mise en relation et de mandataire de facturation ("Billing Agent") pour le compte de ses Partenaires, NOWME agit en conformité avec la réglementation applicable aux opérateurs de plateforme en ligne et aux intermédiaires de paiement (si applicable via Stripe Connect).
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">4. Propriété Intellectuelle</h2>
                        <p>
                            L'ensemble de ce site relève de la législation française et internationale sur le droit d'auteur et la propriété intellectuelle. Tous les droits de reproduction sont réservés, y compris pour les documents téléchargeables et les représentations iconographiques et photographiques.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
