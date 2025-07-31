
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { SEO } from '../components/SEO';

export default function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [hasSessionId, setHasSessionId] = useState(true);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setHasSessionId(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsVerifying(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [searchParams]);

  if (!hasSessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Aucune session détectée</h2>
          <p className="text-gray-700">Retour à la page d’abonnement en cours...</p>
        </div>
      </div>
    );
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Vérification de votre paiement...
          </h2>
          <p className="text-gray-600">
            Veuillez patienter pendant que nous confirmons votre abonnement.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <SEO 
        title="Abonnement confirmé"
        description="Votre abonnement Nowme a été activé avec succès."
      />

      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Bienvenue dans la communauté Nowme !
          </h1>

          <p className="text-gray-600 mb-8">
            🎉 Ton abonnement est validé ! Tu vas recevoir un email avec un lien pour créer ton mot de passe.<br /><br />
            Clique dessus pour rejoindre l’univers Nowme. À tout de suite !
          </p>

          <div className="space-y-4">
            <button
              onClick={() => navigate('/tous-les-kiffs')}
              className="w-full px-6 py-3 bg-primary text-white rounded-full font-semibold hover:bg-primary-dark transition-colors"
            >
              Découvrir les kiffs
            </button>

            <button
              onClick={() => navigate('/account')}
              className="w-full px-6 py-3 border-2 border-primary text-primary rounded-full font-semibold hover:bg-primary/5 transition-colors"
            >
              Voir mon compte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
