import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { LoadingSpinner } from '../../components/LoadingSpinner';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Afficher les informations de débogage
    console.log('URL complète:', window.location.href);
    console.log('Location search:', location.search);
    console.log('Location hash:', location.hash);
    
    // Récupérer les paramètres de l'URL (essayer à la fois search et hash)
    let params;
    
    // Vérifier d'abord dans les paramètres de requête (search)
    if (location.search) {
      params = new URLSearchParams(location.search);
    } 
    // Si rien n'est trouvé, vérifier dans le hash (ancien format)
    else if (location.hash && location.hash.startsWith('#')) {
      params = new URLSearchParams(location.hash.substring(1));
    } else {
      params = new URLSearchParams('');
    }
    
    const type = params.get('type');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const error = params.get('error');
    const errorDescription = params.get('error_description');
    
    // Afficher les paramètres extraits pour le débogage
    console.log('Paramètres extraits:', {
      type,
      accessToken: !!accessToken,
      refreshToken: !!refreshToken,
      error,
      errorDescription
    });

    if (error) {
      console.error('Erreur d\'authentification:', error, errorDescription);
      setError(errorDescription || 'Une erreur est survenue lors de l\'authentification');
      return;
    }

    // Si nous avons un access_token, essayer de le stocker manuellement
    if (accessToken) {
      try {
        // Stocker le token dans le localStorage (comme le ferait Supabase)
        localStorage.setItem('supabase.auth.token', JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken || '',
          expires_at: Date.now() + 3600 * 1000, // Approximation d'une heure
          expires_in: 3600
        }));
        
        // Recharger la page pour que Supabase puisse détecter le token
        window.location.href = '/';
        return;
      } catch (err) {
        console.error('Erreur lors du stockage du token:', err);
      }
    }

    // Gérer les différents types de callbacks
    switch (type) {
      case 'recovery':
        // Rediriger vers la page de mise à jour du mot de passe avec le token
        navigate(`/auth/update-password${location.search || location.hash}`);
        break;
      case 'signup':
      case 'magiclink':
      case 'invite':
        // Si l'utilisateur est déjà connecté, rediriger vers la page d'accueil
        if (user) {
          navigate('/');
        } else {
          // Sinon, rediriger vers la page de connexion
          navigate('/auth/signin');
        }
        break;
      default:
        // Si nous n'avons pas de type mais que l'utilisateur est connecté
        if (user) {
          navigate('/');
        } else if (location.search || location.hash) {
          // Si nous avons des paramètres mais pas de type reconnu
          setError('Type de callback non reconnu. Veuillez réessayer de vous connecter.');
        } else {
          // Redirection par défaut
          navigate('/auth/signin');
        }
    }
  }, [location, navigate, user]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {error ? (
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Erreur d'authentification</h2>
          <p className="text-gray-700">{error}</p>
          <button
            onClick={() => navigate('/auth/signin')}
            className="mt-6 w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark transition-colors"
          >
            Retour à la connexion
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Redirection en cours...</p>
        </div>
      )}
    </div>
  );
};

export default AuthCallback;