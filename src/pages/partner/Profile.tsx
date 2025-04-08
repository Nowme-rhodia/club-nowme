import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { Building2, User, Phone, Mail, Globe, AlertCircle } from 'lucide-react';

interface PartnerProfile {
  id: string;
  business_name: string;
  contact_name: string;
  phone: string;
  website?: string;
}

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<PartnerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setFormData(data);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Erreur lors du chargement du profil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !user) return;

    setIsSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('partners')
        .update({
          business_name: formData.business_name,
          contact_name: formData.contact_name,
          phone: formData.phone,
          website: formData.website
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile(formData);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Erreur lors de la mise à jour du profil');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Profil partenaire
            </h1>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-primary hover:text-primary-dark transition-colors"
              >
                Modifier
              </button>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="business_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'entreprise
                </label>
                <input
                  type="text"
                  id="business_name"
                  value={formData?.business_name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev!, business_name: e.target.value }))}
                  className="block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary focus:ring focus:ring-primary/20"
                  required
                />
              </div>

              <div>
                <label htmlFor="contact_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du contact
                </label>
                <input
                  type="text"
                  id="contact_name"
                  value={formData?.contact_name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev!, contact_name: e.target.value }))}
                  className="block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary focus:ring focus:ring-primary/20"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData?.phone || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev!, phone: e.target.value }))}
                  className="block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary focus:ring focus:ring-primary/20"
                  required
                />
              </div>

              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                  Site web (optionnel)
                </label>
                <input
                  type="url"
                  id="website"
                  value={formData?.website || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev!, website: e.target.value }))}
                  className="block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-primary focus:ring focus:ring-primary/20"
                  placeholder="https://"
                />
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData(profile);
                    setError(null);
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={isSaving}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:bg-gray-400"
                >
                  {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <Building2 className="w-6 h-6 text-primary shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-900">Entreprise</h3>
                  <p className="text-gray-600">{profile?.business_name}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <User className="w-6 h-6 text-primary shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-900">Contact</h3>
                  <p className="text-gray-600">{profile?.contact_name}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <Phone className="w-6 h-6 text-primary shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-900">Téléphone</h3>
                  <p className="text-gray-600">{profile?.phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <Mail className="w-6 h-6 text-primary shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-900">Email</h3>
                  <p className="text-gray-600">{user?.email}</p>
                </div>
              </div>

              {profile?.website && (
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <Globe className="w-6 h-6 text-primary shrink-0" />
                  <div>
                    <h3 className="font-medium text-gray-900">Site web</h3>
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-dark"
                    >
                      {profile.website}
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}