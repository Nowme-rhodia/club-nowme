
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { logger } from '../lib/logger';
import toast from 'react-hot-toast';
import { WelcomeForm } from '../components/WelcomeForm';

interface VerificationResult {
  success: boolean;
  status?: string;
  message?: string;
  error?: string;
  needsSync?: boolean;
}

export default function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile, profile } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [hasSessionId, setHasSessionId] = useState(true);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showWelcomeForm, setShowWelcomeForm] = useState(false);
  const hasVerified = useRef(false); // 🔒 Flag pour éviter les appels multiples

  const verifySubscription = async (sessionId: string, currentRetry: number = 0) => {
    try {
      logger.payment.verification('start', { sessionId, attempt: currentRetry + 1 });

      console.log('🚀 Calling Edge Function verify-subscription with:', { session_id: sessionId });
      console.log('🌐 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

      const startTime = Date.now();

      // Appel direct via fetch au lieu de supabase.functions.invoke
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-subscription`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ session_id: sessionId })
        }
      );

      const duration = Date.now() - startTime;
      console.log(`⏱️ Edge Function call took ${duration}ms`);
      console.log('📦 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Edge Function data:', data);
      logger.payment.verification('result', data);
      setVerificationResult(data);

      if (data.success && data.status === 'active') {
        // 🔥 Google Ads Conversion Tracking (Verified Success)
        if (typeof window !== 'undefined' && (window as any).gtag) {
          console.log('🎯 Firing Google Ads Conversion event...');
          (window as any).gtag('event', 'conversion', {
            'send_to': 'AW-17947479509/Achat', // Note: Ensure the label 'Achat' is correct in Google Ads
            'value': data.amount || 12.99, // Use amount from response or default
            'currency': 'EUR',
            'transaction_id': sessionId
          });
        }

        // DO NOT stop verifying yet. Wait for profile sync.
        toast.success('Paiement validé ! Finalisation du compte...');

        // SHOW FORM IMMEDIATELY to avoid delay (Visual only, but buttons are hidden by isVerifying)
        setShowWelcomeForm(true);

        // Recharger le profil pour mettre à jour le rôle avec retry
        console.log('🔄 Refreshing user profile to sync Stripe status...');

        // Attendre un peu pour que la DB soit à jour (webhook latency)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Essayer de recharger le profil jusqu'à 3 fois
        let retries = 0;
        const maxRetries = 4; // Increased to 4

        while (retries < maxRetries) {
          console.log(`⏳ Profile refresh attempt ${retries + 1}/${maxRetries}...`);
          await refreshProfile();

          // Check if we are now a subscriber (Note: 'profile' var here is stale due to closure, 
          // but refreshProfile updates the context. We rely on the time passed.)
          // Ideal: check the return of refreshProfile if it returned data, 
          // but for now we just ensure we waited enough spirals.

          await new Promise(resolve => setTimeout(resolve, 1000));
          retries++;
        }

        console.log('✅ Profile refresh sequences completed.');

        // NOW we unlock the UI
        setIsVerifying(false);
        toast.success('Abonnement activé avec succès !');

        // Après le scan, on check si le profil est complet
        const updatedProfile = profile; // Note: profile might be stale here due to closure, but we rely on re-renders or direct check

        // On force l'affichage du formulaire de bienvenue
        // La logique sera gérée par le rendu : si profile incomplet -> WelcomeForm
        setShowWelcomeForm(true);

      } else if (data.status === 'pending') {
        // Retry after a delay if payment is still processing
        if (currentRetry < 5) {
          logger.payment.verification('retry', { attempt: currentRetry + 1, maxAttempts: 5 });
          setRetryCount(currentRetry + 1);
          setTimeout(() => {
            verifySubscription(sessionId, currentRetry + 1);
          }, 3000);
        } else {
          setIsVerifying(false);
          toast.error('Le paiement prend plus de temps que prévu. Vérifiez votre email.');
        }
      } else {
        setIsVerifying(false);
      }
    } catch (err: any) {
      logger.error('SubscriptionSuccess', 'Verification failed', err);
      setVerificationResult({
        success: false,
        error: err.message || 'Erreur de vérification'
      });
      setIsVerifying(false);
      toast.error('Erreur lors de la vérification de votre abonnement');
    }
  };

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    logger.navigation.pageLoad('/subscription-success', { sessionId });

    if (!sessionId) {
      setHasSessionId(false);
      setIsVerifying(false);
      return;
    }

    // 🔒 Empêcher les appels multiples (React StrictMode)
    if (hasVerified.current) {
      logger.info('SubscriptionSuccess', 'Already verified, skipping');
      return;
    }
    hasVerified.current = true;

    // Start verification immediately (only once on mount)
    verifySubscription(sessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run only once on mount

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
          {retryCount > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              Tentative {retryCount}/5...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show error state if verification failed
  if (verificationResult && !verificationResult.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <SEO
          title="Vérification en cours"
          description="Vérification de votre abonnement Nowme"
        />

        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Vérification en cours
            </h1>

            <p className="text-gray-600 mb-6">
              Nous n'avons pas encore pu confirmer votre paiement. Cela peut prendre quelques minutes.
            </p>

            <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-blue-900 mb-2">Que faire ?</h3>
              <ul className="text-sm text-blue-700 space-y-2">
                <li>✅ Vérifiez vos emails (y compris spam)</li>
                <li>✅ Attendez quelques minutes et réessayez</li>
                <li>✅ Contactez-nous si le problème persiste</li>
              </ul>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setIsVerifying(true);
                  setRetryCount(0);
                  const sessionId = searchParams.get('session_id');
                  if (sessionId) verifySubscription(sessionId);
                }}
                className="w-full px-6 py-3 bg-primary text-white rounded-full font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Réessayer la vérification
              </button>

              <button
                onClick={() => navigate('/account')}
                className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-full font-semibold hover:bg-gray-50 transition-colors"
              >
                Aller à mon compte
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state (Check profile completion)
  // Check if profile has necessary fields
  const isProfileComplete = profile?.phone && profile?.birth_date && profile?.acquisition_source;

  if (showWelcomeForm && !isProfileComplete) {
    return <WelcomeForm onComplete={() => setShowWelcomeForm(false)} />;
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
            🎉 Ton abonnement est validé ! ton compte est actif.<br /><br />
            Profite vite de tous tes avantages !
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
