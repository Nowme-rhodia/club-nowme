import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Globe,
  Instagram,
  Facebook,
  Clock,
  AlertCircle,
  CheckCircle,
  Upload,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { LocationSearch } from '../../components/LocationSearch';

interface ProfileData {
  businessName: string;
  description: string;
  siret: string;
  address: string;
  coordinates?: { lat: number; lng: number };
  website: string;
  instagram: string;
  facebook: string;
  logoUrl: string;
  openingHours: {
    [key: string]: { open: string; close: string } | null;
  };
}

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function CompleteProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [partnerStatus, setPartnerStatus] = useState<string>('');

  const [formData, setFormData] = useState<ProfileData>({
    businessName: '',
    description: '',
    siret: '',
    address: '',
    website: '',
    instagram: '',
    facebook: '',
    logoUrl: '',
    openingHours: {
      monday: { open: '09:00', close: '19:00' },
      tuesday: { open: '09:00', close: '19:00' },
      wednesday: { open: '09:00', close: '19:00' },
      thursday: { open: '09:00', close: '19:00' },
      friday: { open: '09:00', close: '19:00' },
      saturday: { open: '10:00', close: '17:00' },
      sunday: null,
    },
  });

  useEffect(() => {
    loadPartnerData();
  }, [user]);

  const loadPartnerData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setPartnerStatus(data.status || 'pending');

        // Si le partenaire n'est pas approuvé, rediriger
        if (data.status !== 'approved') {
          navigate('/partner/dashboard');
          return;
        }

        // Charger les données existantes
        setFormData({
          businessName: data.business_name || '',
          description: data.description || '',
          siret: data.siret || '',
          address: data.address || '',
          coordinates: data.coordinates ? { lat: data.coordinates[0], lng: data.coordinates[1] } : undefined,
          website: data.website || '',
          instagram: data.instagram || '',
          facebook: data.facebook || '',
          logoUrl: data.logo_url || '',
          openingHours: data.opening_hours || formData.openingHours,
        });
      }
    } catch (err) {
      console.error('Error loading partner data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    setFormData((prev) => ({
      ...prev,
      address: location.address,
      coordinates: { lat: location.lat, lng: location.lng },
    }));
  };

  const handleHoursChange = (day: string, field: 'open' | 'close', value: string) => {
    setFormData((prev) => ({
      ...prev,
      openingHours: {
        ...prev.openingHours,
        [day]: prev.openingHours[day] ? { ...prev.openingHours[day]!, [field]: value } : null,
      },
    }));
  };

  const toggleDayClosed = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      openingHours: {
        ...prev.openingHours,
        [day]: prev.openingHours[day] ? null : { open: '09:00', close: '19:00' },
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation
    if (!formData.businessName || !formData.siret || !formData.address) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!/^[0-9]{14}$/.test(formData.siret)) {
      setError('Le SIRET doit contenir 14 chiffres');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('partners')
        .update({
          business_name: formData.businessName,
          description: formData.description,
          siret: formData.siret,
          address: formData.address,
          coordinates: formData.coordinates ? `(${formData.coordinates.lat},${formData.coordinates.lng})` : null,
          website: formData.website || null,
          instagram: formData.instagram || null,
          facebook: formData.facebook || null,
          logo_url: formData.logoUrl || null,
          opening_hours: formData.openingHours,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        navigate('/partner/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Erreur lors de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Profil complété !</h2>
          <p className="text-gray-600">
            Votre profil a été mis à jour avec succès. Vous allez être redirigé vers votre
            dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Complétez votre profil</h1>
            <p className="text-gray-600">
              Votre demande a été approuvée ! Complétez maintenant votre profil pour commencer à
              publier des offres.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Informations générales */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-primary" />
                Informations générales
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de l'entreprise <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description de votre activité
                  </label>
                  <textarea
                    name="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    placeholder="Décrivez votre entreprise et vos services..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SIRET <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="siret"
                    value={formData.siret}
                    onChange={handleChange}
                    maxLength={14}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="12345678901234"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">14 chiffres</p>
                </div>
              </div>
            </div>

            {/* Localisation */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-primary" />
                Localisation
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse complète <span className="text-red-500">*</span>
                  </label>
                  <LocationSearch onSelect={handleLocationSelect} />
                  {formData.address && (
                    <input
                      type="text"
                      value={formData.address}
                      readOnly
                      className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Présence en ligne */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Globe className="w-5 h-5 mr-2 text-primary" />
                Présence en ligne
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Site web
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="https://votre-site.fr"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Instagram className="w-4 h-4 inline mr-1" />
                      Instagram <span className="text-gray-400 font-normal">(URL commençant par https://)</span>
                    </label>
                    <input
                      type="url"
                      name="instagram"
                      value={formData.instagram}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="https://instagram.com/votre_compte"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Facebook className="w-4 h-4 inline mr-1" />
                      Facebook <span className="text-gray-400 font-normal">(URL commençant par https://)</span>
                    </label>
                    <input
                      type="url"
                      name="facebook"
                      value={formData.facebook}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="https://facebook.com/VotrePage"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Upload className="w-4 h-4 inline mr-1" />
                    Logo (URL)
                  </label>
                  <input
                    type="url"
                    name="logoUrl"
                    value={formData.logoUrl}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="https://exemple.com/logo.png"
                  />
                </div>
              </div>
            </div>

            {/* Horaires d'ouverture */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-primary" />
                Horaires d'ouverture
              </h2>
              <div className="space-y-3">
                {DAY_KEYS.map((dayKey, index) => (
                  <div key={dayKey} className="flex items-center gap-4">
                    <div className="w-24 font-medium text-gray-700">{DAYS[index]}</div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.openingHours[dayKey] !== null}
                        onChange={() => toggleDayClosed(dayKey)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-600">Ouvert</span>
                    </label>
                    {formData.openingHours[dayKey] && (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={formData.openingHours[dayKey]!.open}
                          onChange={(e) => handleHoursChange(dayKey, 'open', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="time"
                          value={formData.openingHours[dayKey]!.close}
                          onChange={(e) => handleHoursChange(dayKey, 'close', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Boutons */}
            <div className="flex justify-end gap-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => navigate('/partner/dashboard')}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Plus tard
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer et continuer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
