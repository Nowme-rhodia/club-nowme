import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Briefcase, Calendar, Settings, LogOut } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";

export default function PartnerLayout() {
  const { user, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState<string>("Chargement...");

  useEffect(() => {
    if (!user) return;
    const loadPartner = async () => {
      console.log('PartnerLayout: Loading partner for user', user.id);
      console.log('PartnerLayout: Full profile:', profile);
      
      // Utiliser partner_id depuis le profil si disponible
      const partnerId = profile?.partner_id;
      console.log('PartnerLayout: partner_id from profile:', partnerId);
      
      if (!partnerId) {
        // Fallback: récupérer depuis user_profiles
        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("partner_id")
          .eq("user_id", user.id)
          .single();

        console.log('PartnerLayout: profileData:', profileData, 'error:', profileError);

        if (!profileData?.partner_id) {
          console.log('PartnerLayout: No partner_id found, using default');
          setBusinessName("Mon entreprise");
          return;
        }
        
        // Récupérer les infos du partenaire
        const { data, error } = await (supabase
          .from("partners") as any)
          .select("business_name")
          .eq("id", profileData.partner_id)
          .maybeSingle();

        console.log('PartnerLayout: Partner data:', data, 'error:', error);

        if (!error && data) {
          console.log('PartnerLayout: Setting business name to:', data.business_name);
          setBusinessName(data.business_name || "Mon entreprise");
        } else {
          setBusinessName("Mon entreprise");
        }
      } else {
        // Récupérer directement avec le partner_id du profil
        const { data, error } = await supabase
          .from("partners")
          .select("business_name")
          .eq("id", partnerId)
          .maybeSingle();

        console.log('PartnerLayout: Partner data (from profile):', data, 'error:', error);

        if (!error && data) {
          console.log('PartnerLayout: Setting business name to:', data.business_name);
          setBusinessName(data.business_name || "Mon entreprise");
        } else {
          // Utiliser le nom du profil si disponible
          setBusinessName(profile?.first_name || "Mon entreprise");
        }
      }
    };
    loadPartner();
  }, [user, profile]);

  const handleLogout = async () => {
    await signOut();
    navigate("/partner/signin");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-soft px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-primary">{businessName}</h1>
          {user && (
            <p className="text-sm text-gray-500">
              Connecté en tant que partenaire&nbsp;: {user.email}
            </p>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 transition"
        >
          <LogOut className="w-5 h-5" />
          Déconnexion
        </button>
      </header>

      {/* Layout principal */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-md">
          <nav className="p-4 space-y-2">
            <NavLink
              to="/partner/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 ${
                  isActive ? "bg-primary/10 text-primary font-semibold" : "text-gray-700"
                }`
              }
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </NavLink>
            <NavLink
              to="/partner/offers"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 ${
                  isActive ? "bg-primary/10 text-primary font-semibold" : "text-gray-700"
                }`
              }
            >
              <Briefcase className="w-5 h-5" />
              Mes offres
            </NavLink>
            <NavLink
              to="/partner/bookings"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 ${
                  isActive ? "bg-primary/10 text-primary font-semibold" : "text-gray-700"
                }`
              }
            >
              <Calendar className="w-5 h-5" />
              Réservations
            </NavLink>
            <NavLink
              to="/partner/settings/general"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 ${
                  isActive ? "bg-primary/10 text-primary font-semibold" : "text-gray-700"
                }`
              }
            >
              <Settings className="w-5 h-5" />
              Paramètres
            </NavLink>
          </nav>
        </aside>

        {/* Contenu */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
