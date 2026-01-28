import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Heart, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-white">
      <div className="h-px bg-gradient-to-r from-primary via-secondary to-primary opacity-30" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {/* Column 1: About */}
          <div className="text-center md:text-left">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              NowMe
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Ta dose d’inspiration pour des kiffs à gogo !
            </p>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/qui-sommes-nous"
                  className="text-gray-600 hover:text-primary transition-colors duration-200"
                >
                  Qui sommes-nous ?
                </Link>
              </li>
              <li>
                <Link
                  to="/blog"
                  className="text-gray-600 hover:text-primary transition-colors duration-200"
                >
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Services */}
          <div className="text-center md:text-left">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Découvre
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/subscription"
                  className="text-gray-600 hover:text-primary transition-colors duration-200"
                >
                  Abonnement
                </Link>
              </li>
              <li>
                <Link
                  to="/categories"
                  className="text-gray-600 hover:text-primary transition-colors duration-200"
                >
                  Catégories
                </Link>
              </li>
              <li>
                <Link
                  to="/tous-les-kiffs"
                  className="text-gray-600 hover:text-primary transition-colors duration-200"
                >
                  Tous les kiffs
                </Link>
              </li>
              <li>
                <Link
                  to="/devenir-partenaire"
                  className="text-gray-600 hover:text-primary transition-colors duration-200"
                >
                  Devenir partenaire
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div className="text-center md:text-left">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Contacte-moi
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:contact@nowme.fr"
                  className="flex items-center justify-center md:justify-start text-gray-600 hover:text-primary transition-colors duration-200"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  contact@nowme.fr
                </a>
              </li>
              <li>
                <a
                  href="tel:+33769250429"
                  className="flex items-center justify-center md:justify-start text-gray-600 hover:text-primary transition-colors duration-200"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  07 69 25 04 29
                </a>
              </li>
              <li>
                <div className="flex items-center justify-center md:justify-start text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  Paris, France
                </div>
              </li>
              <li className="pt-2">
                <div className="flex justify-center md:justify-start space-x-4">
                  <a
                    href="https://www.instagram.com/nowme_une.femme.en.off/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-gray-50 hover:bg-pink-50 transition-all duration-300 group"
                    aria-label="Instagram"
                  >
                    <Instagram className="w-5 h-5 text-gray-600 group-hover:text-primary" />
                  </a>
                  <a
                    href="https://facebook.com/nowme.fr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-gray-50 hover:bg-blue-50 transition-all duration-300 group"
                    aria-label="Facebook"
                  >
                    <Facebook className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                  </a>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal Links */}
        <div className="mt-12 pt-8 border-t border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-gray-600">
              <Link
                to="/mentions-legales"
                className="hover:text-primary transition-colors duration-200"
              >
                Mentions légales
              </Link>
              <Link
                to="/politique-de-confidentialite"
                className="hover:text-primary transition-colors duration-200"
              >
                Politique de confidentialité
              </Link>
              <Link
                to="/cgv"
                className="hover:text-primary transition-colors duration-200"
              >
                CGV
              </Link>
            </div>
            <p className="text-gray-600 flex items-center justify-center text-sm">
              Créé avec <Heart className="w-4 h-4 text-primary mx-2" /> pour les audacieux
            </p>
          </div>
        </div>
      </div>
    </footer >
  );
}