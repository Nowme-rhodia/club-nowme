import React from 'react';
import { SEO } from '../../components/SEO';
import { useAuth } from '../../lib/auth';
import { Bell, Lock, Globe, Eye, CreditCard, Settings as SettingsIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export default function Settings() {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F4] via-white to-[#FDF8F4] py-12">
      <SEO
        title="Paramètres"
        description="Gérez vos préférences"
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-soft p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Paramètres</h1>

          <div className="space-y-6">
            {/* Notifications */}
            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Bell className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
              </div>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex flex-col">
                    <span className="text-gray-900 font-medium">Newsletter du Kiff</span>
                    <span className="text-xs text-gray-500">Ta dose de bonne humeur dans ton email toutes les semaines.</span>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-primary rounded focus:ring-primary border-gray-300"
                    checked={profile?.sub_newsletter ?? true}
                    onChange={async (e) => {
                      try {
                        const { error } = await supabase
                          .from('user_profiles')
                          .update({ sub_newsletter: e.target.checked } as any)
                          .eq('user_id', profile?.user_id!);
                        if (error) throw error;
                        window.location.reload();
                      } catch (err) { console.error(err); }
                    }}
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex flex-col">
                    <span className="text-gray-900 font-medium">Récap Hebdo</span>
                    <span className="text-xs text-gray-500">Les nouvelles sorties et nouveaux kiffs de la semaine.</span>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-primary rounded focus:ring-primary border-gray-300"
                    checked={profile?.sub_auto_recap ?? true}
                    onChange={async (e) => {
                      try {
                        const { error } = await supabase
                          .from('user_profiles')
                          .update({ sub_auto_recap: e.target.checked } as any)
                          .eq('user_id', profile?.user_id!);
                        if (error) throw error;
                        window.location.reload();
                      } catch (err) { console.error(err); }
                    }}
                  />
                </label>

                <button
                  onClick={async () => {
                    if (!confirm("Voulez-vous vraiment vous désabonner de TOUTES les communications ?")) return;
                    try {
                      const { error } = await supabase
                        .from('user_profiles')
                        .update({ sub_newsletter: false, sub_auto_recap: false } as any)
                        .eq('user_id', profile?.user_id!);
                      if (error) throw error;
                      window.location.reload();
                    } catch (err) { console.error(err); }
                  }}
                  className="text-xs text-red-500 hover:text-red-700 underline mt-2 block w-full text-right"
                >
                  Me désabonner de tout en un clic
                </button>
              </div>
            </div>

            {/* Confidentialité */}
            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Eye className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-gray-900">Confidentialité</h2>
              </div>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-gray-700">Profil public</span>
                  <input type="checkbox" className="w-5 h-5 text-primary rounded" />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-gray-700">Partager mes activités</span>
                  <input type="checkbox" className="w-5 h-5 text-primary rounded" />
                </label>
              </div>
            </div>

            {/* Langue */}
            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Globe className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-gray-900">Langue</h2>
              </div>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>

            {/* Sécurité */}
            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-gray-900">Sécurité</h2>
              </div>
              <button className="w-full px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                Changer mon mot de passe
              </button>
            </div>

            {/* Abonnement */}
            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-gray-900">Mon Abonnement</h2>
              </div>

              <div className="space-y-4">
                <p className="text-gray-600 text-sm">
                  Vous êtes actuellement abonné(e) au Club Nowme. Vous pouvez gérer votre moyen de paiement, télécharger vos factures ou résilier votre abonnement via notre portail sécurisé.
                </p>

                <button
                  onClick={async () => {
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) return;

                      const toastId = toast.loading('Redirection vers le portail...');

                      const { data, error } = await supabase.functions.invoke('create-portal-session', {
                        body: { returnUrl: window.location.href }
                      });

                      if (error) throw error;
                      if (data?.url) {
                        window.location.href = data.url;
                      } else {
                        throw new Error('No URL returned');
                      }
                    } catch (err) {
                      console.error('Portal error:', err);
                      toast.error("Impossible d'accéder au portail abonnement.");
                    }
                  }}
                  className="w-full px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <SettingsIcon className="w-4 h-4" />
                  Gérer mon abonnement / Me désabonner
                </button>
              </div>
            </div>

            {/* Sauvegarder */}
            <div className="pt-6 border-t border-gray-200">
              <button className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
