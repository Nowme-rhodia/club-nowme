import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogIn, User, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, profile, isAdmin, isPartner, isSubscriber, signOut } = useAuth();
  const navigate = useNavigate();

  const navigationItems = [
    { name: 'Accueil', path: '/' },
    { name: 'Tous les kiffs', path: '/tous-les-kiffs' }, // Shop
    { name: "L'Agenda", path: '/agenda', requiresSubscription: true }, // Events
    { name: 'Le QG', path: '/le-club', requiresSubscription: true }, // Social
    ...(isPartner && !isAdmin ? [] : [{ name: "Mode d'emploi", path: (isSubscriber || isAdmin || user?.email === 'rhodia@nowme.fr') ? '/guide-abonnee' : '/guide-public' }])
  ];

  const getAccountPath = () => {
    if (isAdmin) return '/admin';
    if (isPartner) return '/partner/dashboard';
    return '/account';
  };

  return (
    <header className="sticky top-0 z-50 bg-[#FDF8F4] shadow-sm backdrop-blur-sm bg-opacity-90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4 lg:py-6">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/">
              <img
                src="https://i.imgur.com/or3q8gE.png"
                alt="Logo"
                className="h-12 w-auto sm:h-14 transition-transform duration-300 hover:scale-105"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {Array.isArray(navigationItems) &&
              navigationItems.map((item) =>
                (item.requiresSubscription && !isSubscriber && !isAdmin && user?.email !== 'rhodia@nowme.fr') || (isPartner && !isAdmin && user?.email !== 'rhodia@nowme.fr' && (item.path === '/community-space' || item.path === '/club' || item.path === '/guide')) ? null : (
                  <Link
                    key={item.name}
                    to={item.path}
                    className="text-gray-700 hover:text-primary relative group transition-colors duration-200 font-medium"
                  >
                    {item.name}
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-200"></span>
                  </Link>
                )
              )}
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex items-center space-x-6">
            {!isSubscriber && !isPartner && (
              <Link
                to="/subscription"
                className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg active:scale-95"
              >
                Tester à 12,99€
              </Link>
            )}

            {!isPartner && isSubscriber && !profile?.is_ambassador && (
              <Link
                to="/devenir-ambassadrice"
                className="text-primary hover:text-primary-dark font-semibold transition-colors duration-200"
              >
                Devenir ambassadrice
              </Link>
            )}

            {!isPartner && !isSubscriber && (
              <Link
                to="/devenir-partenaire"
                className="text-primary hover:text-primary-dark font-semibold transition-colors duration-200"
              >
                Devenir partenaire
              </Link>
            )}

            {isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center bg-black text-white px-5 py-2.5 rounded-full font-semibold transition hover:bg-gray-900"
              >
                Admin
              </Link>
            )}



            {user ? (
              <Link
                to={getAccountPath()}
                className="text-primary hover:text-primary-dark font-semibold transition-colors duration-200 flex items-center"
              >
                <User className="w-5 h-5 mr-2" />
                {profile?.first_name || 'Mon compte'}
              </Link>
            ) : (
              <Link
                to="/auth/signin"
                className="text-primary hover:text-primary-dark font-semibold transition-colors duration-200 flex items-center"
              >
                <LogIn className="w-5 h-5 mr-2" />
                Se connecter
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-primary hover:bg-gray-100 transition-colors duration-200"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <nav className="flex flex-col space-y-4">
              {Array.isArray(navigationItems) &&
                navigationItems.map((item) =>
                  (item.requiresSubscription && !isSubscriber && !isAdmin && user?.email !== 'rhodia@nowme.fr') || (isPartner && !isAdmin && user?.email !== 'rhodia@nowme.fr' && (item.path === '/community-space' || item.path === '/club' || item.path === '/guide')) ? null : (
                    <Link
                      key={item.name}
                      to={item.path}
                      className="text-gray-700 hover:text-primary px-2 py-1 rounded-md transition-colors duration-200 font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  )
                )}
              {!isSubscriber && !isPartner && (
                <Link
                  to="/abonnement"
                  className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-full font-medium transition-all duration-200 transform hover:scale-105 w-full text-center active:scale-95"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Tester à 12,99€
                </Link>
              )}
              {!isPartner && isSubscriber && !profile?.is_ambassador && (
                <Link
                  to="/devenir-ambassadrice"
                  className="text-primary hover:text-primary-dark font-medium px-2 py-1"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Devenir ambassadrice
                </Link>
              )}
              {!isPartner && !isSubscriber && (
                <Link
                  to="/devenir-partenaire"
                  className="text-primary hover:text-primary-dark font-medium px-2 py-1"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Devenir partenaire
                </Link>
              )}
              {isAdmin && (
                <>
                  <Link
                    to="/mes-reservations"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Mes réservations
                  </Link>
                  <Link
                    to="/admin"
                    className="w-full text-center bg-black text-white px-4 py-2 rounded-full font-semibold hover:bg-gray-900 transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Accéder à l'admin
                  </Link>
                </>
              )}

              {user ? (
                <Link
                  to={getAccountPath()}
                  className="text-primary hover:text-primary-dark font-medium px-2 py-1 flex items-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="w-5 h-5 mr-2" />
                  {profile?.first_name || 'Mon compte'}
                </Link>
              ) : (
                <Link
                  to="/connexion"
                  className="text-primary hover:text-primary-dark font-medium px-2 py-1 flex items-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Se connecter
                </Link>
              )}
              {user && (
                <button
                  onClick={() => {
                    signOut();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-center text-red-600 hover:text-red-700 font-medium px-2 py-1 flex items-center justify-center mt-4 border-t border-gray-100 pt-4"
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  Se déconnecter
                </button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header >
  );
}
