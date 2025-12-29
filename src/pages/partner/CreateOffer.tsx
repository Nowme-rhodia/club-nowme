import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { categories } from '../../data/categories';
import { Plus, Trash2, Info, Image as ImageIcon, X, Euro } from 'lucide-react';
import toast from 'react-hot-toast';
import { LocationSearch } from '../../components/LocationSearch';
import { PartnerCalendlySettings } from '../../components/partner/PartnerCalendlySettings';

interface CreateOfferProps {
  offer?: any;
  onClose: () => void;
  onSuccess: () => void;
}

interface OfferMedia {
  id?: string;
  url: string;
  type: string;
}

interface Variant {
  id?: string;
  name: string;
  description: string;
  price: string;
  discounted_price?: string;
  stock: string;
  has_stock: boolean;
}

export default function CreateOffer({ offer, onClose, onSuccess }: CreateOfferProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [partnerId, setPartnerId] = useState<string>(''); // Add partnerId state

  // Image Upload State
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [additionalImages, setAdditionalImages] = useState<File[]>([]);
  const [existingMedia, setExistingMedia] = useState<OfferMedia[]>([]);

  // Basic Info
  const [categorySlug, setCategorySlug] = useState('');
  const [subcategorySlug, setSubcategorySlug] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationState, setLocationState] = useState({
    street_address: '',
    zip_code: '',
    city: '',
    department: '',
    coordinates: null as [number, number] | null
  });

  // Type & Specifics
  const [eventType, setEventType] = useState<'calendly' | 'event' | 'promo' | 'purchase'>('calendly');
  const [eventDate, setEventDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [calendlyUrl, setCalendlyUrl] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [promoCode, setPromoCode] = useState('');

  // Variants
  const [variants, setVariants] = useState<Variant[]>([
    { name: 'Tarif Standard', description: '', price: '', stock: '', has_stock: false }
  ]);

  // Fetch Partner ID
  React.useEffect(() => {
    async function fetchPartnerId() {
      if (!user) return;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('partner_id')
        .eq('user_id', user.id)
        .single();

      if (data?.partner_id) {
        setPartnerId(data.partner_id);
      }
    }
    fetchPartnerId();
  }, [user]);

  // Populate form if editing
  React.useEffect(() => {
    if (offer) {
      setTitle(offer.title);
      setDescription(offer.description);

      // Handle category slug parsing from offer.category object if present
      // or directly from offer.category_slug / offer.subcategory_slug
      const catSlug = offer.category?.parent_slug || offer.category_slug || '';
      const subSlug = offer.category?.parent_slug ? offer.category.slug : (offer.subcategory_slug || '');

      setCategorySlug(catSlug);
      setSubcategorySlug(subSlug);

      setLocationState({
        street_address: offer.street_address || '',
        zip_code: offer.zip_code || '',
        city: offer.city || '',
        department: offer.department || '',
        coordinates: offer.coordinates
          ? (typeof offer.coordinates === 'string'
            ? (() => {
              const m = offer.coordinates.match(/\((.*),(.*)\)/);
              return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
            })()
            : offer.coordinates)
          : null
      });

      setEventType(offer.booking_type || 'calendly');

      // Helper to format ISO date to YYYY-MM-DDTHH:mm for datetime-local input
      const formatDateTimeForInput = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };

      setEventDate(offer.event_start_date ? formatDateTimeForInput(offer.event_start_date) : '');
      setEventEndDate(offer.event_end_date ? formatDateTimeForInput(offer.event_end_date) : '');
      setCalendlyUrl(offer.calendly_url || '');
      setExternalLink(offer.external_link || '');
      setPromoCode(offer.promo_code || '');

      if (offer.offer_variants && offer.offer_variants.length > 0) {
        setVariants(offer.offer_variants.map((v: any) => ({
          id: v.id,
          name: v.name,
          description: v.description || '',
          price: v.price.toString(),
          discounted_price: v.discounted_price?.toString() || '',
          stock: v.stock !== null ? v.stock.toString() : '',
          has_stock: v.stock !== null
        })));
      } else if (offer.variants && offer.variants.length > 0) {
        // Fallback for when variants are passed via offers query alias
        setVariants(offer.variants.map((v: any) => ({
          id: v.id, // Ensure ID is preserved for updates
          name: v.name,
          description: v.description || '',
          price: v.price.toString(),
          discounted_price: v.discounted_price?.toString() || '',
          stock: v.stock !== null ? v.stock.toString() : '',
          has_stock: v.stock !== null
        })));
      }

      // Handle Media (both original field name and alias)
      const mediaList = offer.offer_media || offer.media || [];
      const coverUrl = offer.image_url || mediaList[0]?.url || null;

      setCoverImagePreview(coverUrl);

      if (mediaList.length > 0) {
        // Filter out main image if needed, or just map all
        setExistingMedia(mediaList.map((m: any) => ({ id: m.id, url: m.url, type: m.type || 'image' })));
      }
    }
  }, [offer]);

  const handleAdditionalImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAdditionalImages(prev => [...prev, ...newFiles]);
    }
  };

  const removeAdditionalImage = (index: number) => {
    setAdditionalImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingMedia = async (mediaId: string) => {
    // Optimistic update
    setExistingMedia(prev => prev.filter(m => m.id !== mediaId));
    if (mediaId && offer?.id) {
      await supabase.from('offer_media').delete().eq('id', mediaId);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverImage(file);
      const objectUrl = URL.createObjectURL(file);
      setCoverImagePreview(objectUrl);
    }
  };

  const addVariant = () => {
    setVariants([...variants, { name: '', description: '', price: '', stock: '', has_stock: false }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    }
  };

  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Validation
      if (!categorySlug || !title || !description) {
        toast.error('Veuillez remplir les champs obligatoires (Catégorie, Titre, Description)');
        setLoading(false);
        return;
      }

      if (eventType === 'event' && (!eventDate)) {
        toast.error('La date de début est obligatoire pour un événement');
        setLoading(false);
        return;
      }

      if (eventType === 'calendly' && !calendlyUrl) {
        toast.error('L\'URL Calendly est obligatoire');
        setLoading(false);
        return;
      }

      const validVariants = variants.filter(v => v.name && v.price);
      if (validVariants.length === 0) {
        toast.error('Veuillez ajouter au moins un tarif valide (Nom et Prix)');
        setLoading(false);
        return;
      }

      // 2. Upload Image
      let uploadedImageUrl = offer?.image_url;
      if (coverImage) {
        setIsUploading(true);
        const fileExt = coverImage.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('offer-images')
          .upload(fileName, coverImage);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error("Erreur lors de l'upload de l'image");
          setIsUploading(false);
          setLoading(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('offer-images')
          .getPublicUrl(fileName);

        uploadedImageUrl = publicUrl;
        setIsUploading(false);
      }

      // 2.5 Upload Additional Images
      const uploadedMediaUrls: string[] = [];
      if (additionalImages.length > 0) {
        setIsUploading(true);
        for (const file of additionalImages) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const { error: uploadEr } = await supabase.storage.from('offer-images').upload(fileName, file);
          if (!uploadEr) {
            const { data: { publicUrl } } = supabase.storage.from('offer-images').getPublicUrl(fileName);
            uploadedMediaUrls.push(publicUrl);
          }
        }
        setIsUploading(false);
      }

      // 3. Get Partner ID (if not already known, but usually we do this once)
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('partner_id')
        .eq('user_id', user?.id)
        .single();

      if (profileError || !profileData?.partner_id) {
        toast.error('Profil partenaire introuvable');
        setLoading(false);
        return;
      }

      // 4. Get Category ID
      const { data: categoryData } = await supabase
        .from('offer_categories')
        .select('id')
        .eq('slug', subcategorySlug || categorySlug)
        .single();

      if (!categoryData) {
        toast.error('Catégorie invalide');
        setLoading(false);
        return;
      }

      const offerData = {
        partner_id: profileData.partner_id,
        title,
        description,
        category_id: categoryData.id,
        booking_type: eventType,
        calendly_url: eventType === 'calendly' ? calendlyUrl : null,
        event_start_date: eventType === 'event' ? eventDate : null,
        event_end_date: eventType === 'event' ? eventEndDate : null,
        external_link: eventType === 'promo' ? externalLink : null,
        promo_code: eventType === 'promo' ? promoCode : null,
        street_address: locationState.street_address,
        zip_code: locationState.zip_code,
        city: locationState.city,
        department: locationState.department,
        coordinates: locationState.coordinates ? `(${locationState.coordinates[0]},${locationState.coordinates[1]})` : null,
        image_url: uploadedImageUrl,
        // Status remains mostly unchanged or resets to draft if needed, but let's keep it simple
        status: offer ? offer.status : 'draft'
      };

      let outputOfferId = offer?.id;

      if (offer) {
        // UPDATE
        const { error: updateError } = await supabase
          .from('offers')
          .update(offerData)
          .eq('id', offer.id);

        if (updateError) throw updateError;
        toast.success("Offre mise à jour");
      } else {
        // CREATE
        const { data: newOffer, error: createError } = await supabase
          .from('offers')
          .insert(offerData)
          .select()
          .single();

        if (createError) throw createError;
        outputOfferId = newOffer.id;
        toast.success("Offre créée en brouillon !");
      }

      // 4.5 Secure Offer Editing Logic - AFTER Creation/Update
      if (offer && (offer.status === 'approved' || offer.status === 'active' || offer.is_approved)) {
        // Reset status to pending
        const { error: resetError } = await (supabase
          .from('offers') as any)
          .update({
            status: 'pending',
            is_approved: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', offer.id);

        if (resetError) console.error("Error resetting status", resetError);

        // Notify Admin
        const partnerName = user?.email || "Partenaire"; // Fallback, normally fetched from profile
        await supabase.functions.invoke('send-offer-notification', {
          body: {
            offerId: offer.id,
            offerTitle: title,
            partnerName: partnerName
          }
        });

        toast('Offre passée en validation suite aux modifications', { icon: '⚠️' });
      }

      // 5. Handle Variants (Delete all and re-create for simplicity in update)
      if (offer) {
        await supabase.from('offer_variants').delete().eq('offer_id', offer.id);
      }

      // 3. Upsert Variants
      // 3. Upsert Variants
      const variantsToUpsert = validVariants.map(v => {
        const variantData: any = {
          offer_id: outputOfferId,
          name: v.name,
          description: v.description,
          price: parseFloat(v.price),
          discounted_price: v.discounted_price ? parseFloat(v.discounted_price) : null,
          stock: v.has_stock && v.stock ? parseInt(v.stock) : null
        };
        // Only include ID if it's a real Update (not a new variant)
        if (v.id) {
          variantData.id = v.id;
        }
        return variantData;
      });

      // Separate new and existing variants if needed or just upsert with ID
      const { error: variantsError } = await supabase
        .from('offer_variants')
        .upsert(variantsToUpsert); // upsert works if ID matches

      if (variantsError) throw variantsError;

      // 6. Handle Media Insert
      if (uploadedMediaUrls.length > 0) {
        const mediaToInsert = uploadedMediaUrls.map((url, idx) => ({
          offer_id: outputOfferId,
          url: url,
          type: 'image',
          order_index: idx
        }));
        const { error: mediaError } = await supabase.from('offer_media').insert(mediaToInsert);
        if (mediaError) console.error("Error saving media:", mediaError);
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const parentCategories = categories;
  const subCategories = categories.find(c => c.slug === categorySlug)?.subcategories || [];

  return (
    <div className="bg-white rounded-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {offer ? 'Modifier l\'offre' : 'Créer une nouvelle offre'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {offer && (offer.status === 'approved' || offer.is_approved) && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Info className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <span className="font-bold">Attention :</span> toute modification d'une offre active entraînera sa
                  suspension temporaire (statut "En validation") le temps de sa re-validation par notre équipe (sous 48h).
                  Elle ne sera plus visible du public pendant ce laps de temps.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* --- Image --- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Image d'illustration ({offer ? 'actuelle conservée si non modifiée' : 'obligatoire'})</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary transition-colors">
              <div className="space-y-1 text-center">
                {coverImagePreview ? (
                  <div className="relative">
                    <img src={coverImagePreview} alt="Aperçu" className="mx-auto h-48 object-cover rounded-md" />
                    <button
                      type="button"
                      onClick={() => { setCoverImage(null); setCoverImagePreview(null); }}
                      className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600 justify-center">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark">
                        <span>Télécharger un fichier</span>
                        <input type="file" className="sr-only" accept="image/*" onChange={handleImageSelect} />
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* --- Global Gallery --- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Galerie Photos (Optionnel)</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {existingMedia.map((media) => (
                <div key={media.id} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img src={media.url} alt="Galerie" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => media.id && removeExistingMedia(media.id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {additionalImages.map((file, idx) => (
                <div key={idx} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeAdditionalImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary aspect-square">
                <Plus className="w-8 h-8 text-gray-400" />
                <span className="text-xs text-gray-500 mt-2">Ajouter</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleAdditionalImagesSelect} />
              </label>
            </div>
          </div>

          {/* --- Catégorie (First per requirements) --- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie *</label>
              <select
                value={categorySlug}
                onChange={(e) => { setCategorySlug(e.target.value); setSubcategorySlug(''); }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                required
              >
                <option value="">Sélectionnez une catégorie</option>
                {parentCategories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sous-catégorie *</label>
              <select
                value={subcategorySlug}
                onChange={(e) => setSubcategorySlug(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                disabled={!categorySlug}
                required
              >
                <option value="">Sélectionnez une sous-catégorie</option>
                {subCategories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* --- Basic Info --- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Titre de l'offre *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              placeholder="Ex: Séance de Yoga Vinyasa"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
              required
            />
          </div>

          {/* --- Location --- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Localisation *</label>
            <LocationSearch
              onSelect={(loc) => {
                setLocationState({
                  street_address: loc.street_address || '',
                  zip_code: loc.zip_code || '',
                  city: loc.city || '',
                  department: loc.department || '',
                  coordinates: [loc.lat, loc.lng]
                });
              }}
              initialValue={locationState.street_address ? `${locationState.street_address}, ${locationState.city}` : ''}
            />
          </div>

          {/* --- Type --- */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Type de réservation</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
              {[
                { id: 'calendly', label: 'Rendez-vous' },
                { id: 'event', label: 'Événement' },
                { id: 'promo', label: 'Code Promo' },
                { id: 'purchase', label: 'Achat Simple' }
              ].map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setEventType(type.id as any)}
                  className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${eventType === type.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            {/* Conditional Fields */}
            {eventType === 'calendly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Calendly</label>
                <input
                  type="url"
                  value={calendlyUrl}
                  onChange={(e) => setCalendlyUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="https://calendly.com/..."
                />

                {/* Integration Info */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <PartnerCalendlySettings
                    partnerId={partnerId}
                    initialToken={null}
                    onUpdate={() => toast.success('Config mise à jour')}
                  />
                </div>
              </div>
            )}

            {eventType === 'event' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Début</label>
                  <input
                    type="datetime-local"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
                  <input
                    type="datetime-local"
                    value={eventEndDate}
                    onChange={(e) => setEventEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            )}

            {eventType === 'promo' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lien de l'offre</label>
                  <input
                    type="url"
                    value={externalLink}
                    onChange={(e) => setExternalLink(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code Promo</label>
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          {/* --- Variants --- */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">Tarifs & Options</label>
              <button
                type="button"
                onClick={addVariant}
                className="text-sm text-primary font-medium hover:text-primary-dark flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" /> Ajouter une option
              </button>
            </div>

            <div className="space-y-4">
              {variants.map((variant, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-xl border border-gray-200 relative group">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="text-xs text-gray-500">Nom de l'option (ex: Solo, Duo)</label>
                      <input
                        type="text"
                        value={variant.name}
                        onChange={(e) => updateVariant(index, 'name', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Standard"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Prix (€)</label>
                      <input
                        type="number"
                        value={variant.price}
                        onChange={(e) => updateVariant(index, 'price', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Prix Promo (€)</label>
                      <input
                        type="number"
                        value={variant.discounted_price || ''}
                        onChange={(e) => updateVariant(index, 'discounted_price', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="text-xs text-gray-500">Description courte (optionnel)</label>
                    <input
                      type="text"
                      value={variant.description || ''}
                      onChange={(e) => updateVariant(index, 'description', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Donne accès à..."
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={variant.has_stock}
                        onChange={(e) => updateVariant(index, 'has_stock', e.target.checked)}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">Limiter les places</span>
                    </label>

                    {variant.has_stock && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Qté:</span>
                        <input
                          type="number"
                          value={variant.stock}
                          onChange={(e) => updateVariant(index, 'stock', e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    )}
                  </div>

                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* --- Submit --- */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || isUploading}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>

        </form>
      </div >
    </div >
  );
}
