import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { LoadingSpinner } from './LoadingSpinner';
import { AlertTriangle, LogOut } from 'lucide-react';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'partner' | 'subscriber' | 'guest')[];
}

export function PrivateRoute({ children, allowedRoles }: PrivateRouteProps) {
  const { user, profile, loading, error, signOut, isAdmin, isPartner, isSubscriber } = useAuth();
  const location = useLocation();
  const [timeoutPassed, setTimeoutPassed] = useState(false);

  // Sécurité : on stoppe le "chargement infini" après 8 secondes
  useEffect(() => {
    const timer = setTimeout(() => setTimeoutPassed(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  // 1️⃣ Pendant le chargement initial
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // 2️⃣ En cas d'erreur critique de chargement du profil (EX: Recursion, DB down)
  // On affiche un écran d'erreur au lieu de rediriger pour éviter les boucles
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Problème de connexion</h2>
          <p className="text-gray-600 mb-6">
            Impossible de charger votre profil. Cela peut être dû à une mauvaise connexion ou à un problème technique.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-primary text-white rounded-full py-2 px-4 hover:bg-primary-dark transition-colors"
            >
              Réessayer
            </button>
            <button
              onClick={() => signOut()}
              className="w-full flex items-center justify-center border border-gray-300 text-gray-700 rounded-full py-2 px-4 hover:bg-gray-50 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Se déconnecter
            </button>
          </div>
          {/* Debug info for devs */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs text-red-400 font-mono text-left break-all">
              {error.message || 'Unknown error'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 3️⃣ Si pas de session après le chargement → redirection
  if (!user) {
    // console.warn('PrivateRoute - Aucun utilisateur connecté, redirection...');
    return <Navigate to="/connexion" state={{ from: location }} replace />;
  }

  // 4️⃣ Vérification des rôles si demandés
  if (allowedRoles && user) {
    const hasAllowedRole = allowedRoles.some((role) => {
      // Exception pour rhodia@nowme.fr : accès illimité
      if (user.email === 'rhodia@nowme.fr') return true;

      switch (role) {
        case 'admin':
          return isAdmin;
        case 'partner':
          return isPartner;
        case 'subscriber':
          return isSubscriber;
        case 'guest':
          return profile?.role === 'guest';
        default:
          return false;
      }
    });

    if (!hasAllowedRole) {
      console.warn('PrivateRoute - Accès refusé, redirection...');
      if (isPartner) {
        return <Navigate to="/partner/dashboard" replace />;
      }
      return <Navigate to="/abonnement" replace />;
    }
  }

  // 5️⃣ Si tout est OK
  return <>{children}</>;
}
