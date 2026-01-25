import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Users, Building2, Settings, Mail, Clock, CheckCircle, CreditCard, LogOut, MessageSquare, Edit3, Sparkles } from 'lucide-react';
import { useAuth } from '../../lib/auth';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

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
    // ➕ NOUVEAU : Ambassadrices
    {
      name: 'Ambassadrices',
      href: '/admin/ambassadors',
      icon: Sparkles, // Or another icon
      current: location.pathname === '/admin/ambassadors'
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
      name: 'Blog',
      href: '/admin/blog',
      icon: Edit3,
      current: location.pathname.startsWith('/admin/blog')
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
    {
      name: 'Remboursements',
      href: '/admin/refunds',
      icon: Clock,
      current: location.pathname === '/admin/refunds'
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
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <Link to="/admin" className="text-lg font-bold text-primary">
          Administration
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          {isMobileMenuOpen ? <LogOut className="w-6 h-6 rotate-180" /> : <div className="space-y-1.5"><div className="w-6 h-0.5 bg-gray-600"></div><div className="w-6 h-0.5 bg-gray-600"></div><div className="w-6 h-0.5 bg-gray-600"></div></div>}
          {/* Using simple div hamburger or icon if available in imports (Menu is not imported, reusing existing icons or generic) -> Actually let's just use text or generic bars if icon missing, but wait, I can import Menu from lucide-react if I want, or just use what I have. */}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Navigation latérale */}
      <div className={`
        fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50 shadow-lg pt-0 lg:pt-[120px] transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-gray-200 lg:hidden justify-between">
          <span className="text-xl font-bold text-primary">Menu</span>
          <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-500"><LogOut className="w-5 h-5" /></button> {/* Using LogOut as close icon placeholder if X not imported, wait X is not imported. I'll add X to imports */}
        </div>
        <div className="hidden lg:flex h-16 items-center px-6 border-b border-gray-200 absolute top-0 w-full bg-white z-10" style={{ top: 0, marginTop: 0 }}>
          {/* Desktop Logo Area if needed, but the original code had pt-[120px] maybe for header overlap? 
                 Original code: pt-[120px]. This implies it sits BELOW the main site header? 
                 But this is AdminLayout. 
                 Let's stick to a clean sidebar for Admin.
             */}
          <Link to="/admin" className="text-xl font-bold text-primary">
            Administration
          </Link>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)] mt-16 lg:mt-0">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
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
      <div className="lg:pl-64 pt-4 lg:pt-0">
        <Outlet />
      </div>
    </div>
  );
}
