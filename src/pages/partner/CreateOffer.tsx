import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { categories } from '../../data/categories';
import { Plus, Trash2, Info, X, Euro, Upload, Save, ArrowLeft, Image as ImageIcon, Link, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { AddressAutocomplete } from '../../components/AddressAutocomplete';
import { LocationSearch } from '../../components/LocationSearch';
import { PartnerCalendlySettings } from '../../components/partner/PartnerCalendlySettings';
import { translateError } from '../../lib/errorTranslations';

import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import DOMPurify from 'dompurify'; // Imported safely

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
  content: ContentItem[];
}

interface ContentItem {
  name: string;
  url: string;
  file_url: string;
}

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ['link', 'clean']
  ],
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list',
  'link'
];

const formatDateTimeForInput = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const offsetMs = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offsetMs);
  return localDate.toISOString().slice(0, 16);
};

export default function CreateOffer({ offer, onClose, onSuccess }: CreateOfferProps) {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [partnerId, setPartnerId] = useState<string>(''); // Add partnerId state
  const [partnersList, setPartnersList] = useState<{ id: string; business_name: string }[]>([]); // For Admin selection

  // Image Upload State
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [coverImageUrlInput, setCoverImageUrlInput] = useState('');
  const [coverImageMode, setCoverImageMode] = useState<'upload' | 'url'>('upload');
  const [videoUrl, setVideoUrl] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [additionalImages, setAdditionalImages] = useState<File[]>([]);
  const [additionalImageUrls, setAdditionalImageUrls] = useState<string[]>([]);
  const [existingMedia, setExistingMedia] = useState<OfferMedia[]>([]);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [newGalleryUrl, setNewGalleryUrl] = useState('');

  // Co-organizers
  const [coOrganizers, setCoOrganizers] = useState<any[]>([]);
  const [searchPartnerTerm, setSearchPartnerTerm] = useState('');
  const [partnerSearchResults, setPartnerSearchResults] = useState<any[]>([]);
  const [isSearchingPartners, setIsSearchingPartners] = useState(false);

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
  const [locationMode, setLocationMode] = useState<'physical' | 'online' | 'at_home'>('physical');
  const [serviceZones, setServiceZones] = useState<Array<{ code: string; fee: number }>>([]);
  const [eventType, setEventType] = useState<'calendly' | 'event' | 'promo' | 'purchase' | 'wallet_pack' | 'simple_access'>('event');
  const [eventDate, setEventDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [calendlyUrl, setCalendlyUrl] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoConditions, setPromoConditions] = useState('');
  const [accessPassword, setAccessPassword] = useState(''); // Password for restricted content
  const [digitalProductFile, setDigitalProductFile] = useState<string | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [cancellationPolicy, setCancellationPolicy] = useState<'flexible' | 'moderate' | 'strict' | 'non_refundable' | 'custom'>('flexible');
  const [customDeadline, setCustomDeadline] = useState<string>('');
  const [customDeadlineUnit, setCustomDeadlineUnit] = useState<'hours' | 'days' | 'weeks'>('days');

  // Duration
  const [durationType, setDurationType] = useState<'lifetime' | 'fixed'>('lifetime');
  const [validityStartDate, setValidityStartDate] = useState('');
  const [validityEndDate, setValidityEndDate] = useState('');

  // Variants
  const [variants, setVariants] = useState<Variant[]>([
    { name: 'Tarif Standard', description: '', price: '', discounted_price: '', stock: '', has_stock: false, content: [] }
  ]);

  const [installmentOptions, setInstallmentOptions] = useState<string[]>([]);
  const [additionalBenefits, setAdditionalBenefits] = useState('');

  // Auto-set policy for certain types
  React.useEffect(() => {
    if (eventType === 'purchase' || eventType === 'promo') {
      setCancellationPolicy('non_refundable');
    }
  }, [eventType]);

  // Fetch Partner ID
  React.useEffect(() => {
    async function fetchPartnerId() {
      // If we are editing an existing offer, use its partner_id
      if (offer && offer.partner_id) {
        setPartnerId(offer.partner_id);
        return;
      }

      // Otherwise, try to get it from the current user's profile
      if (!user) return;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('partner_id')
        .eq('user_id', (user as any).id)
        .single();

      if ((data as any)?.partner_id) {
        setPartnerId((data as any).partner_id);
      }
    }
    fetchPartnerId();
  }, [user, offer]);

  // Admin: Fetch all partners for selection
  React.useEffect(() => {
    if (isAdmin) {
      const fetchPartners = async () => {
        const { data, error } = await supabase
          .from('partners')
          .select('id, business_name')
          .eq('status', 'approved')
          .order('business_name');

        if (data) {
          setPartnersList(data);
          // If creating new offer and no partner selected, select first one? Or leave empty?
          // Let's leave empty to force selection or handle it gracefully
        }
      };
      fetchPartners();
    }
  }, [isAdmin]);

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

      setEventType(offer.booking_type || 'event');
      setPromoCode(offer.promo_code || '');
      setPromoConditions(offer.promo_conditions || '');
      setAccessPassword(offer.access_password || '');
      setDigitalProductFile(offer.digital_product_file || null);
      setCancellationPolicy(offer.cancellation_policy || 'flexible');
      setDigitalProductFile(offer.digital_product_file || null);
      setCancellationPolicy(offer.cancellation_policy || 'flexible');

      // Initialize Custom Deadline Unit
      if (offer.cancellation_deadline_hours) {
        const h = offer.cancellation_deadline_hours;
        if (h % 168 === 0) {
          setCustomDeadline((h / 168).toString());
          setCustomDeadlineUnit('weeks');
        } else if (h % 24 === 0) {
          setCustomDeadline((h / 24).toString());
          setCustomDeadlineUnit('days');
        } else {
          setCustomDeadline(h.toString());
          setCustomDeadlineUnit('hours');
        }
      } else {
        setCustomDeadline('');
        setCustomDeadlineUnit('days');
      }

      setInstallmentOptions(offer.installment_options || []);
      setAdditionalBenefits(offer.additional_benefits || '');

      setDurationType(offer.duration_type || 'lifetime');
      setValidityStartDate(offer.validity_start_date ? formatDateTimeForInput(offer.validity_start_date) : '');
      setEventDate(offer.event_start_date ? formatDateTimeForInput(offer.event_start_date) : '');
      setEventEndDate(offer.event_end_date ? formatDateTimeForInput(offer.event_end_date) : '');
      setExternalLink(offer.external_link || '');
      setCalendlyUrl((offer.booking_type === 'calendly' ? offer.external_link : '') || '');
      setVideoUrl(offer.video_url || '');

      // Load service zones if at_home schema
      if (offer.service_zones && Array.isArray(offer.service_zones)) {
        setServiceZones(offer.service_zones.map((z: any) => ({
          code: z.code,
          fee: z.fee ?? 0
        })));
      }

      // Determine Location Mode
      if (offer.is_online) {
        setLocationMode('online');
      } else if (offer.street_address === 'Au domicile du client') {
        setLocationMode('at_home');
      } else {
        setLocationMode('physical');
      }

      if (offer.offer_variants && offer.offer_variants.length > 0) {
        setVariants(offer.offer_variants.map((v: any) => ({
          id: v.id,
          name: v.name || '',
          description: v.description || '',
          price: v.price != null ? v.price.toString() : '',
          discounted_price: v.discounted_price != null ? v.discounted_price.toString() : '',
          stock: v.stock !== null ? v.stock.toString() : '',
          has_stock: v.stock !== null,
          content: v.content || []
        })));
      } else if (offer.variants && offer.variants.length > 0) {
        // Fallback for when variants are passed via offers query alias
        setVariants(offer.variants.map((v: any) => ({
          id: v.id, // Ensure ID is preserved for updates
          name: v.name || '',
          description: v.description || '',
          price: v.price != null ? v.price.toString() : '',
          discounted_price: v.discounted_price != null ? v.discounted_price.toString() : '',
          stock: v.stock !== null ? v.stock.toString() : '',
          has_stock: v.stock !== null,
          content: v.content || []
        })));
      }


      // Handle Media (both original field name and alias)
      const mediaList = offer.offer_media || offer.media || [];
      const coverUrl = offer.image_url || mediaList[0]?.url || null;

      setCoverImagePreview(coverUrl);
      if (coverUrl && !coverUrl.includes('storage')) {
        setCoverImageMode('url');
        setCoverImageUrlInput(coverUrl);
      }

      if (mediaList.length > 0) {
        // Filter out main image if needed, or just map all
        setExistingMedia(mediaList.map((m: any) => ({ id: m.id, url: m.url, type: m.type || 'image' })));
      }

      // Load Co-organizers
      const loadCoOrganizers = async () => {
        const { data } = await supabase
          .from('offer_co_organizers')
          .select('partner:partners(id, business_name, logo_url)')
          .eq('offer_id', offer.id);

        if (data) {
          setCoOrganizers(data.map((item: any) => item.partner));
        }
      };
      loadCoOrganizers();
    }
  }, [offer]);

  // Search Partners
  useEffect(() => {
    const searchPartners = async () => {
      if (searchPartnerTerm.length < 2) {
        setPartnerSearchResults([]);
        return;
      }

      setIsSearchingPartners(true);
      const { data } = await supabase
        .from('partners')
        .select('id, business_name, logo_url')
        .ilike('business_name', `%${searchPartnerTerm}%`)
        .neq('id', partnerId) // Exclude self
        .limit(5);

      setPartnerSearchResults(data || []);
      setIsSearchingPartners(false);
    };

    const timeoutId = setTimeout(searchPartners, 300);
    return () => clearTimeout(timeoutId);
  }, [searchPartnerTerm, partnerId]);

  const addCoOrganizer = (partner: any) => {
    if (!coOrganizers.find(p => p.id === partner.id)) {
      setCoOrganizers([...coOrganizers, partner]);
    }
    setSearchPartnerTerm('');
    setPartnerSearchResults([]);
  };

  const removeCoOrganizer = (partnerId: string) => {
    setCoOrganizers(coOrganizers.filter(p => p.id !== partnerId));
  };

  const handleAdditionalImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAdditionalImages(prev => [...prev, ...newFiles]);
    }
  };

  const addGalleryUrl = () => {
    if (newGalleryUrl) {
      setAdditionalImageUrls(prev => [...prev, newGalleryUrl]);
      setNewGalleryUrl('');
      setShowUrlInput(false);
    }
  };

  const removeAdditionalImage = (index: number) => {
    setAdditionalImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeAdditionalUrl = (index: number) => {
    setAdditionalImageUrls(prev => prev.filter((_, i) => i !== index));
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
    setVariants([...variants, { name: '', description: '', price: '', discounted_price: '', stock: '', has_stock: false, content: [] }]);
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

      if ((eventType === 'event' || eventType === 'simple_access') && locationMode === 'physical' && !locationState.street_address) {
        toast.error('L\'adresse est obligatoire pour une expérience physique');
        setLoading(false);
        return;
      }

      /* Calendly validation removed as it is now manual contact */
      /*
      if (eventType === 'calendly' && !calendlyUrl) {
        toast.error('L\'URL Calendly est obligatoire');
        setLoading(false);
        return;
      } 
      */

      const validVariants = variants.filter(v => v.name && v.price);

      const incompleteVariants = variants.filter(v => v.name && !v.price);
      if (incompleteVariants.length > 0) {
        toast.error('Veuillez indiquer un prix pour toutes les options nommées (le prix est obligatoire pour éviter les erreurs).');
        setLoading(false);
        return;
      }

      // Check for invalid discounted prices (must be lower than standard price)
      const invalidDiscountVariants = variants.filter(v =>
        v.price &&
        v.discounted_price &&
        parseFloat(v.discounted_price) >= parseFloat(v.price)
      );

      if (invalidDiscountVariants.length > 0) {
        toast.error('Le prix réduit doit être strictement inférieur au prix standard');
        setLoading(false);
        return;
      }

      if (eventType !== 'promo' && validVariants.length === 0) {
        // Double check if there are variants with content but no price, which is invalid
        if (variants.length > 0) {
          toast.error('Veuillez définir au moins un tarif avec un Nom et un Prix');
        } else {
          toast.error('Veuillez ajouter au moins un tarif valide (Nom et Prix)');
        }
        setLoading(false);
        return;
      }

      if (eventType === 'promo' && !promoConditions) {
        toast.error('Veuillez indiquer les conditions du code promo');
        setLoading(false);
        return;
      }

      if (cancellationPolicy === 'custom' && !customDeadline) {
        toast.error('Veuillez définir un délai pour la politique personnalisée');
        setLoading(false);
        return;
      }

      // 2. Upload Image or Get URL
      let uploadedImageUrl = offer?.image_url;

      if (coverImageMode === 'url' && coverImageUrlInput) {
        uploadedImageUrl = coverImageUrlInput;
      } else if (coverImage) {
        setIsUploading(true);
        const fileExt = coverImage.name.split('.').pop();
        const fileName = `${(user as any)?.id}/${Date.now()}.${fileExt}`;

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

      // 2.5 Upload Additional Images & Merge URLs
      const finalMediaUrls: string[] = [...additionalImageUrls];

      if (additionalImages.length > 0) {
        setIsUploading(true);
        for (const file of additionalImages) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const { error: uploadEr } = await supabase.storage.from('offer-images').upload(fileName, file);
          if (!uploadEr) {
            const { data: { publicUrl } } = supabase.storage.from('offer-images').getPublicUrl(fileName);
            finalMediaUrls.push(publicUrl);
          }
        }
        setIsUploading(false);
      }

      // 3. Get Partner ID
      // If we already have a partnerId (from offer edit or initial fetch), use it.
      // Otherwise fallback to fetching (only for new offers by partners)
      let finalPartnerId = partnerId;

      if (!finalPartnerId) {
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('partner_id')
          .eq('user_id', (user as any)?.id)
          .single();

        if (profileError || !(profileData as any)?.partner_id) {
          toast.error('Profil partenaire introuvable');
          setLoading(false);
          return;
        }
        finalPartnerId = (profileData as any).partner_id;
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
        partner_id: finalPartnerId,
        title,
        description,
        category_id: (categoryData as any).id,
        booking_type: eventType,
        event_start_date: eventType === 'event' && eventDate ? new Date(eventDate).toISOString() : null,
        event_end_date: eventType === 'event' && eventEndDate ? new Date(eventEndDate).toISOString() : null,
        external_link: eventType === 'calendly' ? calendlyUrl : ((eventType === 'promo' || eventType === 'simple_access' || (eventType === 'event' && locationMode === 'online')) ? externalLink : null),
        promo_code: eventType === 'promo' ? promoCode : null,
        promo_conditions: eventType === 'promo' ? promoConditions : null,
        digital_product_file: eventType === 'purchase' ? digitalProductFile : null,
        duration_type: durationType,
        validity_start_date: durationType === 'fixed' && validityStartDate ? new Date(validityStartDate).toISOString() : null,
        validity_end_date: durationType === 'fixed' && validityEndDate ? new Date(validityEndDate).toISOString() : null,
        street_address: locationMode === 'at_home' ? 'Au domicile du client' : (locationMode === 'online' ? 'En ligne' : locationState.street_address),
        zip_code: locationMode === 'physical' ? locationState.zip_code : '',
        // For At Home: we set 'city' to a readable summary like "Paris, 92, 94..." for display cards
        city: locationMode === 'at_home'
          ? (serviceZones.length > 0 ? serviceZones.map(z => z.code).join(', ') : 'Île-de-France')
          : (locationMode === 'online' ? 'En ligne' : locationState.city),
        department: locationMode === 'physical' ? locationState.department : '',
        coordinates: (locationMode === 'physical' && locationState.coordinates) ? `(${locationState.coordinates[0]},${locationState.coordinates[1]})` : null,
        is_online: locationMode === 'online',
        service_zones: locationMode === 'at_home' ? serviceZones : [],
        image_url: uploadedImageUrl,
        video_url: videoUrl || null,
        cancellation_policy: cancellationPolicy,
        cancellation_deadline_hours: cancellationPolicy === 'custom' ? (
          parseInt(customDeadline) * (customDeadlineUnit === 'days' ? 24 : customDeadlineUnit === 'weeks' ? 168 : 1)
        ) : null,
        access_password: eventType === 'simple_access' ? accessPassword : null,
        installment_options: installmentOptions,
        additional_benefits: additionalBenefits || null,
        // Status remains mostly unchanged or resets to draft if needed, but let's keep it simple
        status: (offer && offer.status === 'rejected') ? 'draft' : (offer ? offer.status : 'draft')
      };

      let outputOfferId = offer?.id;

      if (offer) {
        // UPDATE
        const { error: updateError } = await (supabase
          .from('offers') as any)
          .update(offerData)
          .eq('id', offer.id);

        if (updateError) throw updateError;
        toast.success("Offre mise à jour");
      } else {
        // CREATE
        const { data: newOffer, error: createError } = await (supabase
          .from('offers') as any)
          .insert(offerData)
          .select()
          .single();

        if (createError) throw createError;
        outputOfferId = newOffer.id;
        toast.success("Offre créée en brouillon !");
      }

      // 4.5 Secure Offer Editing Logic - AFTER Creation/Update
      if (offer && (offer.status === 'approved' || offer.status === 'active')) {
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

      // 5. Handle Variants (Smart Sync)
      // Delete variants that are no longer in the list (but were there before)
      if (offer) {
        const currentVariantIds = validVariants.map(v => v.id).filter(Boolean);

        if (currentVariantIds.length === 0) {
          // If no variants left, delete all
          await supabase.from('offer_variants').delete().eq('offer_id', offer.id);
        } else {
          // Delete those NOT in the list
          await supabase.from('offer_variants')
            .delete()
            .eq('offer_id', offer.id)
            .not('id', 'in', `(${currentVariantIds.map(id => `"${id}"`).join(',')})`);
        }
      }

      // 3. Upsert Variants
      if (eventType !== 'promo') {
        const variantsToUpsert = validVariants.map(v => {
          const variantData: any = {
            offer_id: outputOfferId,
            name: v.name,
            description: v.description,
            price: parseFloat(v.price),
            discounted_price: v.discounted_price ? parseFloat(v.discounted_price) : null,
            stock: v.has_stock && v.stock ? parseInt(v.stock) : null,
            // For Wallet Pack, credit amount = price (1:1 per user requirement)
            credit_amount: eventType === 'wallet_pack' ? parseFloat(v.price) : null,
            content: v.content
          };
          // Only include ID if it's a real Update (not a new variant)
          if (v.id) {
            variantData.id = v.id;
          }
          return variantData;
        });

        // Separate new and existing variants if needed or just upsert with ID
        const { error: variantsError } = await (supabase
          .from('offer_variants') as any)
          .upsert(variantsToUpsert); // upsert works if ID matches

        if (variantsError) throw variantsError;
      }

      // 6. Handle Media Insert
      if (finalMediaUrls.length > 0) {
        const mediaToInsert = finalMediaUrls.map((url, idx) => ({
          offer_id: outputOfferId,
          url: url,
          type: 'image',
          order_index: idx
        }));
        const { error: mediaError } = await (supabase.from('offer_media') as any).insert(mediaToInsert);
        if (mediaError) console.error("Error saving media:", mediaError);
      }

      // 7. Handle Co-organizers
      // First delete existing
      if (offer) {
        await supabase.from('offer_co_organizers').delete().eq('offer_id', outputOfferId);
      }

      if (coOrganizers.length > 0) {
        const coOrganizersToInsert = coOrganizers.map(p => ({
          offer_id: outputOfferId,
          partner_id: p.id
        }));

        const { error: coOrgError } = await (supabase.from('offer_co_organizers') as any).insert(coOrganizersToInsert);
        if (coOrgError) console.error("Error saving co-organizers:", coOrgError);
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(translateError(error));
    } finally {
      setLoading(false);
    }
  };

  const parentCategories = categories;
  const subCategories = categories.find(c => c.slug === categorySlug)?.subcategories || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">

        {/* Admin Partner Selection Banner */}
        {isAdmin && !offer && (
          <div className="bg-indigo-50 border-b border-indigo-100 p-4 sticky top-0 z-20">
            <label className="block text-sm font-medium text-indigo-900 mb-2">
              👤 Créer une offre pour le compte de :
            </label>
            <select
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-indigo-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">-- Sélectionner un partenaire --</option>
              {partnersList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.business_name}
                </option>
              ))}
            </select>
            {partnerId && (
              <p className="mt-1 text-xs text-indigo-700">
                L'offre sera créée et liée au compte de {partnersList.find(p => p.id === partnerId)?.business_name}.
              </p>
            )}
          </div>
        )}

        {/* Header */}
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
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Image d'illustration ({offer ? 'actuelle conservée si non modifiée' : 'obligatoire'})</label>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setCoverImageMode('upload')}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${coverImageMode === 'upload' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCoverImageMode('url');
                    }}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${coverImageMode === 'url' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Lien URL
                  </button>
                </div>
              </div>

              {coverImageMode === 'upload' ? (
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary transition-colors">
                  <div className="space-y-1 text-center">
                    {coverImagePreview && !coverImageUrlInput ? (
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
              ) : (
                <div className="mt-1">
                  <input
                    type="text"
                    value={coverImageUrlInput}
                    onChange={(e) => {
                      setCoverImageUrlInput(e.target.value);
                      setCoverImagePreview(e.target.value);
                    }}
                    placeholder="https://exemple.com/image.jpg"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  />
                  {coverImageUrlInput && (
                    <div className="mt-2 relative">
                      <img src={coverImageUrlInput} alt="Aperçu URL" className="w-full h-48 object-cover rounded-md bg-gray-50" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150')} />
                    </div>
                  )}
                </div>
              )}
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
                {additionalImageUrls.map((url, idx) => (
                  <div key={`url-${idx}`} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img src={url} alt="Preview URL" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeAdditionalUrl(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1">
                      <X className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/50 text-white text-[10px] rounded">URL</span>
                  </div>
                ))}

                {!showUrlInput ? (
                  <div className="flex flex-col gap-2">
                    <label className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary aspect-square">
                      <Plus className="w-8 h-8 text-gray-400" />
                      <span className="text-xs text-gray-500 mt-2">Upload</span>
                      <input type="file" multiple accept="image/*" className="hidden" onChange={handleAdditionalImagesSelect} />
                    </label>
                    <button type="button" onClick={() => setShowUrlInput(true)} className="text-xs text-primary underline">
                      Ajouter par lien
                    </button>
                  </div>
                ) : (
                  <div className="border border-gray-300 rounded-lg p-2 flex flex-col justify-center gap-2 aspect-square">
                    <input
                      type="text"
                      placeholder="https://..."
                      value={newGalleryUrl}
                      onChange={(e) => setNewGalleryUrl(e.target.value)}
                      className="w-full text-xs p-1 border rounded"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={addGalleryUrl} className="flex-1 bg-primary text-white text-xs py-1 rounded">Ajouter</button>
                      <button type="button" onClick={() => setShowUrlInput(false)} className="bg-gray-200 text-gray-600 px-2 rounded"><X className="w-3 h-3" /></button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* --- Video URL --- */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lien Vidéo
              </label>
              <div className="flex bg-gray-50 border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
                <div className="pl-3 py-2 text-gray-400 bg-gray-100 border-r border-gray-300">
                  <Link className="h-5 w-5" />
                </div>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 px-4 py-2 bg-transparent outline-none text-gray-900 placeholder-gray-400"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Lien YouTube ou Vimeo. La vidéo sera affichée en dessous de la description.
              </p>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Co-organisateurs (Partenaires)</label>
              <div className="relative">
                <div className="flex flex-wrap gap-2 mb-2">
                  {coOrganizers.map(p => (
                    <div key={p.id} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                      <span>{p.business_name}</span>
                      <button type="button" onClick={() => removeCoOrganizer(p.id)} className="hover:text-blue-900">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={searchPartnerTerm}
                    onChange={(e) => setSearchPartnerTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                    placeholder="Rechercher un partenaire à taguer..."
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>

                {searchPartnerTerm.length >= 2 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {isSearchingPartners ? (
                      <div className="p-2 text-sm text-gray-500 text-center">Recherche...</div>
                    ) : partnerSearchResults.length > 0 ? (
                      partnerSearchResults.map(partner => (
                        <button
                          key={partner.id}
                          type="button"
                          onClick={() => addCoOrganizer(partner)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
                        >
                          <div className="w-6 h-6 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                            {partner.logo_url ? (
                              <img src={partner.logo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500">
                                {partner.business_name?.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span>{partner.business_name}</span>
                        </button>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-gray-500 text-center">Aucun partenaire trouvé</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description détaillée</label>
              <div className="bg-white">
                <ReactQuill
                  theme="snow"
                  value={description}
                  onChange={setDescription}
                  modules={modules}
                  formats={formats}
                  className="h-64 mb-12" // mb-12 to account for toolbar height
                  placeholder="Décrivez votre offre en détail..."
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Décrivez l'expérience, le déroulement, ce qui est inclus, etc.
                Utilisez la barre d'outils pour mettre en forme votre texte.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">📍 Où se passe l'expérience ?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setLocationMode('physical');
                    if (eventType === 'purchase') setEventType('event');
                  }}
                  className={`p-4 rounded-xl border text-left transition-all ${locationMode === 'physical'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  <div className="font-semibold text-gray-900 mb-1">📍 Sur place</div>
                  <p className="text-sm text-gray-500">Au cabinet, en studio...</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLocationMode('at_home');
                    if (eventType === 'purchase') setEventType('calendly');
                  }}
                  className={`p-4 rounded-xl border text-left transition-all ${locationMode === 'at_home'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  <div className="font-semibold text-gray-900 mb-1">🏠 À domicile</div>
                  <p className="text-sm text-gray-500">Chez le client (déplacement).</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLocationMode('online');
                  }}
                  className={`p-4 rounded-xl border text-left transition-all ${locationMode === 'online'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  <div className="font-semibold text-gray-900 mb-1">💻 En ligne</div>
                  <p className="text-sm text-gray-500">Visio, PDF, ou lien web.</p>
                </button>
              </div>
            </div>

            {/* --- Location Search (Only if physical) --- */}
            {locationMode === 'physical' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Adresse de l'événement *</label>
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
            )}

            {/* --- Zone Input (Only if At Home) --- */}
            {locationMode === 'at_home' && (
              <div className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-medium text-gray-700">Zones couvertes & Frais de déplacement</label>
                  <button
                    type="button"
                    onClick={() => {
                      // "Toute l'IDF" shortcut
                      const allIDF = ['75', '77', '78', '91', '92', '93', '94', '95'];
                      // Default fee 0 if not set
                      setServiceZones(allIDF.map(code => ({ code, fee: 0 })));
                      toast.success("Toute l'Île-de-France sélectionnée !");
                    }}
                    className="text-sm text-primary hover:text-primary-dark font-medium hover:underline"
                  >
                    ⚡ Toute l'Île-de-France
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Multi-select Dropdown (Simplified as a grid of checkboxes for better UX here) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-lg">
                    {[
                      { code: '75', name: 'Paris (75)' },
                      { code: '92', name: 'Hauts-de-Seine (92)' },
                      { code: '93', name: 'Seine-St-Denis (93)' },
                      { code: '94', name: 'Val-de-Marne (94)' },
                      { code: '77', name: 'Seine-et-Marne (77)' },
                      { code: '78', name: 'Yvelines (78)' },
                      { code: '91', name: 'Essonne (91)' },
                      { code: '95', name: "Val-d'Oise (95)" },
                    ].map((dept) => {
                      const isSelected = serviceZones.some(z => z.code === dept.code);
                      return (
                        <button
                          key={dept.code}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setServiceZones(prev => prev.filter(z => z.code !== dept.code));
                            } else {
                              setServiceZones(prev => [...prev, { code: dept.code, fee: 0 }]);
                            }
                          }}
                          className={`flex items-center justify-center px-3 py-2 rounded-lg border text-sm transition-all ${isSelected
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                            }`}
                        >
                          {dept.name}
                        </button>
                      );
                    })}
                  </div>

                  {/* Fee Inputs for Selected Zones */}
                  {serviceZones.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Frais de déplacement par département (€)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                        {serviceZones.map((zone) => (
                          <div key={zone.code} className="flex items-center space-x-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg">
                            <span className="text-sm font-semibold text-gray-800 w-12">{zone.code}</span>
                            <div className="flex-1 text-xs text-gray-500 truncate">
                              {['75', '92', '93', '94', '77', '78', '91', '95'].find(c => c === zone.code) ?
                                ({ '75': 'Paris', '92': 'Hauts-de-Seine', '93': 'Seine-St-Denis', '94': 'Val-de-Marne', '77': 'Seine-et-Marne', '78': 'Yvelines', '91': 'Essonne', '95': "Val-d'Oise" } as any)[zone.code]
                                : ''}
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={zone.fee}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setServiceZones(prev => prev.map(z => z.code === zone.code ? { ...z, fee: val } : z));
                              }}
                              className="w-20 px-2 py-1 text-right text-sm border-gray-300 rounded focus:ring-primary focus:border-primary"
                              placeholder="0 €"
                            />
                            <span className="text-sm text-gray-600">€</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {serviceZones.length === 0 && (
                    <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                      ⚠️ Veuillez sélectionner au moins un département desservi.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* --- Type de réservation (Moved Up) --- */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Type de réservation</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { id: 'calendly', label: locationMode === 'online' ? 'Visio (à convenir)' : 'Rendez-vous', show: true },
                  { id: 'event', label: locationMode === 'online' ? 'Live / Atelier En ligne' : 'Événement', show: true },
                  { id: 'simple_access', label: locationMode === 'online' ? 'Accès Page Web / Lien Privé' : 'Billet / Sans RDV', show: true },
                  { id: 'purchase', label: 'Produit Digital (PDF)', show: locationMode === 'online' },
                  { id: 'wallet_pack', label: 'Pack Ardoise', show: true },
                  { id: 'promo', label: 'Code Promo Web', show: locationMode === 'online' }
                ].filter(t => t.show).map((type) => (
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
              {eventType === 'simple_access' && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-blue-900 mb-2">
                    {locationMode === 'online' ? '🌐 Accès Page Web / Lien Privé' : '🎟️ Billet ou Entrée simple'}
                  </h4>
                  <p className="text-sm text-blue-700 mb-2">
                    {locationMode === 'online'
                      ? "Vendez l'accès à une URL spécifique (Dossier Drive, Page Notion, Lien privé...). Le client recevra le lien par email après l'achat."
                      : "Idéal pour les accès libres (Spa, Salle de sport, Musée...) sans réservation horaire spécifique. Le client achète son entrée et vient quand il veut."
                    }
                  </p>

                  {locationMode === 'online' && (
                    <div className="mt-4 space-y-4 border-t border-blue-200 pt-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-1"> Lien d'accès (Obligatoire)</label>
                        <input
                          type="url"
                          value={externalLink}
                          onChange={(e) => setExternalLink(e.target.value)}
                          className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          placeholder="https://drive.google.com/..."
                          required={eventType === 'simple_access' && locationMode === 'online' && variants.length === 0}
                        />
                        <p className="text-xs text-blue-700 mt-1">Laissez vide si vous utilisez plusieurs options avec des liens différents plus bas.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-1">Mot de passe d'accès (Facultatif)</label>
                        <input
                          type="text"
                          value={accessPassword}
                          onChange={(e) => setAccessPassword(e.target.value)}
                          className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Ex: NOWME2025"
                        />
                        <p className="text-xs text-blue-700 mt-1">Si votre lien est protégé par un mot de passe, indiquez-le ici.</p>
                      </div>
                    </div>
                  )}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-blue-900 mb-1">Durée de validité du billet</label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="duration_type"
                          value="lifetime"
                          checked={durationType === 'lifetime'}
                          onChange={() => setDurationType('lifetime')}
                          className="mr-2 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-blue-800">illimité / à vie</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="duration_type"
                          value="fixed"
                          checked={durationType === 'fixed'}
                          onChange={() => setDurationType('fixed')}
                          className="mr-2 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-blue-800">Date fixe / Période</span>
                      </label>
                    </div>
                  </div>
                  {durationType && durationType !== 'lifetime' && (
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-blue-700">Valable à partir du</label>
                        <input
                          type="date"
                          value={validityStartDate ? validityStartDate.split('T')[0] : ''}
                          onChange={e => setValidityStartDate(e.target.value)}
                          className="w-full mt-1 border border-blue-200 rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-blue-700">Jusqu'au</label>
                        <input
                          type="date"
                          value={validityEndDate ? validityEndDate.split('T')[0] : ''}
                          onChange={e => setValidityEndDate(e.target.value)}
                          className="w-full mt-1 border border-blue-200 rounded px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}



              {eventType === 'purchase' && (
                <div className="mt-4 p-4 bg-white border border-dashed border-gray-300 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fichier à télécharger (PDF, ZIP...)</label>
                  <p className="text-xs text-gray-500 mb-3">
                    Ce fichier sera accessible au client uniquement après l'achat. (Max 50Mo)
                  </p>

                  {digitalProductFile ? (
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="p-2 bg-white rounded-full">
                          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-green-800 truncate" title={digitalProductFile}>
                          {digitalProductFile.split('/').pop()}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDigitalProductFile(null)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf,.zip,.rar"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (!user || !partnerId) {
                            toast.error("Erreur d'authentification");
                            return;
                          }

                          if (file.size > 50 * 1024 * 1024) {
                            toast.error("Fichier trop volumineux (Max 50Mo)");
                            return;
                          }

                          setIsUploadingFile(true);
                          const toastId = toast.loading('Téléchargement du fichier...');

                          try {
                            const fileExt = file.name.split('.').pop();
                            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
                            const filePath = `${partnerId}/${fileName}`;

                            const { error } = await supabase.storage
                              .from('offer-attachments')
                              .upload(filePath, file);

                            if (error) throw error;

                            const { data: { publicUrl } } = supabase.storage
                              .from('offer-attachments')
                              .getPublicUrl(filePath);

                            setDigitalProductFile(publicUrl);
                            toast.success('Fichier ajouté !', { id: toastId });
                          } catch (error: any) {
                            console.error('Upload Error:', error);
                            toast.error("Erreur lors de l'envoi", { id: toastId });
                          } finally {
                            setIsUploadingFile(false);
                          }
                        }}
                      />
                      <div className={`w-full py-8 text-center rounded-lg border-2 border-dashed transition-colors ${isUploadingFile ? 'bg-gray-50 border-gray-300' : 'hover:bg-gray-50 border-gray-300 hover:border-primary'}`}>
                        {isUploadingFile ? (
                          <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
                            <span className="text-sm text-gray-500">Envoi en cours...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center text-gray-500">
                            <Upload className="w-8 h-8 mb-2 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700">Cliquez pour ajouter un fichier</span>
                            <span className="text-xs text-gray-400 mt-1">PDF, ZIP (Max 50Mo)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {eventType === 'event' && (
                <div className="space-y-4">
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

                  {locationMode === 'online' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lien de la visio (Zoom, Meet...) - Sera envoyé par email</label>
                      <input
                        type="url"
                        value={externalLink}
                        onChange={(e) => setExternalLink(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="https://zoom.us/..."
                      />
                    </div>
                  )}
                </div>
              )}

              {eventType === 'promo' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mt-4 mb-2">
                      Lien de l'offre
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Link className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="url"
                        value={externalLink}
                        onChange={(e) => setExternalLink(e.target.value)}
                        className="pl-10 block w-full border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                        placeholder="https://..."
                      />
                    </div>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Conditions (Texte affiché à la place du prix)</label>
                    <input
                      type="text"
                      value={promoConditions}
                      onChange={(e) => setPromoConditions(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg font-bold text-primary"
                      placeholder="Ex: -15% sur tout le site, -50% sur la 1ère commande..."
                      required={eventType === 'promo'}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* --- Cancellation Policy --- */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Politique d'annulation *</label>
              {eventType === 'wallet_pack' ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <p className="text-blue-900 font-medium">Validité : 6 mois</p>
                  <p className="text-sm text-blue-600 mt-1">
                    Le pack est valable 6 mois à compter de la date d'achat. Remboursable sur demande si non consommé.
                  </p>
                  {/* Auto-set policy hiddenly */}
                </div>
              ) : (eventType === 'purchase' || eventType === 'promo' || eventType === 'simple_access') ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      value: 'non_refundable',
                      label: 'Non remboursable',
                      desc: 'Aucun remboursement possible, peu importe le délai.'
                    }
                  ].map((policy) => (
                    <div
                      key={policy.value}
                      onClick={() => setCancellationPolicy(policy.value as any)}
                      className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${cancellationPolicy === policy.value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-semibold ${cancellationPolicy === policy.value ? 'text-primary' : 'text-gray-900'
                          }`}>
                          {policy.label}
                        </span>
                        {cancellationPolicy === policy.value && (
                          <div className="w-4 h-4 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{policy.desc}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      value: 'flexible',
                      label: 'Flexible (15 jours)',
                      desc: 'Remboursement intégral jusqu\'à 15 jours avant l\'événement.'
                    },
                    {
                      value: 'moderate',
                      label: 'Modérée (7 jours)',
                      desc: 'Remboursement intégral jusqu\'à 7 jours avant l\'événement.'
                    },
                    {
                      value: 'strict',
                      label: 'Stricte (24h)',
                      desc: 'Remboursement intégral jusqu\'à 24h avant l\'événement.'
                    },
                    {
                      value: 'non_refundable',
                      label: 'Non remboursable',
                      desc: 'Aucun remboursement possible.'
                    },
                    {
                      value: 'custom',
                      label: 'Personnalisée',
                      desc: 'Définissez votre propre délai d\'annulation.'
                    }
                  ].map((policy) => (
                    <div
                      key={policy.value}
                      onClick={() => setCancellationPolicy(policy.value as any)}
                      className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${cancellationPolicy === policy.value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-semibold ${cancellationPolicy === policy.value ? 'text-primary' : 'text-gray-900'
                          }`}>
                          {policy.label}
                        </span>
                        {cancellationPolicy === policy.value && (
                          <div className="w-4 h-4 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{policy.desc}</p>
                    </div>
                  ))}
                </div>
              )}
              {/* Custom Policy Input */}
              {cancellationPolicy === 'custom' && (
                <div className="mt-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Délai d'annulation
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-[200px]">
                      <input
                        type="number"
                        min="1"
                        value={customDeadline}
                        onChange={(e) => setCustomDeadline(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                        placeholder="Ex: 2"
                      />
                    </div>
                    <select
                      value={customDeadlineUnit}
                      onChange={(e) => setCustomDeadlineUnit(e.target.value as any)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary bg-white"
                    >
                      <option value="hours">Heures</option>
                      <option value="days">Jours</option>
                      <option value="weeks">Semaines</option>
                    </select>

                  </div>
                  {customDeadline && (
                    <p className="text-sm text-gray-500 mt-2">
                      Soit {(
                        parseInt(customDeadline) * (customDeadlineUnit === 'days' ? 24 : customDeadlineUnit === 'weeks' ? 168 : 1)
                      ) < 24
                        ? `${parseInt(customDeadline) * (customDeadlineUnit === 'days' ? 24 : customDeadlineUnit === 'weeks' ? 168 : 1)} heures`
                        : `${(parseInt(customDeadline) * (customDeadlineUnit === 'days' ? 24 : customDeadlineUnit === 'weeks' ? 168 : 1)) / 24} jours`
                      } avant l'événement.
                    </p>
                  )}
                </div>
              )}
            </div>

            {eventType === 'calendly' && (
              <div className="bg-white border border-gray-300 rounded-lg p-6 mb-6">
                <h4 className="font-semibold text-gray-900 mb-4">
                  🔗 Lien de prise de rendez-vous
                </h4>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lien ou contact de réservation (Doctolib, Planity, Calendly...) Si votre lien nécessite un paiement, préférez un moyen de vous contacter directement
                  </label>
                  <div className="relative">
                    <Link className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={calendlyUrl}
                      onChange={(e) => setCalendlyUrl(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="https://..., email, téléphone, etc..."
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Ce lien ou cette informationsera envoyé au client par email et affiché dans ses réservations après le paiement.
                  </p>
                </div>

                <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-lg">
                  <strong>💡 Comment ça marche ?</strong><br />
                  1. Le client achète sa séance ici.<br />
                  2. Il reçoit votre lien ou contact de réservation.<br />
                  3. Il réserve son créneau directement sur votre outil habituel ou vous contacte.
                </div>
              </div>
            )}


            {/* --- Variants --- */}
            {eventType !== ('promo' as any) && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900">
                    {eventType === 'wallet_pack' ? 'Configuration du Pack' : 'Tarifs & Options'}
                  </h3>
                  {eventType !== ('promo' as any) && (
                    <button type="button" onClick={addVariant} className="text-sm text-primary font-medium hover:text-primary-dark">
                      + Ajouter une option
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {variants.map((variant, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg group space-y-4">
                      <div className="flex gap-4 items-start">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">

                          <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Nom de l'option</label>
                            <input
                              type="text"
                              value={variant.name}
                              onChange={(e) => updateVariant(index, 'name', e.target.value)}
                              placeholder={eventType === 'wallet_pack' ? "Ex: Pack Découverte 50€" : "Ex: Tarif Solo (ou nom de l'article)"}
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                            />
                          </div>

                          {/* Description field for simple_access (and others if useful) */}
                          <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Description (Optionnel)</label>
                            <textarea
                              value={variant.description || ''}
                              onChange={(e) => updateVariant(index, 'description', e.target.value)}
                              placeholder="Courte description de ce que contient cette option..."
                              rows={2}
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              {eventType === 'wallet_pack' ? 'Prix du Pack (€)' : 'Prix (€)'}
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                value={variant.price}
                                onChange={(e) => updateVariant(index, 'price', e.target.value)}
                                className="w-full pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                required
                              />
                              <span className="absolute right-3 top-2 text-gray-400">€</span>
                            </div>
                          </div>

                          {eventType !== 'wallet_pack' && (
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Prix promo (membres du club) - Optionnel</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  value={variant.discounted_price}
                                  onChange={(e) => updateVariant(index, 'discounted_price', e.target.value)}
                                  className="w-full pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                                  placeholder="0.00"
                                  min="0"
                                  step="0.01"
                                />
                                <span className="absolute right-3 top-2 text-gray-400">€</span>
                              </div>
                            </div>
                          )}

                          {eventType !== 'purchase' && eventType !== 'wallet_pack' && (
                            <div className="flex items-center gap-2 mt-6">
                              <input
                                type="checkbox"
                                checked={variant.has_stock}
                                onChange={(e) => updateVariant(index, 'has_stock', e.target.checked)}
                                className="rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm text-gray-600">Limiter les places ?</span>
                            </div>
                          )}

                          {variant.has_stock && (
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Quantité dispo</label>
                              <input
                                type="number"
                                value={variant.stock}
                                onChange={(e) => updateVariant(index, 'stock', e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                              />
                            </div>
                          )}
                        </div>

                        {variants.length > 1 && (
                          <button type="button" onClick={() => removeVariant(index)} className="mt-6 text-gray-400 hover:text-red-500 flex-shrink-0">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>

                      {/* --- Content Items (New) --- */}
                      <div className="mt-4 pt-4 border-t border-gray-200 w-full">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Contenu de l'offre (Liens / Fichiers)
                        </label>
                        <p className="text-xs text-gray-500 mb-3">
                          Ajoutez ici les éléments que le client recevra pour cette option (ex: un lien Masterclass + un PDF).
                        </p>

                        <div className="space-y-3">
                          {variant.content && variant.content.map((item, cIndex) => (
                            <div key={cIndex} className="flex flex-col gap-3 p-3 bg-white rounded-lg border border-gray-200">
                              <div className="flex gap-3">
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    placeholder="Nom (ex: Vidéo Chapitre 1)"
                                    value={item.name}
                                    onChange={(e) => {
                                      const newVariants = [...variants];
                                      newVariants[index].content[cIndex].name = e.target.value;
                                      setVariants(newVariants);
                                    }}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-primary focus:border-primary"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newVariants = [...variants];
                                    newVariants[index].content = newVariants[index].content.filter((_, i) => i !== cIndex);
                                    setVariants(newVariants);
                                  }}
                                  className="text-gray-400 hover:text-red-500 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="relative">
                                  <div className="absolute left-3 top-2.5 text-gray-400">
                                    <Link className="h-4 w-4" />
                                  </div>
                                  <input
                                    type="url"
                                    placeholder="https://..."
                                    value={item.url}
                                    onChange={(e) => {
                                      const newVariants = [...variants];
                                      newVariants[index].content[cIndex].url = e.target.value;
                                      setVariants(newVariants);
                                    }}
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded focus:ring-primary focus:border-primary"
                                  />
                                </div>

                                <div className="relative">
                                  {item.file_url ? (
                                    <div className="flex items-center justify-between px-3 py-2 text-sm border border-green-200 bg-green-50 rounded text-green-700 truncate">
                                      <span className="truncate max-w-[150px]">{item.file_url.split('/').pop()}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newVariants = [...variants];
                                          newVariants[index].content[cIndex].file_url = '';
                                          setVariants(newVariants);
                                        }}
                                        className="ml-2 text-green-600 hover:text-red-500"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <label className="flex items-center justify-center gap-2 px-3 py-2 text-sm border border-dashed border-gray-300 rounded cursor-pointer hover:border-primary hover:bg-gray-50 text-gray-500 hover:text-primary transition-colors">
                                      <Upload className="w-4 h-4" />
                                      <span>Upload PDF</span>
                                      <input
                                        type="file"
                                        accept=".pdf,.zip"
                                        className="hidden"
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;

                                          const toastId = toast.loading('Upload en cours...');
                                          try {
                                            const fileExt = file.name.split('.').pop();
                                            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
                                            const filePath = `${partnerId}/${fileName}`;

                                            const { error } = await supabase.storage
                                              .from('offer-attachments')
                                              .upload(filePath, file);

                                            if (error) throw error;

                                            const { data: { publicUrl } } = supabase.storage
                                              .from('offer-attachments')
                                              .getPublicUrl(filePath);

                                            const newVariants = [...variants];
                                            newVariants[index].content[cIndex].file_url = publicUrl;
                                            setVariants(newVariants);
                                            toast.success('Fichier ajouté !', { id: toastId });
                                          } catch (error) {
                                            console.error('Upload error', error);
                                            toast.error("Erreur", { id: toastId });
                                          }
                                        }}
                                      />
                                    </label>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => {
                              const newVariants = [...variants];
                              if (!newVariants[index].content) newVariants[index].content = [];
                              newVariants[index].content.push({ name: '', url: '', file_url: '' });
                              setVariants(newVariants);
                            }}
                            className="text-sm text-primary flex items-center gap-1 font-medium hover:underline"
                          >
                            <Plus className="w-4 h-4" />
                            Ajouter un contenu
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- Additional Benefits --- */}
            {eventType !== 'promo' && (
              <div className="bg-green-50 p-6 rounded-xl border border-green-100 mb-6">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🎁</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900 mb-2">Avantages supplémentaires</h3>
                    <p className="text-sm text-green-700 mb-4">
                      Indiquez les avantages non-monétaires inclus avec cette offre (ex: "+ une course de voitures télécommandées offerte")
                    </p>
                    <input
                      type="text"
                      value={additionalBenefits}
                      onChange={(e) => setAdditionalBenefits(e.target.value)}
                      className="w-full px-4 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                      placeholder="Ex: + un café offert, + un cadeau surprise..."
                    />
                  </div>
                </div>
              </div>
            )}


            {/* --- Payment Options (Installments) --- */}
            {(eventType === 'event' || eventType === 'wallet_pack') && (
              <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg text-indigo-600">
                    <Euro className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-indigo-900">Facilités de paiement</h3>
                    <p className="text-sm text-indigo-700 mb-4">
                      Autorisez vos clients à payer en plusieurs fois sans frais.
                      Nous gérons automatiquement les prélèvements.
                    </p>

                    <div className="flex flex-wrap gap-4">
                      {['2x', '3x', '4x'].map((plan) => (
                        <label key={plan} className="flex items-center bg-white px-4 py-2 rounded-lg border border-indigo-200 cursor-pointer hover:border-indigo-400 transition-colors">
                          <input
                            type="checkbox"
                            checked={installmentOptions.includes(plan)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setInstallmentOptions([...installmentOptions, plan]);
                              } else {
                                setInstallmentOptions(installmentOptions.filter(Op => Op !== plan));
                              }
                            }}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-2"
                          />
                          <span className="font-medium text-gray-700">Paiement en {plan}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-indigo-600 mt-2">
                      * Le paiement en plusieurs fois n'est proposé que si l'événement commence dans plus de 7 jours.
                    </p>
                  </div>
                </div>
              </div>
            )}

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
        </div>
      </div>
    </div>
  );
}
