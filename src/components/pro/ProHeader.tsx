import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export function ProHeader() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navigationItems = [
        { name: 'Services', path: '#services' },
        { name: 'Notre approche', path: '#approche' },
        { name: 'Cas d’usage', path: '#cas-usage' },
        { name: 'Chiffres', path: '#chiffres' },
    ];

    return (
        <header className="sticky top-0 z-50 bg-[#FDF8F4] shadow-sm backdrop-blur-sm bg-opacity-90">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4 lg:py-6">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                        <Link to="/pro" className="flex items-center space-x-2">
                            <img
                                src="https://i.imgur.com/or3q8gE.png"
                                alt="Nowme Logo"
                                className="h-10 w-auto sm:h-12 transition-transform duration-300 hover:scale-105"
                            />
                            <span className="text-xl font-serif font-semibold text-gray-900 ml-2 pt-1 border-l border-gray-300 pl-4 hidden sm:inline">PRO</span>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-8">
                        {navigationItems.map((item) => (
                            <a
                                key={item.name}
                                href={item.path}
                                className="text-gray-700 hover:text-primary relative group transition-colors duration-200 font-medium"
                            >
                                {item.name}
                                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-200"></span>
                            </a>
                        ))}
                        <a
                            href="#contact"
                            className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg active:scale-95"
                        >
                            Me présenter votre projet
                        </a>
                    </nav>

                    {/* Mobile menu button */}
                    <div className="md:hidden flex items-center">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-2 rounded-md text-gray-700 hover:text-primary hover:bg-gray-100 transition-colors duration-200"
                        >
                            {isMenuOpen ? (
                                <X className="h-6 w-6" />
                            ) : (
                                <Menu className="h-6 w-6" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <div className="md:hidden py-4 border-t border-gray-100">
                        <nav className="flex flex-col space-y-4">
                            {navigationItems.map((item) => (
                                <a
                                    key={item.name}
                                    href={item.path}
                                    className="text-gray-700 hover:text-primary px-2 py-3 rounded-md transition-colors duration-200 font-medium border-b border-gray-50 last:border-0"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {item.name}
                                </a>
                            ))}
                            <a
                                href="#contact"
                                className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-full font-medium transition-all duration-200 transform hover:scale-105 w-full text-center active:scale-95 mt-4"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Me présenter votre projet
                            </a>
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
}
