import React from 'react';
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

  console.log('PrivateRoute - User:', !!user);
  console.log('PrivateRoute - Loading:', loading);
  console.log('PrivateRoute - IsAdmin:', isAdmin);
  console.log('PrivateRoute - Profile:', profile);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  }

  if (allowedRoles) {
    const hasAllowedRole = allowedRoles.some(role => {
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

    if (!hasAllowedRole) {
      if (isPartner) {
        return <Navigate to="/partner/dashboard" replace />;
      }
      return <Navigate to="/subscription" replace />;
    }
  }

  return <>{children}</>;
}