import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../../components/LoadingSpinner';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Afficher les informations de débogage
    console.log('AuthCallback - URL complète:', window.location.href);
    console.log('AuthCallback - Location search:', location.search);
    console.log('AuthCallback - Location hash:', location.hash);

    // Récupérer les paramètres de l'URL
    const searchParams = new URLSearchParams(location.search);
    const hashParams = location.hash ? new URLSearchParams(location.hash.substring(1)) : null;

    // Vérifier les différents formats possibles
    const type = searchParams.get('type') || hashParams?.get('type');
    const tokenHash = searchParams.get('token_hash') || hashParams?.get('token_hash');
    const accessToken = searchParams.get('access_token') || hashParams?.get('access_token');
    const refreshToken = searchParams.get('refresh_token') || hashParams?.get('refresh_token');
    const error = searchParams.get('error') || hashParams?.get('error');
    const errorDescription = searchParams.get('error_description') || hashParams?.get('error_description');

    // Afficher les paramètres extraits pour le débogage
    console.log('AuthCallback - Paramètres extraits:', {
      type,
      tokenHash: !!tokenHash,
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

    // Gérer les différents types de callbacks
    switch (type) {
      case 'recovery':
        // Si nous avons un token_hash, rediriger directement vers la page de mise à jour du mot de passe
        if (tokenHash) {
          const emailParam = searchParams.get('email') || hashParams?.get('email');
          navigate(`/auth/update-password?token_hash=${tokenHash}&type=recovery${emailParam ? `&email=${encodeURIComponent(emailParam)}` : ''}`);
        }
        // Si nous avons un access_token, utiliser l'ancien format
        else if (accessToken) {
          navigate(`/auth/update-password?access_token=${accessToken}${refreshToken ? `&refresh_token=${refreshToken}` : ''}`);
        }
        else {
          setError('Token de récupération manquant. Veuillez demander un nouveau lien de réinitialisation.');
        }
        break;
      case 'signup':
      case 'magiclink':
      case 'invite':
        // Vérifier si l'utilisateur est connecté
        supabase.auth.getUser().then(({ data, error }) => {
          if (error || !data.user) {
            console.error('Erreur lors de la récupération de l\'utilisateur:', error);
            navigate('/auth/signin');
          } else {
            navigate('/');
          }
        });
        break;
      default:
        // Vérifier si l'utilisateur est connecté
        supabase.auth.getUser().then(({ data, error }) => {
          if (error || !data.user) {
            if (location.search || location.hash) {
              setError('Type de callback non reconnu. Veuillez réessayer de vous connecter.');
            } else {
              navigate('/auth/signin');
            }
          } else {
            navigate('/');
          }
        });
    }
  }, [location, navigate]);

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