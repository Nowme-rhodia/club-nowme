import React, { useState, useEffect } from 'react';
import { SEO } from '../../components/SEO';
import { useAuth } from '../../lib/auth';
import { User, Mail, Phone, Calendar, MapPin, Save, Camera, Sparkles, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';


export default function Profile() {
  const { profile, refreshProfile } = useAuth();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    whatsapp_number: '',
    delivery_address: '',
    latitude: undefined as number | undefined | null,
    longitude: undefined as number | undefined | null,
    photo_url: ''
  });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  // Google Maps is loaded globally in App.tsx
  // We can use initOnMount: true (default)

  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: { types: ['address'], componentRestrictions: { country: 'fr' } },
    debounce: 300,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        whatsapp_number: (profile as any).whatsapp_number || '',
        delivery_address: (profile as any).delivery_address || '',
        latitude: (profile as any).latitude,
        longitude: (profile as any).longitude,
        photo_url: profile.photo_url || ''
      });

      setValue((profile as any).delivery_address || '');

      // Auto-enter edit mode if address is missing to encourage completion
      if (!(profile as any).delivery_address) {
        setEditing(true);
      }
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    let lat = formData.latitude;
    let lng = formData.longitude;

    try {
      // Force geocoding if address exists but coords are missing
      if (formData.delivery_address && (!lat || !lng)) {
        try {
          console.log("📍 Attempting to geocode missing coordinates for:", formData.delivery_address);
          const results = await getGeocode({ address: formData.delivery_address });
          if (results && results.length > 0) {
            const { lat: newLat, lng: newLng } = await getLatLng(results[0]);
            lat = newLat;
            lng = newLng;
            console.log("✅ Geocoded success:", { lat, lng });
            // Update local state too so UI reflects it immediately
            setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
          }
        } catch (geoError) {
          console.error("Geocoding failed during save:", geoError);
          // Don't block save, but maybe warn?
        }
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          whatsapp_number: formData.whatsapp_number,
          delivery_address: formData.delivery_address,
          latitude: lat,
          longitude: lng,
          photo_url: formData.photo_url
        })
        .eq('user_id', profile?.user_id);

      if (error) throw error;

      toast.success('Profil mis à jour !');
      setEditing(false);
      refreshProfile(); // Refresh context
    } catch (error) {
      console.error('Error updating profile:', error);

      toast.error('Erreur lors de la mise à jour.');
    } finally {
      setLoading(false);
    }
  };

  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      setUploading(true);
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile?.user_id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, photo_url: data.publicUrl }));
      setShowAvatarSelector(false);
      toast.success('Photo téléchargée !');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  const generateFunnyHead = (style: string) => {
    const seed = Math.random().toString(36).substring(7);
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
  };



  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F4] via-white to-[#FDF8F4] py-12">
      <SEO
        title="Mes informations"
        description="Gérez vos informations personnelles"
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-soft p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Mes informations</h1>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                Modifier
              </button>
            )}
          </div>

          <div className="flex flex-col items-center mb-8 relative">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100 relative group">
              {formData.photo_url ? (
                <img src={formData.photo_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-purple-100 text-purple-300">
                  <User size={48} />
                </div>
              )}

              {editing && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => setShowAvatarSelector(true)}>
                  <Camera className="text-white w-8 h-8" />
                </div>
              )}

              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-xs animate-pulse">Chargement...</span>
                </div>
              )}
            </div>
            {editing && (
              <button
                onClick={() => setShowAvatarSelector(true)}
                className="mt-2 text-sm text-primary font-medium flex items-center gap-1 hover:underline"
              >
                <Sparkles size={14} /> Changer ma photo
              </button>
            )}
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Prénom</label>
                <div className={`flex items-center gap-3 p-3 rounded-lg ${editing ? 'bg-white border border-gray-200 focus-within:ring-2 focus-within:ring-primary/20' : 'bg-gray-50'}`}>
                  <User className="w-4 h-4 text-gray-400" />
                  <input
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    disabled={!editing}
                    className="bg-transparent border-none outline-none w-full text-gray-900 placeholder-gray-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nom</label>
                <div className={`flex items-center gap-3 p-3 rounded-lg ${editing ? 'bg-white border border-gray-200 focus-within:ring-2 focus-within:ring-primary/20' : 'bg-gray-50'}`}>
                  <User className="w-4 h-4 text-gray-400" />
                  <input
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    disabled={!editing}
                    className="bg-transparent border-none outline-none w-full text-gray-900 placeholder-gray-400"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email (non modifiable)</label>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/50">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">{formData.email}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Téléphone</label>
              <div className={`flex items-center gap-3 p-3 rounded-lg ${editing ? 'bg-white border border-gray-200 focus-within:ring-2 focus-within:ring-primary/20' : 'bg-gray-50'}`}>
                <Phone className="w-4 h-4 text-gray-400" />
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={!editing}
                  placeholder="+33 6..."
                  className="bg-transparent border-none outline-none w-full text-gray-900 placeholder-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Numéro WhatsApp (pour le groupe)</label>
              <div className={`flex items-center gap-3 p-3 rounded-lg ${editing ? 'bg-white border border-gray-200 focus-within:ring-2 focus-within:ring-primary/20' : 'bg-gray-50'}`}>
                <span className="text-gray-400 text-xs">💬</span>
                <input
                  name="whatsapp_number"
                  value={formData.whatsapp_number}
                  onChange={handleChange}
                  disabled={!editing}
                  placeholder="Si différent..."
                  className="bg-transparent border-none outline-none w-full text-gray-900 placeholder-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Adresse de livraison (pour les cadeaux !)</label>

              {/* Warning if address is set but not geocoded */}
              {formData.delivery_address && !formData.latitude && !editing && (
                <div className="mb-2 bg-amber-50 text-amber-800 text-xs p-2 rounded-lg flex items-center gap-2 border border-amber-100">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <strong>Adresse non localisée.</strong>
                    <p className="text-gray-500 text-sm mt-1">
                      votre quartier ou votre ville. Utile pour les futurs événements locaux.
                    </p>  </div>
                </div>
              )}

              <div className={`relative flex items-start gap-3 p-3 rounded-lg ${editing ? 'bg-white border border-gray-200 focus-within:ring-2 focus-within:ring-primary/20' : 'bg-gray-50'}`}>
                <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                {editing ? (
                  <div className="w-full relative">
                    <input
                      name="delivery_address" // Add name attribute for handleChange
                      value={value}
                      onChange={(e) => {
                        setValue(e.target.value);
                        handleChange(e as any); // Sync manual text
                      }}
                      placeholder="3 rue de la Paix, 75000 Paris"
                      className="bg-transparent border-none outline-none w-full text-gray-900 placeholder-gray-400 font-sans"
                    />
                    {status === "OK" && (
                      <ul className="absolute z-50 left-0 w-full bg-white border border-gray-100 rounded-xl mt-2 shadow-xl max-h-60 overflow-auto">
                        {data.map(({ place_id, description }) => (
                          <li
                            key={place_id}
                            onClick={async () => {
                              setValue(description, false);
                              clearSuggestions();
                              try {
                                const results = await getGeocode({ address: description });
                                const { lat, lng } = await getLatLng(results[0]);
                                setFormData((prev: any) => ({
                                  ...prev,
                                  delivery_address: description,
                                  latitude: lat,
                                  longitude: lng
                                }));
                              } catch (err) { console.error("Geocoding failed", err); }
                            }}
                            className="p-3 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0"
                          >
                            {description}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-900 w-full">{formData.delivery_address || 'Non renseignée'}</p>
                )}
              </div>
            </div>

            {editing && (
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {loading ? <span className="animate-spin">⏳</span> : <Save className="w-4 h-4" />}
                  Enregistrer
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Funny Head Selector Modal */}
      {showAvatarSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Choisis ta tête !</h3>
              <button onClick={() => setShowAvatarSelector(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Importer ma photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="block w-full text-sm text-gray-500
                   file:mr-4 file:py-2 file:px-4
                   file:rounded-full file:border-0
                   file:text-sm file:font-semibold
                   file:bg-primary/10 file:text-primary
                   hover:file:bg-primary/20
                 "
              />
            </div>

            <h4 className="text-sm font-medium text-gray-700 mb-3 block">Ou choisis une "Tête Rigolote" (Lorelei) 👇</h4>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {/* Generate 8 random Lorelei Neutral options */}
              {Array.from({ length: 8 }).map((_, index) => {
                const seed = Math.random().toString(36).substring(7);
                const avatarUrl = `https://api.dicebear.com/7.x/lorelei-neutral/svg?seed=${seed}`;

                return (
                  <button
                    key={index}
                    onClick={() => {
                      setFormData({ ...formData, photo_url: avatarUrl });
                      setShowAvatarSelector(false);
                    }}
                    className="aspect-square rounded-xl overflow-hidden hover:ring-2 hover:ring-primary transition-all p-2 bg-gray-50"
                  >
                    <img
                      src={avatarUrl}
                      alt="Avatar option"
                      className="w-full h-full object-contain"
                    />
                  </button>
                );
              })}

              {/* Randomize Option */}
              <button
                onClick={() => {
                  setFormData({ ...formData, photo_url: generateFunnyHead('lorelei-neutral') });
                  setShowAvatarSelector(false);
                }}
                className="aspect-square rounded-xl border-2 border-dashed border-primary/30 flex flex-col items-center justify-center text-primary hover:bg-primary/5"
              >
                <Sparkles className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">Autre hasard</span>
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">Ou colle une URL d'image</label>
              <div className="flex gap-2">
                <input
                  value={formData.photo_url}
                  onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="https://..."
                />
                <button
                  onClick={() => setShowAvatarSelector(false)}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
