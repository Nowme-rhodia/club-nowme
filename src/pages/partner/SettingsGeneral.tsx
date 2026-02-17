import React, { useState, useEffect } from 'react';
import { Save, User, Building, Phone, MapPin, Globe, Instagram, Mail, Lock, Upload, X, CheckCircle, AlertCircle, Eye, EyeOff, FileText, Shield } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import toast from 'react-hot-toast';

interface PartnerProfile {
  id: string;
  business_name: string;
  contact_name: string;
  contact_email: string;
  phone: string;
  address: string;
  website: string;

  instagram: string;
  cover_image_url: string;
  description: string;
  siret: string;
  tva_intra: string;
  main_category_id: string | null;
  subcategory_ids: string[];
  notification_settings: {
    new_booking: boolean;
    booking_reminder: boolean;
    booking_cancellation: boolean;
    marketing: boolean;
  };
  contract_signed_at?: string | null;
}

function CategorySection({ mainCategoryId, subcategoryIds, onChange }: {
  mainCategoryId: string | null,
  subcategoryIds: string[],
  onChange: (main: string | null, subs: string[]) => void
}) {
  const [categories, setCategories] = useState<{ id: string; name: string; parent_name: string | null }[]>([]);

  useEffect(() => {
    supabase
      .from('offer_categories')
      .select('id, name, parent_name')
      .order('name')
      .then(({ data }) => {
        if (data) setCategories(data);
      });
  }, []);

  const mainCategories = categories.filter(c => !c.parent_name);
  const subCategories = mainCategoryId
    ? categories.filter(c => c.parent_name === categories.find(mc => mc.id === mainCategoryId)?.name)
    : [];

  const handleSubToggle = (id: string) => {
    const newSubs = subcategoryIds.includes(id)
      ? subcategoryIds.filter(s => s !== id)
      : [...subcategoryIds, id];
    onChange(mainCategoryId, newSubs);
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="bg-primary/10 p-2.5 rounded-lg w-fit">
          <Building className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Catégorie et Expertises</h2>
          <p className="text-sm text-gray-500">Définissez votre activité pour être mieux trouvé par les abonnées.</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Catégorie Principale</label>
          <select
            value={mainCategoryId || ''}
            onChange={(e) => onChange(e.target.value || null, [])}
            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-11"
          >
            <option value="">Sélectionner une catégorie</option>
            {mainCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {mainCategoryId && subCategories.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sous-catégories (Expertises spécifiques)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 border border-gray-200 rounded-lg bg-gray-50/50">
              {subCategories.map(sub => (
                <label key={sub.id} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-white rounded-md transition-colors">
                  <input
                    type="checkbox"
                    checked={subcategoryIds.includes(sub.id)}
                    onChange={() => handleSubToggle(sub.id)}
                    className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                  />
                  <span className="text-sm text-gray-700 font-medium">{sub.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
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

    instagram: '',
    cover_image_url: '',
    description: '',
    siret: '',
    tva_intra: '',
    main_category_id: null,
    subcategory_ids: [],
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
  const [uploading, setUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!profile?.partner_id) {
        toast.error("Identifiant partenaire manquant");
        return;
      }

      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.partner_id}/cover-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('partner-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('partner-assets')
        .getPublicUrl(fileName);

      setProfileForm(prev => ({ ...prev, cover_image_url: publicUrl }));
      toast.success("Image téléchargée avec succès");

    } catch (err: any) {
      console.error('Error uploading image:', err);
      toast.error("Erreur lors du téléchargement de l'image");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchPartnerData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.partner_id]);

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
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('id, business_name, contact_name, contact_email, phone, address, website, instagram, cover_image_url, description, siret, tva_intra, notification_settings, main_category_id, subcategory_ids, contract_signed_at')
        .eq('id', currentPartnerId)
        .single();

      const partner = partnerData as any;

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
          instagram: partner.instagram || '',
          cover_image_url: partner.cover_image_url || '',
          description: partner.description || '',
          siret: partner.siret || '',
          tva_intra: partner.tva_intra || '',
          main_category_id: partner.main_category_id || null,
          subcategory_ids: partner.subcategory_ids || [],
          notification_settings: partner.notification_settings || {
            new_booking: true,
            booking_reminder: true,
            booking_cancellation: true,
            marketing: false
          },
          contract_signed_at: partner.contract_signed_at
        });
      }
    } catch (err: any) {
      console.error("Error fetching partner data:", err);
      setError("Impossible de charger les données du profil. Veuillez rafraîchir la page.");
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

      // Prevent saving if there was a fetch error to avoid overwriting with empty data
      if (error && error.includes('charger les données')) {
        return;
      }

      const { error: updateError } = await supabase
        .from('partners')
        .update({
          business_name: profileForm.business_name,
          contact_name: profileForm.contact_name,
          phone: profileForm.phone,
          address: profileForm.address,
          website: profileForm.website,
          instagram: profileForm.instagram,
          cover_image_url: profileForm.cover_image_url,
          description: profileForm.description,
          siret: profileForm.siret,
          tva_intra: profileForm.tva_intra,
          main_category_id: profileForm.main_category_id,
          subcategory_ids: profileForm.subcategory_ids,
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



  const handleDeleteAccount = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est IRRÉVERSIBLE.")) return;
    if (!window.confirm("Vraiment sûr ? Toutes vos données seront perdues.")) return;

    try {
      const { error } = await supabase.rpc('delete_own_partner_account');
      if (error) throw error;

      toast.success("Compte supprimé avec succès.");
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err: any) {
      console.error("Delete error:", err);
      // Fallback if RPC fails (e.g. permission denied on auth.users delete)
      toast.error("Erreur lors de la suppression: " + err.message);
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
    <div className="min-h-screen bg-gray-50 pb-20 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          {partnerId && (
            <Link
              to={`/partenaire/${partnerId}`}
              target="_blank"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <Globe className="w-4 h-4 mr-2" />
              Voir mon profil public
            </Link>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 mb-8 bg-white rounded-t-lg px-4 pt-2 shadow-sm">
          <Link
            to="/partner/settings/general"
            className={`mr-8 py-4 px-1 border-b-2 font-medium text-sm transition-all ${location.pathname.includes("general")
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
          >
            Général & Profil
          </Link>
          <Link
            to="/partner/settings/payments"
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-all ${location.pathname.includes("payments")
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

          {/* Section Catégories */}
          <CategorySection
            mainCategoryId={profileForm.main_category_id}
            subcategoryIds={profileForm.subcategory_ids}
            onChange={(main, subs) => setProfileForm(prev => ({ ...prev, main_category_id: main, subcategory_ids: subs }))}
          />

          {/* Section Informations du Profil */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="bg-primary/10 p-2.5 rounded-lg w-fit">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Informations de l'établissement</h2>
                <p className="text-sm text-gray-500">Ces informations sont <strong>obligatoires</strong> pour l'émission de vos factures.</p>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Alert for missing Legal Info */}
              {(!profileForm.siret || !profileForm.address) && (
                <div className="col-span-2 p-4 bg-amber-50 border border-amber-100 rounded-lg flex items-start">
                  <AlertCircle className="w-5 h-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-amber-800">Informations légales manquantes</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      Pour que Nowme puisse générer vos factures clients et vous reverser vos gains, vous devez renseigner votre <strong>SIRET</strong> et votre <strong>Adresse complète</strong>.
                    </p>
                  </div>
                </div>
              )}

              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de l'établissement</label>
                <div className="relative">
                  <Building className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={profileForm.business_name}
                    onChange={(e) => handleProfileChange('business_name', e.target.value)}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-11 transition-shadow"
                    placeholder="Mon super spa"
                  />
                </div>
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom du contact</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={profileForm.contact_name}
                    onChange={(e) => handleProfileChange('contact_name', e.target.value)}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-11 transition-shadow"
                    placeholder="Jean Dupont"
                  />
                </div>
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email (Lecture seule)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={profileForm.contact_email}
                    disabled
                    className="pl-10 block w-full rounded-lg border-gray-300 bg-gray-50 text-gray-500 shadow-sm sm:text-sm h-11 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-11 transition-shadow"
                    placeholder="01 23 45 67 89"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse complète <span className="text-red-500">*</span></label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={profileForm.address}
                    onChange={(e) => handleProfileChange('address', e.target.value)}
                    className={`pl-10 block w-full rounded-lg shadow-sm sm:text-sm h-11 transition-shadow ${!profileForm.address ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-amber-50/30' : 'border-gray-300 focus:border-primary focus:ring-primary'}`}
                    placeholder="123 Avenue des Champs-Élysées, 75008 Paris"
                    required
                  />
                </div>
                {!profileForm.address && <p className="text-xs text-amber-600 mt-1">L'adresse de facturation est requise.</p>}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Site Web</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="url"
                    value={profileForm.website}
                    onChange={(e) => handleProfileChange('website', e.target.value)}
                    className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-11 transition-shadow"
                    placeholder="https://www.mon-spa.fr"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Instagram</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400">@</span>
                  <input
                    type="text"
                    value={profileForm.instagram}
                    onChange={(e) => handleProfileChange('instagram', e.target.value)}
                    className="pl-8 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-11 transition-shadow"
                    placeholder="mon_institut_paris"
                  />
                </div>
              </div>

              <div className="col-span-2">
                {/* Cover Image Upload */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image de couverture
                  </label>
                  <div className="flex items-center gap-6">
                    {profileForm.cover_image_url && (
                      <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={profileForm.cover_image_url}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setProfileForm(prev => ({ ...prev, cover_image_url: '' }))}
                          className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-primary transition-colors cursor-pointer relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          disabled={uploading}
                        />
                        <div className="space-y-1 text-center pointer-events-none">
                          <div className="mx-auto h-12 w-12 text-gray-400">
                            {uploading ? (
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mt-2"></div>
                            ) : (
                              <Upload className="mx-auto h-12 w-12 text-gray-400" />
                            )}
                          </div>
                          <div className="flex text-sm text-gray-600 justify-center">
                            <span className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark">
                              {uploading ? 'Téléchargement...' : 'Télécharger une image'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF jusqu'à 5MB</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>    <p className="text-xs text-gray-500 mt-1">Cette image sera affichée en haut de votre profil public.</p>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Pourquoi elles vont kiffer (Description)</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <textarea
                    rows={4}
                    value={profileForm.description}
                    onChange={(e) => handleProfileChange('description', e.target.value)}
                    className="pl-10 py-3 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm transition-shadow"
                    placeholder="Racontez votre histoire, votre passion, ce qui rend votre expérience unique..."
                  />
                </div>
              </div>

              <div className="col-span-2 border-t border-gray-100 pt-6 mt-2">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-gray-500" />
                  Informations Légales (Obligatoires)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Numéro SIRET <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Building className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={profileForm.siret}
                        onChange={(e) => handleProfileChange('siret', e.target.value)}
                        className={`pl-10 block w-full rounded-lg shadow-sm sm:text-sm h-11 transition-shadow ${!profileForm.siret ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-amber-50/30' : 'border-gray-300 focus:border-primary focus:ring-primary'}`}
                        placeholder="123 456 789 00012"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Indispensable pour l'émission des factures en votre nom.</p>
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Numéro TVA Intracommunautaire</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={profileForm.tva_intra}
                        onChange={(e) => handleProfileChange('tva_intra', e.target.value)}
                        className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-11 transition-shadow"
                        placeholder="FR 12 345678901"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Si vous êtes assujetti à la TVA.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section Notifications email */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="bg-primary/10 p-2.5 rounded-lg w-fit">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Préférences de notifications</h2>
                <p className="text-sm text-gray-500">Gérez les emails que vous recevez.</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {Object.entries(profileForm.notification_settings).map(([key, value]) => (
                <label key={key} className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 cursor-pointer transition-all border border-gray-100 hover:border-primary/20 hover:shadow-sm">
                  <span className="text-gray-900 font-medium">
                    {key === 'new_booking' && 'Nouvelle réservation reçue'}
                    {key === 'booking_reminder' && 'Rappel (24h avant)'}
                    {key === 'booking_cancellation' && 'Annulation client'}
                    {key === 'marketing' && 'Actualités et conseils Nowme'}
                  </span>
                  <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => handleNotificationChange(key, e.target.checked)}
                      className="peer appearance-none w-12 h-6 bg-gray-200 rounded-full cursor-pointer transition-colors duration-300 checked:bg-primary"
                    />
                    <span className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 peer-checked:translate-x-6 shadow-sm"></span>
                  </div>
                </label>
              ))}
            </div>
          </section>


          {/* Section Contrats */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="bg-primary/10 p-2.5 rounded-lg w-fit">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Affiliation & Contrat</h2>
                <p className="text-sm text-gray-500">Gérez votre contrat partenarial.</p>
              </div>
            </div>
            <div className="p-6 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Mandat de Gestion</h3>
                <p className="text-sm text-gray-500 mt-1">Consultez votre contrat signé électroniquement.</p>
                {profileForm.contract_signed_at && (
                  <p className="text-xs text-green-600 mt-2 flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Signé le {new Date(profileForm.contract_signed_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Link
                to="/partner/contract"
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Voir mon contrat
              </Link>
            </div>
          </section>

          {/* Zone de Danger */}
          <section className="bg-red-50 rounded-xl shadow-sm border border-red-100 overflow-hidden">
            <div className="p-6 border-b border-red-100 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="bg-white p-2.5 rounded-lg w-fit border border-red-100">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-red-900">Zone de Danger</h2>
                <p className="text-sm text-red-700">Actions irréversibles.</p>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-red-900">Supprimer mon compte partenaire</h3>
                  <p className="text-sm text-red-700 mt-1 max-w-xl">
                    Attention : cette action supprimera définitivement votre compte, vos offres, vos réservations et toutes vos données associées.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 bg-white border border-red-200 text-red-600 font-medium rounded-lg hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors shadow-sm"
                >
                  Supprimer mon compte
                </button>
              </div>
            </div>
          </section>

        </div>

      </div>

      {/* Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 md:pl-64">
        <div className="max-w-4xl mx-auto flex justify-end">
          <button
            onClick={handleSave}
            className="px-8 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all shadow-lg hover:shadow-primary/25 transform active:scale-95 flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Enregistrer les modifications
          </button>
        </div>
      </div>

      {/* Password Change Modal */}
      {
        isPasswordModalOpen && (
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
        )
      }
    </div >
  );
}
