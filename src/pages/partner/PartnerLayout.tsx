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

  useEffect(() => {
    if (!user) return;
    const loadPartner = async () => {

      // Utiliser partner_id depuis le profil si disponible
      const partnerId = profile?.partner_id;

      if (!partnerId) {
        // Fallback: récupérer depuis user_profiles
        const { data: profileData } = await (supabase
          .from("user_profiles") as any)
          .select("partner_id")
          .eq("user_id", user.id)
          .single();

        if (!profileData || !profileData.partner_id) {
          setBusinessName("Mon entreprise");
          return;
        }

        // Récupérer les infos du partenaire
        const { data, error } = await (supabase
          .from("partners") as any)
          .select("business_name, contract_signed_at") // Added field
          .eq("id", profileData.partner_id)
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
          <h1 className="text-lg font-bold text-primary">{businessName}</h1>
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
          <aside className="w-64 bg-white shadow-md">
            <nav className="p-4 space-y-2">
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
        )}

        {/* Contenu */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
