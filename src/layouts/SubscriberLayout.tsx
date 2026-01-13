import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import {
    LayoutDashboard,
    Calendar,
    Wallet,
    User,
    Settings,
    LogOut,
    Menu,
    X,
    Sparkles,
    CreditCard,
    Gift
} from 'lucide-react';
import { Logo } from '../components/Logo';

export default function SubscriberLayout() {
    const { user, profile, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Tableau de bord', to: '/mon-compte', end: true, roles: ['subscriber', 'admin', 'partner'] },
        { icon: Calendar, label: 'Mes Réservations', to: '/mon-compte/reservations', roles: ['subscriber', 'admin', 'partner', 'guest'] },
        { icon: Sparkles, label: 'Mes Sorties Club', to: '/mon-compte/squads', roles: ['subscriber', 'admin'] },
        { icon: CreditCard, label: 'Mes Echéanciers', to: '/mon-compte/echeanciers', roles: ['subscriber', 'admin'] },
        { icon: Gift, label: 'Mes Récompenses', to: '/mon-compte/recompenses', roles: ['subscriber', 'admin'] },
        { icon: Wallet, label: 'Mon Ardoise', to: '/mon-compte/ardoise', roles: ['subscriber', 'admin'] },
        { icon: User, label: 'Mon Profil', to: '/mon-compte/profil', roles: ['subscriber', 'admin', 'partner', 'guest'] },
        { icon: Settings, label: 'Paramètres', to: '/mon-compte/parametres', roles: ['subscriber', 'admin', 'partner', 'guest'] },
    ];

    const currentRole = profile?.role || 'guest';
    const displayLabel = currentRole === 'guest'
        ? 'Invitée'
        : (profile?.subscription_status === 'active' ? 'Kiffeuse Active' : 'Membre');

    return (
        <div className="min-h-screen bg-[#FDF8F4]">
            {/* Mobile Header */}
            <div className="lg:hidden bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <Logo className="h-8" />
                </div>
                <NavLink to="/account/profile" className="w-8 h-8 rounded-full overflow-hidden border border-gray-200">
                    {profile?.photo_url ? (
                        <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary">
                            <User className="w-4 h-4" />
                        </div>
                    )}
                </NavLink>
            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <div className="flex max-w-7xl mx-auto">
                {/* Sidebar Navigation */}
                <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-[calc(100vh-2rem)] lg:my-4 lg:ml-4 lg:rounded-2xl lg:shadow-sm flex flex-col
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
                    <div className="p-6 flex items-center justify-between lg:justify-center">
                        <Logo className="h-10" />
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="px-4 mb-6">
                        <div className="bg-gradient-to-br from-primary/10 to-orange-50 p-4 rounded-xl flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white p-0.5 shadow-sm overflow-hidden flex-shrink-0">
                                {profile?.photo_url ? (
                                    <img src={profile.photo_url} alt="" className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                        <User className="w-5 h-5 text-gray-400" />
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-gray-900 truncate">
                                    {profile?.first_name || 'Membre'}
                                </p>
                                <p className="text-xs text-primary font-medium flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    {displayLabel}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2">
                        <nav className="space-y-1">
                            {navItems.filter(item => item.roles.includes(currentRole) || (currentRole === 'admin' && item.roles.includes('subscriber'))).map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.end}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium
                  ${isActive
                                            ? 'bg-primary text-white shadow-md shadow-primary/25'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }
                `}
                                >
                                    <item.icon className="w-5 h-5" />
                                    {item.label}
                                </NavLink>
                            ))}
                        </nav>

                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
                            >
                                <LogOut className="w-5 h-5" />
                                Déconnexion
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-w-0 lg:p-4">
                    <div className="bg-white/50 min-h-[calc(100vh-2rem)] lg:rounded-2xl lg:shadow-sm lg:bg-white overflow-hidden">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
