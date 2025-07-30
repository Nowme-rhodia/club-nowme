import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { Users, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function CreateUsers() {
  const { user, profile, isAdmin } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);

  console.log('CreateUsers - User:', !!user, user?.email);
  console.log('CreateUsers - Profile:', profile);
  console.log('CreateUsers - IsAdmin:', isAdmin);
  console.log('CreateUsers - Profile role:', profile?.role);
  console.log('CreateUsers - Profile subscription_type:', profile?.subscription_type);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const loadSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;
        if (!data.session?.access_token) {
          console.log('⛔️ Aucune session trouvée. Peut-être non connecté.');
          setError('Non connecté. Veuillez vous authentifier.');
          return;
        }

        setToken(data.session.access_token);
        console.log('✅ Token récupéré avec succès');
      } catch (err: any) {
        console.error('❌ Erreur récupération session :', err.message || err);
        setError('Erreur de session Supabase.');
      }
    };

    timeout = setTimeout(() => {
      setError('⏳ Temps de chargement trop long...');
    }, 5000);

    loadSession().finally(() => clearTimeout(timeout));

    return () => clearTimeout(timeout);
  }, []);

  const users = [
    { 
      email: 'rhodia@nowme.fr', 
      password: 'azert123', 
      role: 'super_admin',
      description: 'Accès complet à toutes les fonctionnalités',
      permissions: ['Gestion complète', 'Tous les modules']
    },
    { 
      email: 'nowme.club@gmail.com', 
      password: 'azert123', 
      role: 'subscriber_admin',
      description: 'Gestion des abonnés et contenus',
      permissions: ['Abonnés', 'Newsletter', 'Événements', 'Masterclasses']
    },
    { 
      email: 'rhodia.kw@gmail.com', 
      password: 'azert123', 
      role: 'partner_admin',
      description: 'Gestion des partenaires et offres',
      permissions: ['Partenaires', 'Offres', 'Réservations']
    }
  ];

  const handleClick = async () => {
    if (!token) {
      setError("Token manquant. Impossible d'envoyer la requête.");
      return;
    }

    setStatus('loading');
    setError(null);
    setResults([]);

    try {
      console.log('🚀 Début création des utilisateurs admin...');
      const createdUsers = [];

      for (const userData of users) {
        console.log(`🔄 Création de ${userData.email}...`);
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-recreate-user`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              email: userData.email,
              password: userData.password,
              role: userData.role,
              redirectTo: 'https://club.nowme.fr/auth/update-password'
            })
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || `Erreur HTTP ${response.status}`);
        }

        console.log(`✅ Utilisateur ${userData.email} créé avec rôle ${userData.role}`);
        createdUsers.push({
          ...userData,
          success: true,
          userId: result.user?.user?.id
        });
      }

      setResults(createdUsers);
      setStatus('done');
      console.log('🎉 Tous les utilisateurs admin créés avec succès !');

    } catch (err: any) {
      console.error('❌ Erreur création utilisateurs :', err.message || err);
      setStatus('error');
      setError(err.message);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-700';
      case 'subscriber_admin': return 'bg-blue-100 text-blue-700';
      case 'partner_admin': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès refusé</h1>
          <p className="text-gray-600">Vous devez être administrateur pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Création des utilisateurs admin
          </h1>
          <p className="text-gray-600">
            Créer les trois comptes administrateurs avec leurs rôles spécifiques
          </p>
        </div>

        {/* Aperçu des utilisateurs à créer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {users.map((admin, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-lg border">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-primary/10 rounded-lg mr-3">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{admin.role.replace('_', ' ')}</h3>
                  <p className="text-sm text-gray-500">{admin.email}</p>
                </div>
              </div>
              
              <p className="text-gray-600 text-sm mb-4">{admin.description}</p>
              
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Permissions
                </p>
                <div className="flex flex-wrap gap-1">
                  {admin.permissions.map((permission, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* État et erreurs */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Bouton de création */}
        <div className="text-center mb-8">
          {token ? (
            <button
              onClick={handleClick}
              disabled={status === 'loading'}
              className={`
                inline-flex items-center px-8 py-4 rounded-full font-semibold text-lg
                ${status === 'done'
                  ? 'bg-green-500 text-white'
                  : status === 'loading'
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-primary hover:bg-primary-dark text-white transform hover:scale-105'
                }
                transition-all duration-300
              `}
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Création en cours...
                </>
              ) : status === 'done' ? (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  ✅ Comptes créés
                </>
              ) : (
                <>
                  <Users className="w-5 h-5 mr-2" />
                  Créer les 3 comptes admin
                </>
              )}
            </button>
          ) : (
            <p className="text-gray-500 italic">Chargement du token...</p>
          )}
        </div>

        {/* Résultats */}
        {results.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Résultats de la création
              </h2>
            </div>
            
            <div className="divide-y divide-gray-200">
              {results.map((result, index) => (
                <div key={index} className="p-6 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="mr-4">
                      {result.success ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-red-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{result.email}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(result.role)}`}>
                          {result.role.replace('_', ' ')}
                        </span>
                        {result.success && result.userId && (
                          <span className="text-xs text-gray-500">
                            ID: {result.userId.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {result.success ? (
                      <span className="text-green-600 font-medium">Créé avec succès</span>
                    ) : (
                      <span className="text-red-600 font-medium">Échec</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Informations importantes */}
        <div className="mt-8 p-6 bg-yellow-50 rounded-xl border border-yellow-200">
          <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Informations importantes</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Mot de passe pour tous : <code className="bg-yellow-100 px-1 rounded">azert123</code></li>
            <li>• Les utilisateurs existants seront supprimés et recréés</li>
            <li>• Chaque admin aura des permissions spécifiques selon son rôle</li>
            <li>• Les comptes seront automatiquement confirmés</li>
          </ul>
        </div>
      </div>
    </div>
  );
}