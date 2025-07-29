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
    // Récupérer les paramètres de l'URL
    const params = new URLSearchParams(location.search);
    const type = params.get('type');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    if (error) {
      console.error('Erreur d\'authentification:', error, errorDescription);
      setError(errorDescription || 'Une erreur est survenue lors de l\'authentification');
      return;
    }

    // Gérer les différents types de callbacks
    switch (type) {
      case 'recovery':
        // Rediriger vers la page de mise à jour du mot de passe avec le token
        navigate(`/auth/update-password${location.search}`);
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
        // Redirection par défaut
        navigate(user ? '/' : '/auth/signin');
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