import React, { useState, useEffect } from 'react';
import { Mail, Shield, AlertCircle, CheckCircle, X, Eye, EyeOff, Lock, User, MapPin, Phone, Globe, FileText, Building } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface PartnerProfile {
  id: string;
  business_name: string;
  contact_name: string;
  contact_email: string;
  phone: string;
  address: string;
  website: string;
  description: string;
  notification_settings: {
    new_booking: boolean;
    booking_reminder: boolean;
    booking_cancellation: boolean;
    marketing: boolean;
  };
}

export default function SettingsGeneral() {
  const location = useLocation();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [partnerId, setPartnerId] = useState<string | null>(null);

  // Profile Form State (renamed from 'profile' to 'profileForm' to avoid conflict)
  const [profileForm, setProfileForm] = useState<PartnerProfile>({
    id: '',
    business_name: '',
    contact_name: '',
    contact_email: '',
    phone: '',
    address: '',
    website: '',
    description: '',
    notification_settings: {
      new_booking: true,
      booking_reminder: true,
      booking_cancellation: true,
      marketing: false
    }
  });

  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchPartnerData();
    }
  }, [user, profile]);

  const fetchPartnerData = async () => {
    try {
      setLoading(true);

      if (!user) return;

      // 1. Get Partner ID from profile or user_profiles
      let currentPartnerId = profile?.partner_id;

      if (!currentPartnerId) {
        // Fallback: try to fetch from user_profiles if not in context yet
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('partner_id')
          .eq('user_id', user.id)
          .single();

        if (userProfile?.partner_id) {
          currentPartnerId = userProfile.partner_id;
        }
      }

      if (!currentPartnerId) {
        console.error('No partner_id found for user:', user.id);
        // Don't throw immediately, just stop loading, potentially not a partner yet or data issue
        setLoading(false);
        return;
      }

      // 2. Fetch Partner Data using the Partner ID (NOT user_id)
      const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .select('id, business_name, contact_name, contact_email, phone, address, website, description, notification_settings')
        .eq('id', currentPartnerId)
        .single();

      if (partnerError) throw partnerError;

      if (partner) {
        setPartnerId(partner.id);
        setProfileForm({
          id: partner.id,
          business_name: partner.business_name || '',
          contact_name: partner.contact_name || '',
          contact_email: partner.contact_email || user.email || '',
          phone: partner.phone || '',
          address: partner.address || '',
          website: partner.website || '',
          description: partner.description || '',
          notification_settings: partner.notification_settings || {
            new_booking: true,
            booking_reminder: true,
            booking_cancellation: true,
            marketing: false
          }
        });
      }
    } catch (err: any) {
      console.error("Error fetching partner data:", err);
      // User friendly error only if it's a real fetch error, not just missing profile logic
      if (user) setError("Impossible de charger les informations du profil.");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (field: keyof PartnerProfile, value: string) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationChange = (key: string, checked: boolean) => {
    setProfileForm(prev => ({
      ...prev,
      notification_settings: {
        ...prev.notification_settings,
        [key]: checked
      }
    }));
  };

  const handleSave = async () => {
    try {
      setError(null);
      setSuccess(null);

      if (!partnerId) return;

      const { error: updateError } = await supabase
        .from('partners')
        .update({
          business_name: profileForm.business_name,
          contact_name: profileForm.contact_name,
          phone: profileForm.phone,
          address: profileForm.address,
          website: profileForm.website,
          description: profileForm.description,
          notification_settings: profileForm.notification_settings
        })
        .eq('id', partnerId);

      if (updateError) throw updateError;

      setSuccess('Profil et préférences mis à jour avec succès ✨');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Save error:", err);
      setError('Une erreur est survenue lors de la sauvegarde : ' + err.message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas");
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setPasswordSuccess("Mot de passe mis à jour avec succès !");
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordSuccess(null);
      }, 2000);
    } catch (err: any) {
      console.error('Error updating password:', err);
      setPasswordError(err.message || "Erreur lors de la mise à jour du mot de passe");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Chargement de vos informations...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Paramètres</h1>

        {/* Navigation */}
        <div className="flex border-b mb-8">
          <Link
            to="/partner/settings/general"
            className={`px-4 py-3 -mb-px border-b-2 text-sm font-medium transition-colors ${location.pathname.includes("general")
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
          >
            Général & Profil
          </Link>
          <Link
            to="/partner/settings/payments"
            className={`ml-6 px-4 py-3 -mb-px border-b-2 text-sm font-medium transition-colors ${location.pathname.includes("payments")
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
          >
            Paiements & Agenda
          </Link>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg flex items-center shadow-sm border border-green-100 animate-in fade-in slide-in-from-top-2">
            <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />
            <span className="font-medium">{success}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center shadow-sm border border-red-100 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <div className="space-y-8">

          {/* Section Informations du Profil */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Informations de l'établissement</h2>
                  <p className="text-sm text-gray-500">Ces informations sont visibles sur votre page partenaire.</p>
                </div>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'établissement</label>
                <div className="relative">
                  <Building className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={profileForm.business_name}
                    onChange={(e) => handleProfileChange('business_name', e.target.value)}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    placeholder="Mon super spa"
                  />
                </div>
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du contact</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={profileForm.contact_name}
                    onChange={(e) => handleProfileChange('contact_name', e.target.value)}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    placeholder="Jean Dupont"
                  />
                </div>
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (Lecture seule)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={profileForm.contact_email}
                    disabled
                    className="pl-10 block w-full rounded-lg border-gray-300 bg-gray-50 text-gray-500 shadow-sm sm:text-sm cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    placeholder="01 23 45 67 89"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse complète</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={profileForm.address}
                    onChange={(e) => handleProfileChange('address', e.target.value)}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    placeholder="123 Avenue des Champs-Élysées, 75008 Paris"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Site Web</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="url"
                    value={profileForm.website}
                    onChange={(e) => handleProfileChange('website', e.target.value)}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    placeholder="https://www.mon-spa.fr"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <textarea
                    rows={4}
                    value={profileForm.description}
                    onChange={(e) => handleProfileChange('description', e.target.value)}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    placeholder="Décrivez votre établissement et vos services..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section Notifications email */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Préférences de notifications</h2>
                  <p className="text-sm text-gray-500">Gérez les emails que vous recevez.</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {Object.entries(profileForm.notification_settings).map(([key, value]) => (
                <label key={key} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-100">
                  <span className="text-gray-700 font-medium">
                    {key === 'new_booking' && 'Nouvelle réservation reçue'}
                    {key === 'booking_reminder' && 'Rappel (24h avant)'}
                    {key === 'booking_cancellation' && 'Annulation client'}
                    {key === 'marketing' && 'Actualités et conseils Nowme'}
                  </span>
                  <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => handleNotificationChange(key, e.target.checked)}
                      className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer peer checked:right-0 right-6"
                    />
                    <div className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer peer-checked:bg-primary"></div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Section Sécurité */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Sécurité du compte</h2>
                  <p className="text-sm text-gray-500">Gérez votre mot de passe et l'accès à votre compte.</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="w-full text-left py-4 px-4 rounded-lg border border-gray-200 hover:border-primary/30 hover:bg-gray-50 flex justify-between items-center transition-all group"
              >
                <div>
                  <span className="font-medium text-gray-900 block mb-1">Mot de passe</span>
                  <span className="text-sm text-gray-500">Modifiez votre mot de passe régulièrement pour plus de sécurité.</span>
                </div>
                <span className="px-4 py-2 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-colors">Modifier</span>
              </button>
            </div>
          </div>

        </div>

        {/* Global Save Button - Sticky or Fixed at bottom right if needed, but simple bottom here */}
        <div className="flex justify-end mt-10 pt-6 border-t border-gray-200">
          {/* Feedback message usually appears near button */}
          <button
            onClick={handleSave}
            className="px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition shadow-lg transform active:scale-95 flex items-center"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Enregistrer les modifications
          </button>
        </div>
      </div>

      {/* Password Change Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="bg-primary/10 p-3 rounded-full">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Changer le mot de passe</h2>
                <p className="text-sm text-gray-500">Sécurisez votre compte.</p>
              </div>
            </div>

            {passwordSuccess ? (
              <div className="p-4 bg-green-50 rounded-lg flex items-center mb-6 animate-in slide-in-from-top-2">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                <p className="text-green-700 font-medium">{passwordSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleUpdatePassword} className="space-y-5">
                {passwordError && (
                  <div className="p-3 bg-red-50 rounded-lg flex items-center text-sm text-red-600 border border-red-100">
                    <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                    {passwordError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nouveau mot de passe</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary transition-shadow"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirmer le mot de passe</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary transition-shadow"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 transition flex justify-center items-center shadow-md"
                  >
                    {isUpdatingPassword ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Valider"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
