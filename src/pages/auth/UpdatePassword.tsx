import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { LoadingSpinner } from '../../components/LoadingSpinner';

type FormData = {
  password: string;
  confirmPassword: string;
};

const UpdatePassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<FormData>();

  // Récupérer les paramètres de l'URL
  const searchParams = new URLSearchParams(location.search);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  useEffect(() => {
    console.log('UpdatePassword - URL complète:', window.location.href);
    console.log('UpdatePassword - Location search:', location.search);
    console.log('UpdatePassword - Token hash trouvé:', !!tokenHash);
    console.log('UpdatePassword - Type:', type);
    
    if (!tokenHash) {
      setTokenError('Aucun token de réinitialisation trouvé. Veuillez demander un nouveau lien de réinitialisation.');
    }
  }, [tokenHash, location, type]);

  const onSubmit = async (data: FormData) => {
    if (!tokenHash) {
      toast.error('Token de réinitialisation manquant');
      return;
    }

    setLoading(true);
    try {
      // Utiliser directement la méthode resetPasswordForEmail avec le token_hash
      const { error } = await supabase.auth.resetPasswordForEmail(null, {
        redirectTo: window.location.origin + '/auth/callback',
        token_hash: tokenHash,
        password: data.password
      });

      if (error) throw error;

      toast.success('Votre mot de passe a été mis à jour avec succès');
      navigate('/auth/signin');
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du mot de passe:', error);
      toast.error(error.message || 'Une erreur est survenue lors de la mise à jour du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  if (tokenError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Erreur de token</h2>
          <p className="text-gray-700">{tokenError}</p>
          <button
            onClick={() => navigate('/auth/forgot-password')}
            className="mt-6 w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark transition-colors"
          >
            Demander un nouveau lien
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Mettre à jour votre mot de passe</h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Nouveau mot de passe
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              {...register('password', {
                required: 'Le mot de passe est requis',
                minLength: {
                  value: 8,
                  message: 'Le mot de passe doit contenir au moins 8 caractères'
                }
              })}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              {...register('confirmPassword', {
                required: 'Veuillez confirmer votre mot de passe',
                validate: value => value === watch('password') || 'Les mots de passe ne correspondent pas'
              })}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark transition-colors disabled:bg-gray-400"
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Mettre à jour le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UpdatePassword;