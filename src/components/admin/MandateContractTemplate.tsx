import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MandateContractProps {
    partner: {
        business_name: string;
        contact_name: string;
        address: string;
        siret: string;
        commission_model: 'fixed' | 'acquisition';
        commission_rate: number;
        commission_rate_repeat?: number | null;
    };
}

export default function MandateContractTemplate({ partner }: MandateContractProps) {
    const currentDate = format(new Date(), 'dd MMMM yyyy', { locale: fr });

    return (
        <div className="max-w-[21cm] mx-auto bg-white p-12 text-sm leading-relaxed text-justify relative min-h-[29.7cm]">
            <div className="mb-12 text-center">
                <h1 className="text-2xl font-bold uppercase border-b-2 border-black pb-4 inline-block mb-2">CONTRAT DE MANDAT</h1>
                <p className="text-gray-500 italic">Gestion d'encaissement pour compte de tiers</p>
            </div>

            <div className="flex justify-between mb-12">
                <div className="w-1/2 pr-4">
                    <h3 className="font-bold mb-2 uppercase text-xs tracking-wider">ENTRE :</h3>
                    <p className="font-bold">NOWME SAS</p>
                    <p>Société par Actions Simplifiée</p>
                    <p>Au capital de 1 000 euros</p>
                    <p>Siège social : 10 Rue de Penthièvre, 75008 Paris</p>
                    <p>RCS Paris 123 456 789</p>
                    <p>Représentée par Mme Rhodia, Présidente</p>
                    <p className="mt-2 font-bold">(Ci-après le "Mandataire")</p>
                </div>

                <div className="w-1/2 pl-4 border-l border-gray-300">
                    <h3 className="font-bold mb-2 uppercase text-xs tracking-wider">ET :</h3>
                    <p className="font-bold">{partner.business_name || '[Raisons Sociale]'}</p>
                    <p>Représentée par {partner.contact_name || '[Nom du représentant]'}</p>
                    <p>SIRET : {partner.siret || '[SIRET]'}</p>
                    <p>Adresse : {partner.address || '[Adresse]'}</p>
                    <p className="mt-2 font-bold">(Ci-après le "Mandant")</p>
                </div>
            </div>

            <div className="space-y-6">
                <section>
                    <h2 className="font-bold uppercase text-xs tracking-wider mb-2 border-b border-gray-200 pb-1">Article 1 : Objet du contrat</h2>
                    <p>
                        Le présent contrat a pour objet de définir les conditions dans lesquelles le Mandant confie au Mandataire le mandat d'encaisser, en son nom et pour son compte, les sommes versées par les clients finaux (les "Utilisateurs") via l'application mobile ou le site web NOWME.
                    </p>
                </section>

                <section>
                    <h2 className="font-bold uppercase text-xs tracking-wider mb-2 border-b border-gray-200 pb-1">Article 2 : Mission du Mandataire</h2>
                    <p>
                        Le Mandataire est chargé de :
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Présenter les offres du Mandant sur sa plateforme.</li>
                        <li>Encaisser le prix des prestations vendues via un prestataire de services de paiement sécurisé (Stripe).</li>
                        <li>Émettre un reçu ou une confirmation de commande à l'Utilisateur.</li>
                        <li>Reverser les fonds au Mandant selon les modalités définies à l'article 4.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="font-bold uppercase text-xs tracking-wider mb-2 border-b border-gray-200 pb-1">Article 3 : Commission</h2>
                    <p>
                        En rémunération de ses services d'apport d'affaires et de gestion technique, le Mandataire percevra une commission calculée comme suit :
                    </p>

                    <div className="my-4 border border-blue-200 bg-blue-50 p-4 rounded text-blue-900">
                        {partner.commission_model === 'acquisition' ? (
                            <>
                                <p><strong>Modèle : Acquisition & Fidélisation</strong></p>
                                <ul className="list-disc pl-5 mt-2">
                                    <li>
                                        <strong>PREMIER ACHAT :</strong> Pour toute première commande d'un Utilisateur chez le Mandant, une commission de <strong>{partner.commission_rate}%</strong> HT est appliquée sur le montant total TTC de la transaction.
                                    </li>
                                    <li>
                                        <strong>ACHATS SUIVANTS :</strong> Pour toutes les commandes suivantes de ce même Utilisateur chez le Mandant, une commission de gestion réduite de <strong>{partner.commission_rate_repeat}%</strong> HT est appliquée.
                                    </li>
                                </ul>
                            </>
                        ) : (
                            <>
                                <p><strong>Modèle : Commission Fixe</strong></p>
                                <p className="mt-2">
                                    Une commission unique de <strong>{partner.commission_rate}%</strong> HT est appliquée sur le montant total TTC de chaque transaction réalisée via la plateforme.
                                </p>
                            </>
                        )}
                    </div>

                    <p>
                        Cette commission est déduite directement des sommes encaissées avant reversement au Mandant.
                    </p>
                </section>

                <section>
                    <h2 className="font-bold uppercase text-xs tracking-wider mb-2 border-b border-gray-200 pb-1">Article 4 : Modalités de Reversement</h2>
                    <p>
                        Les fonds encaissés pour le compte du Mandant sont sécurisés sur un compte de cantonnement (via Stripe Connect) ou reversés périodiquement si le Mandant n'a pas de compte Connect actif.
                    </p>
                    <p className="mt-2">
                        Le reversement du solde dû (Montant Ventes - Commission) s'effectue automatiquement selon la fréquence définie (hebdomadaire ou mensuelle) par virement bancaire sur le compte désigné par le Mandant.
                    </p>
                </section>

                <section>
                    <h2 className="font-bold uppercase text-xs tracking-wider mb-2 border-b border-gray-200 pb-1">Article 5 : Durée</h2>
                    <p>
                        Le présent mandat est conclu pour une durée indéterminée. Il pourra être dénoncé par l'une ou l'autre des parties par lettre recommandée avec accusé de réception moyennant un préavis de 30 jours.
                    </p>
                </section>

                <div className="mt-16 flex justify-between">
                    <div className="w-1/3">
                        <p className="mb-4">Fait à Paris, le {currentDate}</p>
                        <p className="font-bold mb-12">Pour le Mandataire (NOWME)</p>
                        <div className="border-b border-dotted border-gray-400 w-full h-8"></div>
                    </div>

                    <div className="w-1/3">
                        <p className="mb-4">Fait à ............................, le ....................</p>
                        <p className="font-bold mb-12">Pour le Mandant</p>
                        <div className="border-b border-dotted border-gray-400 w-full h-8"></div>
                    </div>
                </div>

                <div className="absolute bottom-4 left-0 w-full text-center text-xs text-gray-400 border-t border-gray-100 pt-2">
                    NOWME SAS - Contrat de Mandat - Page 1/1
                </div>
            </div>
        </div>
    );
}
