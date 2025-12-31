import React from 'react';
import { SEO } from '../../components/SEO';

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <SEO title="Politique de Confidentialité" description="Gestion de vos données personnelles sur Nowme" />

            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm p-8 sm:p-12">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Politique de Confidentialité</h1>

                <div className="prose prose-pink max-w-none text-gray-600">
                    <p className="mb-6">
                        La protection de vos données personnelles est une priorité pour NOWME. Cette politique détaille comment nous collectons, utilisons et protégeons vos informations.
                    </p>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">1. Données Collectées</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Données d'identification :</strong> Nom, prénom, email, téléphone (pour la gestion du compte et des réservations).</li>
                            <li><strong>Données de transaction :</strong> Historique des achats, factures (les données bancaires sont traitées exclusivement par notre prestataire sécurisé Stripe).</li>
                            <li><strong>Données techniques :</strong> Logs de connexion, adresse IP (pour la sécurité).</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">2. Finalités du Traitement</h2>
                        <p>Nous utilisons vos données pour :</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Assurer la gestion de votre abonnement "Le Club".</li>
                            <li>Traiter vos réservations auprès de nos Partenaires.</li>
                            <li>Vous envoyer vos confirmations et factures.</li>
                            <li>Améliorer nos services et personnaliser votre expérience.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">3. Partage des Données</h2>
                        <p>
                            Vos données sont strictement confidentielles. Seules les données nécessaires à l'exécution d'une prestation (Nom, Prénom, Email, Téléphone) sont transmises au <strong>Partenaire concerné</strong> lorsque vous effectuez une réservation. Nos Partenaires s'engagent également à respecter le RGPD.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">4. Vos Droits</h2>
                        <p>
                            Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement et de portabilité de vos données. Pour exercer ces droits, contactez-nous à : <strong>contact@nowme.fr</strong>.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
