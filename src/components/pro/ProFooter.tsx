import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Mail } from 'lucide-react';

export function ProFooter() {
    return (
        <footer className="bg-[#FDF8F4] border-t border-gray-100 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {/* Brand */}
                    <div className="space-y-4">
                        <Link to="/pro" className="flex items-center space-x-2">
                            <img
                                src="https://i.imgur.com/or3q8gE.png"
                                alt="Nowme Logo"
                                className="h-10 w-auto"
                            />
                            <span className="text-lg font-serif font-semibold text-gray-900 border-l border-gray-300 pl-4">PRO</span>
                        </Link>
                        <p className="text-gray-600 font-light max-w-sm">
                            Conception et pilotage d'événements stratégiques pour les entreprises.
                            Traduire vos objectifs en expériences collectives fluides.
                        </p>
                        <div className="flex space-x-4 pt-2">
                            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">
                                <Facebook className="w-5 h-5" />
                            </a>
                            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">
                                <Instagram className="w-5 h-5" />
                            </a>
                            <a href="mailto:hello@nowme.fr" className="text-gray-400 hover:text-primary transition-colors">
                                <Mail className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Navigation</h3>
                        <ul className="space-y-3">
                            <li><a href="#services" className="text-gray-600 hover:text-primary transition-colors">Nos Services</a></li>
                            <li><a href="#approche" className="text-gray-600 hover:text-primary transition-colors">Notre Approche</a></li>
                            <li><a href="#cas-usage" className="text-gray-600 hover:text-primary transition-colors">Cas d’Usage</a></li>
                            <li><a href="#contact" className="text-gray-600 hover:text-primary transition-colors">Contact</a></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Légal</h3>
                        <ul className="space-y-3">
                            <li><Link to="/mentions-legales" className="text-gray-600 hover:text-primary transition-colors">Mentions Légales</Link></li>
                            <li><Link to="/politique-de-confidentialite" className="text-gray-600 hover:text-primary transition-colors">Confidentialité</Link></li>
                            <li><Link to="/cgv" className="text-gray-600 hover:text-primary transition-colors">CGV</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center">
                    <p className="text-gray-400 text-sm">
                        © {new Date().getFullYear()} Nowme Pro. Tous droits réservés.
                    </p>
                </div>
            </div>
        </footer>
    );
}
