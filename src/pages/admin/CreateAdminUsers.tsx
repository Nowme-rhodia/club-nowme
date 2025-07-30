import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { Users, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface AdminUser {
  email: string;
  role: string;
  permissions: string[];
  success: boolean;
  userId?: string;
  error?: string;
}

export default function CreateAdminUsers() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const adminUsers = [
    {
      email: 'rhodia@nowme.fr',
      role: 'Super Admin',
      description: 'Accès complet à toutes les fonctionnalités',
      permissions: ['Gestion complète', 'Tous les modules']
    },
    {
      email: 'nowme.club@gmail.com',
      role: 'Admin Abonnés',
      description: 'Gestion des abonnés et contenus',
      permissions: ['Abonnés', 'Newsletter', 'Événements', 'Masterclasses']
    },
    {
      email: 'rhodia.kw@gmail.com',
      role: 'Admin Partenaires',
      description: 'Gestion des partenaires et offres',
      permissions: ['Partenaires', 'Offres', 'Réservations']
    }
  ];

  const handleCreateAdmins = async () => {
    if (!user) {
      setError('Vous devez être connecté pour effectuer cette action');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session non trouvée');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin-users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({})
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Erreur HTTP ${response.status}`);
      }

      setResults(result.results || []);
      setSuccess(true);

    } catch (err: any) {
      console.error('Erreur création admins:', err);
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
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

  return (
    <div className="p-8">
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
          {adminUsers.map((admin, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-soft border">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-primary/10 rounded-lg mr-3">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{admin.role}</h3>
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

        {/* Bouton de création */}
        <div className="text-center mb-8">
          <button
            onClick={handleCreateAdmins}
            disabled={loading}
            className={`
              inline-flex items-center px-8 py-4 rounded-full font-semibold text-lg
              ${loading
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : 'bg-primary hover:bg-primary-dark text-white transform hover:scale-105'
              }
              transition-all duration-300
            `}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Création en cours...
              </>
            ) : (
              <>
                <Users className="w-5 h-5 mr-2" />
                Créer les utilisateurs admin
              </>
            )}
          </button>
        </div>

        {/* Messages d'erreur */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Résultats */}
        {results.length > 0 && (
          <div className="bg-white rounded-xl shadow-soft overflow-hidden">
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
                          {result.role}
                        </span>
                        {result.success && (
                          <span className="text-xs text-gray-500">
                            ID: {result.userId?.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {result.success ? (
                      <span className="text-green-600 font-medium">Créé avec succès</span>
                    ) : (
                      <div>
                        <span className="text-red-600 font-medium">Échec</span>
                        {result.error && (
                          <p className="text-xs text-red-500 mt-1">{result.error}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message de succès */}
        {success && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
              <div>
                <p className="text-sm text-green-700 font-medium">
                  Utilisateurs admin créés avec succès !
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Mot de passe pour tous : azert123
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Informations importantes */}
        <div className="mt-8 p-6 bg-yellow-50 rounded-xl border border-yellow-200">
          <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Informations importantes</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Mot de passe par défaut : <code className="bg-yellow-100 px-1 rounded">azert123</code></li>
            <li>• Les utilisateurs existants seront supprimés et recréés</li>
            <li>• Chaque admin aura des permissions spécifiques selon son rôle</li>
            <li>• Les comptes seront automatiquement confirmés</li>
          </ul>
        </div>
      </div>
    </div>
  );
}