import React from 'react';
import { SEO } from '../../components/SEO';
import { Shield, Lock, CreditCard, UserCheck, AlertTriangle } from 'lucide-react';

export default function ConditionsCreatorPartner() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <SEO
                title="Conditions Partenaires Créatrices - Club Nowme"
                description="Conditions générales d'utilisation pour le programme ambassadrices et créatrices de contenu."
            />

            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm p-8 sm:p-12 border border-gray-100">
                <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center">
                    <Shield className="w-8 h-8 text-primary mr-3" />
                    Conditions Générales de Partenariat Créatrices
                </h1>
                <p className="text-sm text-gray-500 mb-8 italic">Dernière mise à jour : 05 Mars 2026</p>

                <div className="prose prose-pink max-w-none text-gray-600 space-y-8">
                    <section className="bg-primary/5 p-6 rounded-xl border border-primary/10">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 mt-0">Introduction</h2>
                        <p>
                            Bienvenue dans le programme Partenaire Créatrice de **Nowme**. Les présentes conditions régissent votre participation à notre programme d'influence et de parrainage. En vous inscrivant, vous acceptez de devenir une ambassadrice de notre marque et de respecter les standards d'excellence du Club.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                            <UserCheck className="w-5 h-5 text-primary mr-2" />
                            1. Statut Juridique et Fiscal
                        </h2>
                        <p className="mb-4">
                            La participation au programme est réservée exclusivement aux personnes physiques ou morales disposant d'un statut professionnel enregistré en France (Micro-entreprise, Entreprise individuelle, Société).
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>SIRET Obligatoire :</strong> Aucun paiement ne pourra être effectué sans un numéro SIRET valide.</li>
                            <li><strong>Indépendance :</strong> La Partenaire Créatrice agit en tant que prestataire indépendant. Il n'existe aucun lien de subordination, de salariat ou de contrat VDI entre Nowme et la Partenaire.</li>
                            <li><strong>Mandat de Facturation :</strong> La Partenaire donne mandat à Nowme pour émettre, en son nom et pour son compte, les factures relatives à ses commissions.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                            <CreditCard className="w-5 h-5 text-primary mr-2" />
                            2. Commissions et Paiements
                        </h2>
                        <p>Le modèle de rémunération est basé sur la performance (CPA - Coût par Acquisition).</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <p className="font-bold text-primary">Montant de la Commission</p>
                                <p className="text-2xl font-bold text-gray-900">15 € TTC</p>
                                <p className="text-xs text-gray-500">Par nouvelle abonnée fidèle (après le 1er renouvellement mensuel).</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <p className="font-bold text-primary">Seuil de Paiement</p>
                                <p className="text-2xl font-bold text-gray-900">30 €</p>
                                <p className="text-xs text-gray-500">Soit un minimum de 2 abonnées par mois pour déclencher le paiement.</p>
                            </div>
                        </div>
                        <ul className="list-disc pl-5 space-y-2 mt-4">
                            <li><strong>Date de Paiement :</strong> Les commissions validées sont payées le **5 du mois suivant** (M+1) via virement bancaire ou PayPal.</li>
                            <li><strong>Cookie 30 jours :</strong> Si une internaute clique sur votre lien et s'abonne dans les 30 jours, la commission vous est attribuée.</li>
                            <li><strong>Condition de Fidélité :</strong> La commission n'est acquise que si l'abonnée renouvelle son abonnement pour le 2ème mois. En cas d'annulation avant le premier renouvellement, aucune commission n'est due.</li>
                        </ul>
                    </section>

                    <section className="bg-gray-900 text-white p-8 rounded-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl -mr-16 -mt-16"></div>
                        <h2 className="text-xl font-bold mb-4 flex items-center">
                            <Lock className="w-5 h-5 text-primary mr-2" />
                            3. Clause de Confidentialité
                        </h2>
                        <p className="text-gray-300 text-sm leading-relaxed mb-4">
                            En tant que Partenaire Créatrice, vous aurez accès à des informations confidentielles concernant la stratégie de Nowme, ses tarifs partenaires, ses futurs événements et ses données internes.
                        </p>
                        <ul className="text-gray-400 text-xs space-y-3">
                            <li className="flex items-start">
                                <span className="text-primary mr-2">•</span>
                                Vous vous engagez à ne pas divulguer les détails financiers ou stratégiques de Nowme à des tiers sans accord écrit.
                            </li>
                            <li className="flex items-start">
                                <span className="text-primary mr-2">•</span>
                                Les codes promotionnels et kits visuels sont réservés à votre usage dans le cadre du programme.
                            </li>
                            <li className="flex items-start">
                                <span className="text-primary mr-2">•</span>
                                Cette obligation de confidentialité survit à la fin de votre collaboration avec Nowme pour une durée de 2 ans.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                            <AlertTriangle className="w-5 h-5 text-primary mr-2" />
                            4. Éthique et Pratiques Interdites
                        </h2>
                        <p className="mb-4">Pour préserver l'image premium du Club, les pratiques suivantes sont strictement interdites :</p>
                        <div className="space-y-4">
                            <div className="flex items-start p-4 bg-red-50 rounded-lg border border-red-100">
                                <div className="bg-red-100 p-2 rounded-full mr-4">
                                    <span className="text-red-600 font-bold">!</span>
                                </div>
                                <p className="text-sm text-red-800">
                                    <strong>Publicité Payante :</strong> Il est strictement interdit d'acheter des mots-clés "Nowme" ou dérivés sur Google Ads, Facebook Ads ou tout autre réseau pour détourner du trafic.
                                </p>
                            </div>
                            <div className="flex items-start p-4 bg-red-50 rounded-lg border border-red-100">
                                <div className="bg-red-100 p-2 rounded-full mr-4">
                                    <span className="text-red-600 font-bold">!</span>
                                </div>
                                <p className="text-sm text-red-800">
                                    <strong>Contenu Trompeur :</strong> Vous ne devez pas faire de fausses promesses ou donner des avis fictifs sur le Club. L'authenticité est la clé de notre partenariat.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">5. Résiliation</h2>
                        <p>
                            Nowme se réserve le droit de mettre fin au partenariat à tout moment en cas de non-respect de ces conditions ou d'image incompatible avec les valeurs du Club. En cas de résiliation pour faute, les commissions non encore payées pourront être annulées.
                        </p>
                    </section>

                    <section className="pt-8 border-t border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4">Besoin de précisions ?</h3>
                        <p className="text-sm">
                            Si vous avez des questions sur ces conditions ou sur l'aspect fiscal de votre activité, notre équipe est à votre écoute :
                            <br />
                            <a href="mailto:contact@nowme.fr" className="text-primary font-bold hover:underline">contact@nowme.fr</a>
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
