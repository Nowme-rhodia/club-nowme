import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Users, Building2, Settings, Mail, Clock, CheckCircle, CreditCard, LogOut, MessageSquare } from 'lucide-react';
import { useAuth } from '../../lib/auth';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/'); // Or redirect to home/login
  };

  const isAdmin = profile?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès refusé</h1>
          <p className="text-gray-600 mb-8">
            Vous n'avez pas les droits nécessaires pour accéder à cette page.
          </p>
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 rounded-full bg-primary text-white hover:bg-primary-dark"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  const navigation = [
    {
      name: 'Partenaires',
      href: '/admin/partners',
      icon: Building2,
      current: location.pathname === '/admin/partners'
    },
    {
      name: 'Offres',
      href: '/admin/offers',
      icon: CheckCircle,
      current: location.pathname === '/admin/offers'
    },
    {
      name: 'Abonnées',
      href: '/admin/subscribers',
      icon: Users,
      current: location.pathname === '/admin/subscribers'
    },
    {
      name: 'Newsletter',
      href: '/admin/newsletter',
      icon: Mail,
      current: location.pathname === '/admin/newsletter'
    },
    {
      name: 'Créer Admins',
      href: '/admin/create-users',
      icon: Users,
      current: location.pathname === '/admin/create-users'
    },
    // ➕ NOUVEAU : Paiements
    {
      name: 'Paiements partenaires',
      href: '/admin/payouts',
      icon: CreditCard,
      current: location.pathname === '/admin/payouts'
    },
    // ➕ NOUVEAU : Communauté
    {
      name: 'Communauté',
      href: '/admin/community',
      icon: MessageSquare,
      current: location.pathname === '/admin/community'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation latérale */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-40 shadow-lg pt-[120px]">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Link to="/admin" className="text-xl font-bold text-primary">
            Administration
          </Link>
        </div>
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`
                flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors
                ${item.current
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
              {item.name}
            </Link>
          ))}

          <div className="pt-4 mt-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3 flex-shrink-0" />
              Se déconnecter
            </button>
          </div>
        </nav>
      </div>

      {/* Contenu principal */}
      <div className="pl-64">
        <Outlet />
      </div>
    </div>
  );
}
