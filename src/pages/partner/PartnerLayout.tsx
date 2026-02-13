import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Briefcase, Calendar, Settings, LogOut, HelpCircle, FileText } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import MissingInfoBanner from "../../components/partner/MissingInfoBanner";
import NotificationCenter from "../../components/partner/NotificationCenter";

export default function PartnerLayout() {
  const { user, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [businessName, setBusinessName] = useState<string>("Chargement...");
  const [hasSignedContract, setHasSignedContract] = useState<boolean>(true); // Default true to avoid flash, validated in effect
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadPartner = async () => {

      // Utiliser partner_id depuis le profil si disponible
      const partnerId = profile?.partner_id;

      if (!partnerId) {
        // Fallback: chercher dans user_profiles
        let partnerIdFound = null;

        const { data: profileData } = await (supabase
          .from("user_profiles") as any)
          .select("partner_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileData && profileData.partner_id) {
          partnerIdFound = profileData.partner_id;
        } else {
          // Double Fallback: chercher directement dans la table partners via user_id
          const { data: partnerDirect } = await (supabase
            .from("partners") as any)
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (partnerDirect) {
            partnerIdFound = partnerDirect.id;
          }
        }

        if (!partnerIdFound) {
          setBusinessName("Mon entreprise");
          return;
        }

        // Récupérer les infos du partenaire
        const { data, error } = await (supabase
          .from("partners") as any)
          .select("business_name, contract_signed_at")
          .eq("id", partnerIdFound)
          .maybeSingle();

        if (!error && data) {
          setBusinessName(data.business_name || "Mon entreprise");
          checkContract(data.contract_signed_at);
        } else {
          setBusinessName("Mon entreprise");
        }
      } else {
        // Récupérer directement avec le partner_id du profil
        const { data, error } = await (supabase
          .from("partners") as any)
          .select("business_name, contract_signed_at") // Added field
          .eq("id", partnerId)
          .maybeSingle();

        if (!error && data) {
          setBusinessName(data.business_name || "Mon entreprise");
          checkContract(data.contract_signed_at);
        } else {
          setBusinessName(profile?.first_name || "Mon entreprise");
        }
      }
    };
    loadPartner();
  }, [user, profile, location.pathname]); // Re-run if path changes to ensure guard enforces

  const checkContract = (signedAt: string | null) => {
    const isSignPage = location.pathname === '/partner/sign-contract';

    if (!signedAt) {
      setHasSignedContract(false);
      // If not signed and NOT on sign page, redirect
      if (!isSignPage) {
        navigate('/partner/sign-contract');
      }
    } else {
      setHasSignedContract(true);
      // If signed and ON sign page, redirect to dashboard
      if (isSignPage) {
        navigate('/partner/dashboard');
      }
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/partner/signin");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-soft px-6 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <div className="space-y-1.5">
                <div className="w-6 h-0.5 bg-gray-600"></div>
                <div className="w-6 h-0.5 bg-gray-600"></div>
                <div className="w-6 h-0.5 bg-gray-600"></div>
              </div>
            </button>
            <h1 className="text-lg font-bold text-primary">{businessName}</h1>
          </div>
          {user && (
            <p className="text-sm text-gray-500">
              Connecté en tant que partenaire&nbsp;: {user.email}
            </p>
          )}
        </div>
        <div className="flex items-center">
          <NotificationCenter />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 transition"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </header>

      {/* Banner info manquante */}
      {hasSignedContract && <MissingInfoBanner />}

      {/* Layout principal */}
      <div className="flex flex-1">
        {/* Sidebar - Only show if contract signed */}
        {hasSignedContract && (
          <>
            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-20 lg:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
            )}

            <aside className={`
              fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white shadow-md transform transition-transform duration-300 ease-in-out
              ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
              <nav className="p-4 space-y-2 pt-20 lg:pt-4">
                <NavLink
                  to="/partner/dashboard"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 ${isActive ? "bg-primary/10 text-primary font-semibold" : "text-gray-700"
                    }`
                  }
                >
                  <LayoutDashboard className="w-5 h-5" />
                  Dashboard
                </NavLink>
                <NavLink
                  to="/partner/guide-partenaire"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 ${isActive ? "bg-primary/10 text-primary font-semibold" : "text-gray-700"
                    }`
                  }
                >
                  <HelpCircle className="w-5 h-5" />
                  Guide
                </NavLink>

                <NavLink
                  to="/partner/offers"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 ${isActive ? "bg-primary/10 text-primary font-semibold" : "text-gray-700"
                    }`
                  }
                >
                  <Briefcase className="w-5 h-5" />
                  Mes offres
                </NavLink>
                <NavLink
                  to="/partner/bookings"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 ${isActive ? "bg-primary/10 text-primary font-semibold" : "text-gray-700"
                    }`
                  }
                >
                  <Calendar className="w-5 h-5" />
                  Réservations
                </NavLink>
                <NavLink
                  to="/partner/reviews"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 ${isActive ? "bg-primary/10 text-primary font-semibold" : "text-gray-700"
                    }`
                  }
                >
                  <Briefcase className="w-5 h-5" />
                  Mes Avis
                </NavLink>
                <NavLink
                  to="/partner/settings/general"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 ${isActive ? "bg-primary/10 text-primary font-semibold" : "text-gray-700"
                    }`
                  }
                >
                  <Settings className="w-5 h-5" />
                  Paramètres
                </NavLink>
              </nav>
            </aside>
          </>
        )}

        {/* Contenu */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
