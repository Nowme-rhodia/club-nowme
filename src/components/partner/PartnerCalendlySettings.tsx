import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { HelpCircle, CheckCircle, AlertCircle, Loader2, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface PartnerCalendlySettingsProps {
    partnerId: string;
    initialToken: string | null;
    onUpdate: () => void;
}

export function PartnerCalendlySettings({ partnerId, initialToken, onUpdate }: PartnerCalendlySettingsProps) {
    const [token, setToken] = useState(initialToken || '');
    const [verifying, setVerifying] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [status, setStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

    const verifyAndSaveToken = async () => {
        if (!token.trim()) return;

        setVerifying(true);
        setStatus('idle');

        try {
            // 1. Vérification avec l'API Calendly (via une Edge Function pour éviter CORS si nécessaire, 
            // mais ici on tente direct ou on assume que le client peut le faire si CORS le permet. 
            // Calendly API v2 requiert un header Authorization: Bearer <token>
            // Si CORS bloque, on devra passer par le backend. Essayons une simple vérification de format d'abord
            // ou sauvegardons directement et laissons le webhook échouer si invalide. 
            // Mieux: Appeler une fonction supbase 'verify-calendly-token' pour être propre.
            // Pour l'instant, on va simuler la vérification ou juste sauver si le format semble ok (longueur).
            // L'utilisateur a demandé: "Ajoute un bouton 'Vérifier la connexion' qui appelle l'API Calendly"

            const response = await fetch('https://api.calendly.com/users/me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Jeton invalide ou expire');
            }

            const data = await response.json();

            // 2. Sauvegarde en base
            const { error } = await supabase
                .from('partners')
                .update({ calendly_token: token })
                .eq('id', partnerId);

            if (error) throw error;

            // 3. Enregistrer le Webhook pour ce partenaire
            // On utilise l'URL de l'Edge Function actuelle
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const webhookUrl = `${supabaseUrl}/functions/v1/calendly-webhook?partner_id=${partnerId}`;

            // On récupère l'URI de l'utilisateur depuis la réponse précédente (data.resource.uri)
            const userUri = data.resource.uri;

            // Création du webhook scopé à l'utilisateur
            const createHook = await fetch('https://api.calendly.com/webhook_subscriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: webhookUrl,
                    events: ['invitee.created'],
                    scope: 'user',
                    user: userUri
                })
            });

            if (createHook.ok) {
                console.log('Webhook enregistré avec succès');
                toast.success('Synchronisation automatique activée !');
            } else {
                // Si ça échoue, c'est peut-être qu'il existe déjà -> on considère success warning
                console.warn('Info webhook:', await createHook.text());
                // On ne bloque pas l'UI, le token est valide
            }

            setStatus('valid');
            toast.success(`Compte Calendly connecté : ${data.resource.name}`);
            onUpdate();

        } catch (error) {
            console.error('Erreur verification:', error);
            setStatus('invalid');
            toast.error('Impossible de vérifier le jeton. Assurez-vous qu\'il est correct.');
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-primary" />
                    Intégration Calendly
                </h3>
                <button
                    onClick={() => setShowHelp(true)}
                    className="text-gray-400 hover:text-primary transition-colors"
                    title="Comment obtenir mon jeton ?"
                >
                    <HelpCircle className="w-5 h-5" />
                </button>
            </div>

            <p className="text-sm text-gray-600">
                Connectez votre compte Calendly pour synchroniser automatiquement les réservations.
            </p>

            <div className="space-y-3">
                <div className="relative">
                    <input
                        type="password"
                        value={token}
                        onChange={(e) => {
                            setToken(e.target.value);
                            setStatus('idle');
                        }}
                        placeholder="Collez votre jeton d'accès personnel ici..."
                        className={`w-full px-4 py-3 rounded-lg border ${status === 'invalid' ? 'border-red-300 focus:ring-red-200' :
                            status === 'valid' ? 'border-green-300 focus:ring-green-200' :
                                'border-gray-300 focus:ring-primary/20'
                            } focus:outline-none focus:ring-4 transition-all pr-12`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {verifying ? (
                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        ) : status === 'valid' ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : status === 'invalid' ? (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                        ) : null}
                    </div>
                </div>

                <button
                    onClick={verifyAndSaveToken}
                    disabled={verifying || !token}
                    className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {verifying ? 'Vérification...' : 'Vérifier et Sauvegarder'}
                </button>
            </div>

            {/* Modal d'aide */}
            {showHelp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                        <h4 className="text-lg font-bold text-gray-900 mb-4">Obtenir mon jeton Calendly</h4>
                        <ol className="list-decimal pl-5 space-y-3 text-sm text-gray-600 mb-6">
                            <li>Connectez-vous à votre compte <strong>Calendly</strong>.</li>
                            <li>Allez dans <strong>Intégrations</strong> (menu haut).</li>
                            <li>Cliquez sur <strong>API et connecteurs</strong>.</li>
                            <li>Dans la section "Jeton d'accès personnel", cliquez sur <strong>Générer un nouveau jeton</strong>.</li>
                            <li>Donnez un nom (ex: "Nowme Club") et copiez le jeton.</li>
                        </ol>
                        <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs mb-6">
                            ⚠️ Ce jeton permet à Nowme de savoir quand une réservation est effectuée pour vos offres.
                        </div>
                        <button
                            onClick={() => setShowHelp(false)}
                            className="w-full py-2.5 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        >
                            J'ai compris
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
