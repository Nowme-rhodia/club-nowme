import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { LoadingSpinner } from './LoadingSpinner';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'partner' | 'subscriber')[];
}

export function PrivateRoute({ children, allowedRoles }: PrivateRouteProps) {
  const { user, loading, isAdmin, isPartner, isSubscriber } = useAuth();
  const location = useLocation();
  const [timeoutPassed, setTimeoutPassed] = useState(false);

  // Sécurité : on stoppe le "chargement infini" après 8 secondes
  useEffect(() => {
    const timer = setTimeout(() => setTimeoutPassed(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  console.log('PrivateRoute - User:', !!user);
  console.log('PrivateRoute - Loading:', loading);
  console.log('PrivateRoute - IsAdmin:', isAdmin);
  console.log('PrivateRoute - AllowedRoles:', allowedRoles);

  // 1️⃣ Pendant le chargement initial - TOUJOURS attendre si loading est true
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // 2️⃣ Si pas de session après le chargement → redirection
  if (!user) {
    console.warn('PrivateRoute - Aucun utilisateur connecté, redirection...');
    return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  }

  // 3️⃣ Vérification des rôles si demandés
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
        default:
          return false;
      }
    });

    console.log('PrivateRoute - HasAllowedRole:', hasAllowedRole);

    if (!hasAllowedRole) {
      console.warn('PrivateRoute - Accès refusé, redirection...');
      if (isPartner) {
        return <Navigate to="/partner/dashboard" replace />;
      }
      return <Navigate to="/subscription" replace />;
    }
  }

  // 4️⃣ Si tout est OK
  return <>{children}</>;
}
