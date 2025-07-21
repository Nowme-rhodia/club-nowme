import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, AlertCircle, ArrowLeft, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SEO } from '../../components/SEO';

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true); // État pour suivre la vérification initiale
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasValidTokens, setHasValidTokens] = useState(false);

  useEffect(() => {
    const restoreSessionFromUrl = async () => {
      try {
        console.log("=== DÉBOGAGE TOKENS DE RÉINITIALISATION ===");
        console.log("URL complète:", window.location.href);
        
        // Récupérer le hash et le traiter correctement
        let hash = window.location.hash;
        console.log("Hash brut:", hash);
        
        // S'assurer que le hash est correctement formaté
        if (hash.startsWith('#')) {
          hash = hash.slice(1);
        }
        console.log("Hash traité:", hash);
        
        // Extraire les tokens avec URLSearchParams
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        const type = params.get("type");
        
        console.log("Access token trouvé:", !!access_token);
        console.log("Refresh token trouvé:", !!refresh_token);
        console.log("Type:", type);

        if (!access_token || !refresh_token) {
          console.error("Tokens manquants dans l'URL");
          setError("Lien invalide ou expiré. Merci de redemander un lien de réinitialisation.");
          setHasValidTokens(false);
          setVerifying(false);
          return;
        }

        // Essayer de restaurer la session avec les tokens
        console.log("Tentative de restauration de session...");
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          console.error("Erreur de session:", error);
          setError("Session invalide ou expirée. Merci de redemander un lien.");
          setHasValidTokens(false);
        } else {
          console.log("Session restaurée avec succès:", !!data.session);
          setHasValidTokens(true);
        }
      } catch (err) {
        console.error("Erreur inattendue lors de la vérification des tokens:", err);
        setError("Une erreur est survenue lors de la vérification du lien.");
        setHasValidTokens(false);
      } finally {
        // Toujours terminer la vérification, même en cas d'erreur
        setVerifying(false);
      }
    };

    // Ajouter un délai pour s'assurer que l'URL est complètement chargée
    const timer = setTimeout(() => {
      restoreSessionFromUrl();
    }, 500);

    return () => clearTimeout(timer);
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validation du mot de passe
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    console.log("Début de la mise à jour du mot de passe...");

    try {
      // Vérifier que la session est toujours valide avant de mettre à jour
      const { data: sessionData } = await supabase.auth.getSession();
      console.log("Session actuelle:", sessionData.session ? "Valide" : "Invalide");
      
      if (!sessionData.session) {
        console.error("Session invalide avant la mise à jour du mot de passe");
        setError("Votre session a expiré. Veuillez demander un nouveau lien de réinitialisation.");
        setLoading(false);
        return;
      }

      // Mettre à jour le mot de passe avec un timeout
      console.log("Envoi de la requête de mise à jour du mot de passe...");
      
      // Créer une promesse avec timeout
      const updatePasswordWithTimeout = () => {
        return Promise.race([
          supabase.auth.updateUser({ password }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("La requête a expiré après 10 secondes")), 10000)
          )
        ]);
      };
      
      const { data, error } = await updatePasswordWithTimeout() as { 
        data: { user: any } | null, 
        error: Error | null 
      };

      if (error) {
        throw error;
      }

      console.log("Réponse de mise à jour reçue:", data ? "Succès" : "Échec");
      
      if (!data || !data.user) {
        throw new Error("Aucune donnée utilisateur retournée");
      }

      console.log("Mot de passe mis à jour avec succès");
      setSuccess(true);
      
      // Attendre un peu avant de rediriger
      setTimeout(() => {
        console.log("Redirection vers la page de connexion...");
        navigate('/auth/signin', {
          state: { message: 'Votre mot de passe a été mis à jour avec succès' }
        });
      }, 2000);
    } catch (err: any) {
      console.error('Erreur détaillée lors de la mise à jour du mot de passe:', err);
      setError(err.message || 'Une erreur est survenue lors de la mise à jour du mot de passe');
      
      // Tenter de se déconnecter et rediriger vers la page de demande de réinitialisation
      try {
        await supabase.auth.signOut();
        console.log("Déconnexion effectuée après erreur");
      } catch (signOutErr) {
        console.error("Erreur lors de la déconnexion:", signOutErr);
      }
    } finally {
      setLoading(false);
    }
  };

  // Afficher un indicateur de chargement pendant la vérification initiale
  if (verifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
            Vérification du lien
          </h2>
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                Vérification de votre lien de réinitialisation...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <SEO 
        title="Nouveau mot de passe"
        description="Définissez votre nouveau mot de passe"
      />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          Nouveau mot de passe club
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Choisissez un nouveau mot de passe sécurisé !
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {success ? (
            <div className="text-center">
              <div className="rounded-full bg-green-100 p-3 mx-auto w-fit mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Mot de passe mis à jour !
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Votre mot de passe a été réinitialisé avec succès. Vous allez être redirigé vers la page de connexion.
              </p>
              <Link
                to="/auth/signin"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-primary hover:bg-primary-dark"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Aller à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {!hasValidTokens ? (
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-6">
                    Le lien de réinitialisation est invalide ou a expiré. Veuillez demander un nouveau lien.
                  </p>
                  <Link
                    to="/auth/forgot-password"
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-primary hover:bg-primary-dark"
                  >
                    Demander un nouveau lien
                  </Link>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Nouveau mot de passe
                    </label>
                    <div className="mt-1 relative">
                      <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-3 pl-10 placeholder-gray-400 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                      />
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Minimum 8 caractères
                    </p>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                      Confirmer le mot de passe
                    </label>
                    <div className="mt-1 relative">
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="block w-full appearance-none rounded-lg border border-gray-300 px-3 py-3 pl-10 placeholder-gray-400 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                      />
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={loading}
                      className={`
                        flex w-full justify-center items-center rounded-full border border-transparent px-4 py-3 text-base font-medium text-white shadow-sm
                        ${loading
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
                        }
                      `}
                    >
                      {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
                    </button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}