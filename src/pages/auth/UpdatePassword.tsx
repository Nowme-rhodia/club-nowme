// updatepassword.tsx - Version corrigée
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, AlertCircle, ArrowLeft, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SEO } from '../../components/SEO';

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenHash, setTokenHash] = useState('');
  const [isValidToken, setIsValidToken] = useState(false);
  const [checking, setChecking] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Vérification du token une seule fois au montage
  useEffect(() => {
    const checkTokenFromUrl = () => {
      console.log('🔍 Vérification du token depuis l\'URL...');
      console.log('URL complète:', window.location.href);
      
      const params = new URLSearchParams(window.location.search);
      const hash = params.get('token_hash');
      const type = params.get('type');
      
      console.log('Token hash extrait:', hash);
      console.log('Type extrait:', type);
      
      if (hash && type === 'recovery') {
        setTokenHash(hash);
        setIsValidToken(true);
        console.log('✅ Token valide trouvé');
      } else {
        setError('Lien de réinitialisation invalide ou expiré');
        console.log('❌ Token invalide ou manquant');
      }
      
      setChecking(false);
    };

    checkTokenFromUrl();
  }, []); // Dépendances vides = exécution unique

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) {
      return 'Le mot de passe doit contenir au moins 8 caractères';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 Soumission du formulaire de réinitialisation');
    
    setError(null);
    
    // Validations
    const passwordError = validatePassword(password);
    if (passwordError) {
      console.log('❌ Validation échec:', passwordError);
      setError(passwordError);
      return;
    }
    
    if (password !== confirmPassword) {
      console.log('❌ Validation échec: Les mots de passe ne correspondent pas');
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (!tokenHash) {
      console.log('❌ Validation échec: Token manquant');
      setError('Token manquant. Veuillez utiliser le lien de votre email.');
      return;
    }
    
    setLoading(true);

    try {
      console.log('🔐 Étape 1: Vérification du token...');
      console.log('Token utilisé:', tokenHash.substring(0, 10) + '...');
      
      // ÉTAPE 1: Vérifier le token
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery'
      });
      
      console.log('📊 Réponse verifyOtp:', { data: verifyData, error: verifyError });
      
      if (verifyError) {
        console.error('❌ Erreur verifyOtp:', verifyError);
        throw new Error(`Erreur de vérification: ${verifyError.message}`);
      }

      // Stocker le token d'accès pour l'utiliser avec la fonction Edge
      if (verifyData?.session?.access_token) {
        setAccessToken(verifyData.session.access_token);
        console.log('✅ Token d\'accès obtenu');
      }

      console.log('✅ Token vérifié avec succès');
      console.log('🔄 Étape 2: Mise à jour du mot de passe...');
      
      // OPTION 1: Utiliser directement updateUser (méthode actuelle)
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: password
      });
      
      console.log('📊 Réponse updateUser:', { data: updateData, error: updateError });

      if (updateError) {
        console.error('❌ Erreur updateUser:', updateError);
        
        // OPTION 2: Si la méthode directe échoue, essayer via la fonction Edge
        if (accessToken) {
          console.log('🔄 Tentative via fonction Edge...');
          
          // URL CORRIGÉE: Utiliser l'URL complète de la fonction Edge Supabase
          const response = await fetch('https://dqfyuhwrjozoxadkccdj.functions.supabase.co/reset-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ password })
          });
          
          const result = await response.json();
          console.log('📊 Réponse fonction Edge:', result);
          
          if (!response.ok) {
            throw new Error(result.error || 'Erreur lors de la réinitialisation du mot de passe');
          }
          
          console.log('✅ Mot de passe mis à jour via fonction Edge');
        } else {
          throw new Error(`Erreur de mise à jour: ${updateError.message}`);
        }
      } else {
        console.log('✅ Mot de passe mis à jour directement');
      }

      console.log('🎉 Mot de passe mis à jour avec succès !');
      setSuccess(true);
      
      // Redirection après 2 secondes
      setTimeout(() => {
        console.log('🔄 Redirection vers /auth/signin');
        navigate('/auth/signin', {
          state: { message: 'Votre mot de passe a été mis à jour avec succès' }
        });
      }, 2000);
      
    } catch (err: any) {
      console.error('💥 Erreur complète:', err);
      setError(err.message || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  // Le reste du code reste identique...
  
  // Affichage pendant la vérification du token
  if (checking) {
    return (
      <div className="min-h-screen bg-[#FDF8F4] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Vérification du lien...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF8F4] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <SEO 
        title="Réinitialisation du mot de passe"
        description="Créez un nouveau mot de passe pour votre compte Nowme"
      />

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <img src="https://i.imgur.com/or3q8gE.png" alt="Logo" className="mx-auto h-16 w-auto" />
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Nouveau mot de passe
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Choisissez un nouveau mot de passe sécurisé
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          {success ? (
            <div className="text-center">
              <div className="rounded-full bg-green-100 p-3 mx-auto w-fit mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Mot de passe mis à jour !
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Votre mot de passe a été réinitialisé avec succès. Redirection en cours...
              </p>
              <Link
                to="/auth/signin"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-primary hover:bg-primary-dark"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Aller à la connexion
              </Link>
            </div>
          ) : !isValidToken ? (
            <div className="text-center">
              <div className="rounded-full bg-red-100 p-3 mx-auto w-fit mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Lien invalide
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {error || 'Le lien de réinitialisation est invalide ou a expiré.'}
              </p>
              <Link
                to="/auth/forgot-password"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-primary hover:bg-primary-dark"
              >
                Demander un nouveau lien
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Nouveau mot de passe
                </label