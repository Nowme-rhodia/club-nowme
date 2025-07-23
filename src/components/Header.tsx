import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogIn, User } from 'lucide-react';
import { useAuth } from '../lib/auth';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAdmin, isPartner, signOut } = useAuth();
  const navigate = useNavigate();

  const navigationItems = [
    { name: 'Accueil', path: '/' },
    { name: 'Catégories', path: '/categories' },
    { name: 'Tous les kiffs', path: '/tous-les-kiffs' },
    { name: 'Communauté', path: '/community-space', requiresAuth: true },
    { name: 'Club', path: '/club', requiresAuth: true },
    { name: 'Abonnement', path: '/subscription' }
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
            {navigationItems.map((item) => (
              item.requiresAuth && !user ? null : (
                <Link
                  key={item.name}
                  to={item.path}
                  className="text-gray-700 hover:text-primary relative group transition-colors duration-200 font-medium"
                >
                  {item.name}
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-200"></span>
                </Link>
              )
            ))}
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              to="/subscription"
              className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg active:scale-95"
            >
              Tester à 12,99€
            </Link>

            <Link
              to="/soumettre-offre"
              className="text-primary hover:text-primary-dark font-semibold transition-colors duration-200"
            >
              Devenir partenaire
            </Link>

            {user ? (
              <Link
                to={getAccountPath()}
                className="text-primary hover:text-primary-dark font-semibold transition-colors duration-200 flex items-center"
              >
                <User className="w-5 h-5 mr-2" />
                Mon compte
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
              {navigationItems.map((item) => (
                item.requiresAuth && !user ? null : (
                  <Link
                    key={item.name}
                    to={item.path}
                    className="text-gray-700 hover:text-primary px-2 py-1 rounded-md transition-colors duration-200 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                )
              ))}
              <Link
                to="/subscription"
                className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-full font-medium transition-all duration-200 transform hover:scale-105 w-full text-center active:scale-95"
                onClick={() => setIsMenuOpen(false)}
              >
                Tester à 12,99€
              </Link>
              <Link
                to="/soumettre-offre"
                className="text-primary hover:text-primary-dark font-medium px-2 py-1"
                onClick={() => setIsMenuOpen(false)}
              >
                Devenir partenaire
              </Link>
              {user ? (
                <Link
                  to={getAccountPath()}
                  className="text-primary hover:text-primary-dark font-medium px-2 py-1 flex items-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="w-5 h-5 mr-2" />
                  Mon compte
                </Link>
              ) : (
                <Link
                  to="/auth/signin"
                  className="text-primary hover:text-primary-dark font-medium px-2 py-1 flex items-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Se connecter
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}