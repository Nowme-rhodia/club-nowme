import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Image as ImageIcon,
  Euro,
  MapPin,
  Calendar,
  X
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { categories } from '../../data/categories';
import { LocationSearch } from '../../components/LocationSearch';
import { PartnerCalendlySettings } from '../../components/partner/PartnerCalendlySettings';
import toast from 'react-hot-toast';
import CreateOffer from './CreateOffer';

interface Offer {
  id: string;
  created_at: string;
  title: string;
  description: string;
  image_url: string;
  category_slug: string;
  subcategory_slug: string;
  price: number;
  discounted_price: number | null;
  location: string; // Keep for legacy display if needed, but we use street/city etc
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'ready';
  street_address?: string;
  zip_code?: string;
  department?: string;
  city?: string;
  coordinates?: any;
  // Booking Types
  booking_type?: 'calendly' | 'event' | 'promo' | 'purchase';
  external_link?: string;
  promo_code?: string;
  calendly_url?: string;
  event_start_date?: string;
  event_end_date?: string;

  category?: {
    slug: string;
    parent_slug: string | null;
    name: string;
  };
  offer_media?: { url: string }[];
  media?: { url: string }[]; // Handle potential alias
  variants?: {
    name: string;
    price: number;
    discounted_price: number | null;
    stock: number | null;
  }[];
  rejection_reason?: string;
}

const statusConfig = {
  draft: {
    label: 'Brouillon',
    icon: Clock,
    className: 'bg-gray-100 text-gray-700'
  },
  ready: {
    label: 'Prête',
    icon: CheckCircle2,
    className: 'bg-blue-100 text-blue-700'
  },
  pending: {
    label: 'En validation',
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-700'
  },
  approved: {
    label: 'Approuvée',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-700'
  },
  rejected: {
    label: 'Refusée',
    icon: XCircle,
    className: 'bg-red-100 text-red-700'
  }
};
export default function Offers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [partnerId, setPartnerId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadOffers();
      fetchPartnerId();
    }
  }, [user]);

  const fetchPartnerId = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('partner_id')
      .eq('user_id', user.id)
      .single();
    if (data) setPartnerId((data as any).partner_id);
  };
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [newOffer, setNewOffer] = useState({
    title: '',
    description: '',
    category_slug: '',
    subcategory_slug: '',
    street_address: '',
    zip_code: '',
    department: '',
    city: '',
    coordinates: null as [number, number] | null,
    calendly_url: '',
    event_start_date: '',
    event_end_date: '',
    booking_type: 'calendly',
    external_link: '',
    promo_code: ''
  });

  // Stock tracking state
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});

  // État pour les variants
  interface VariantForm {
    name: string;
    price: string;
    discounted_price: string;
  }
  const [variants, setVariants] = useState<VariantForm[]>([
    { name: '', price: '', discounted_price: '' }
  ]);

  const addVariant = () => {
    setVariants([...variants, { name: '', price: '', discounted_price: '' }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    }
  };

  const updateVariant = (index: number, field: keyof VariantForm, value: string) => {
    const updated = [...variants];
    updated[index][field] = value;
    setVariants(updated);
  };

  const [dbCategories, setDbCategories] = useState<any[]>([]);

  // Image Upload State
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Handle URL query param for editing
  useEffect(() => {
    const editId = searchParams.get('edit_offer_id');
    if (editId && offers.length > 0 && !editingOffer && !showCreateForm) {
      const offerToEdit = offers.find(o => o.id === editId);
      if (offerToEdit) {
        handleEditOffer(offerToEdit);
        // Clear the URL param to prevent infinite reopen loop
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('edit_offer_id');
        navigate({ search: newParams.toString() }, { replace: true });
      }
    }
  }, [offers, searchParams, navigate]);

  const handleEditOffer = (offer: Offer) => {
    setEditingOffer(offer);

    // Parse variants if string or use as is
    const currentVariants = offer.variants?.map((v: any) => ({
      name: v.name,
      price: v.price.toString(),
      discounted_price: v.discounted_price ? v.discounted_price.toString() : ''
    })) || [{ name: '', price: '', discounted_price: '' }];

    // Derive category slugs from joined category object
    // @ts-ignore
    const category = offer.category;
    let catSlug = '';
    let subSlug = '';

    if (category) {
      if (category.parent_slug) {
        // If it has a parent, the offer is linked to the SUBcategory
        catSlug = category.parent_slug;
        subSlug = category.slug;
      } else {
        // It's a parent category
        catSlug = category.slug;
      }
    }

    setNewOffer({
      title: offer.title,
      description: offer.description,
      category_slug: catSlug,
      subcategory_slug: subSlug,
      street_address: offer.street_address || '',
      zip_code: offer.zip_code || '',
      department: offer.department || '',
      city: offer.city || '',
      coordinates: offer.coordinates,
      calendly_url: offer.calendly_url || '',
      event_start_date: offer.event_start_date || '',
      event_end_date: offer.event_end_date || '',
      booking_type: offer.booking_type || 'calendly',
      external_link: offer.external_link || '',
      promo_code: offer.promo_code || ''
    });

    setVariants(currentVariants);
    setCoverImagePreview(offer.image_url || offer.media?.[0]?.url || null);
    setShowCreateForm(true);
  };

  const handleCloseForm = () => {
    setShowCreateForm(false);
    setEditingOffer(null);
    setNewOffer({
      title: '',
      description: '',
      category_slug: '',
      subcategory_slug: '',
      street_address: '',
      zip_code: '',
      department: '',
      city: '',
      coordinates: null,
      calendly_url: '',
      event_start_date: '',
      event_end_date: '',
      booking_type: 'calendly',
      external_link: '',
      promo_code: ''
    });
    setCoverImage(null);
    setCoverImagePreview(null);
    setVariants([{ name: '', price: '', discounted_price: '' }]);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverImage(file);
      const objectUrl = URL.createObjectURL(file);
      setCoverImagePreview(objectUrl);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('offer_categories').select('*');
    if (data) setDbCategories(data);
  };

  const parentCategories = dbCategories.filter(c => !c.parent_slug);
  const subCategories = dbCategories.filter(c => c.parent_slug === newOffer.category_slug);

  const loadOffers = async () => {
    try {
      if (!user?.id) {
        console.error('No user ID');
        setLoading(false);
        return;
      }

      // Récupérer le partner_id depuis user_profiles
      const { data: profileData, error: profileError } = await (supabase
        .from('user_profiles') as any)
        .select('partner_id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        toast.error('Erreur lors de la récupération du profil');
        setLoading(false);
        return;
      }

      if (!profileData?.partner_id) {
        console.error('Partner ID not found for user');
        toast.error('Partner ID non trouvé');
        setLoading(false);
        return;
      }

      const partnerId = profileData.partner_id;

      // Récupérer toutes les offres du partenaire
      const { data, error } = await (supabase
        .from('offers') as any)
        .select(`
          *,
          category:offer_categories!offers_category_id_fkey(name, slug, parent_slug),
          variants:offer_variants(
            *,
            bookings:bookings(id, status)
          ),
          media:offer_media(*)
        `)
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate booking counts for variants using the nested data
      const counts: Record<string, number> = {};
      data?.forEach((offer: any) => {
        offer.variants?.forEach((variant: any) => {
          // Count only non-cancelled bookings
          const validBookings = variant.bookings?.filter((b: any) => b.status !== 'cancelled') || [];
          counts[variant.id] = validBookings.length;
        });
      });
      setBookingCounts(counts);

      const formattedOffers = (data || []).map((offer: any) => ({
        ...offer,
        category_slug: offer.category?.parent_slug || offer.category?.slug,
        subcategory_slug: offer.category?.parent_slug ? offer.category.slug : null
      }));

      setOffers(formattedOffers);
    } catch (error) {
      console.error('Error loading offers:', error);
      toast.error('Erreur lors du chargement des offres');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newOffer.title || !newOffer.description || !newOffer.category_slug) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setIsUploading(true);
      let uploadedImageUrl = null;

      // 1. Upload Image First
      if (coverImage) {
        const fileExt = coverImage.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('offer-images')
          .upload(fileName, coverImage);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error("Erreur lors de l'upload de l'image");
          setIsUploading(false);
          return; // Stop creation
        }

        const { data: { publicUrl } } = supabase.storage
          .from('offer-images')
          .getPublicUrl(fileName);

        uploadedImageUrl = publicUrl;
      }

      // Récupérer le partner_id depuis user_profiles
      const { data: profileData, error: profileError } = await (supabase
        .from('user_profiles') as any)
        .select('partner_id')
        .eq('user_id', user?.id)
        .single();

      if (profileError || !profileData?.partner_id) {
        toast.error('Partner ID not found');
        return;
      }

      const partnerId = profileData.partner_id;

      // Trouver l'ID de la catégorie
      const catId = dbCategories.find(c => c.slug === newOffer.subcategory_slug || c.slug === newOffer.category_slug)?.id;

      let resultOffer;

      if (editingOffer) {
        // UPDATE Existing Offer
        const { data: updatedOffer, error: updateError } = await (supabase
          .from('offers') as any)
          .update({
            title: newOffer.title,
            description: newOffer.description,
            category_id: catId,
            calendly_url: newOffer.calendly_url || null,
            event_start_date: newOffer.event_start_date || null,
            event_end_date: newOffer.event_end_date || null,
            street_address: newOffer.street_address,
            zip_code: newOffer.zip_code,
            department: newOffer.department,
            city: newOffer.city,
            coordinates: newOffer.coordinates ? `(${newOffer.coordinates[0]},${newOffer.coordinates[1]})` : null,
            image_url: uploadedImageUrl || editingOffer.image_url // Keep old if no new upload
          })
          .eq('id', editingOffer.id)
          .select()
          .single();

        if (updateError) throw updateError;
        resultOffer = updatedOffer;

        // Delete existing variants to replace them
        const { error: deleteVariantsError } = await supabase
          .from('offer_variants')
          .delete()
          .eq('offer_id', editingOffer.id);

        if (deleteVariantsError) throw deleteVariantsError;

        toast.success('Offre mise à jour !');
      } else {
        // CREATE New Offer
        const { data: createdOffer, error: createError } = await (supabase
          .from('offers') as any)
          .insert({
            partner_id: partnerId,
            title: newOffer.title,
            description: newOffer.description,
            category_id: catId,
            calendly_url: newOffer.booking_type === 'calendly' ? newOffer.calendly_url : null,
            event_start_date: newOffer.booking_type === 'event' ? newOffer.event_start_date : null,
            event_end_date: newOffer.booking_type === 'event' ? newOffer.event_end_date : null,
            booking_type: newOffer.booking_type,
            external_link: newOffer.booking_type === 'promo' ? newOffer.external_link : null,
            promo_code: newOffer.booking_type === 'promo' ? newOffer.promo_code : null,
            street_address: newOffer.street_address,
            zip_code: newOffer.zip_code,
            department: newOffer.department,
            city: newOffer.city,
            coordinates: newOffer.coordinates ? `(${newOffer.coordinates[0]},${newOffer.coordinates[1]})` : null,
            status: 'draft',
            is_approved: false,
            commission_rate: 10,
            image_url: uploadedImageUrl
          })
          .select()
          .single();

        if (createError) throw createError;
        resultOffer = createdOffer;
        toast.success('Offre créée en brouillon !');
      }

      // Add Variants (Common logic)
      if (resultOffer) {
        const validVariants = variants.filter(v => v.name && v.price);
        if (validVariants.length > 0) {
          const variantsToInsert = validVariants.map(v => ({
            offer_id: (resultOffer as any).id,
            name: v.name,
            price: parseFloat(v.price),
            discounted_price: v.discounted_price ? parseFloat(v.discounted_price) : null
          }));

          const { error: variantError } = await (supabase
            .from('offer_variants') as any)
            .insert(variantsToInsert);
          if (variantError) throw variantError;
        }
      }

      handleCloseForm();
      await loadOffers();
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error("Erreur lors de la création de l'offre");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette offre ?')) return;

    try {
      const { error } = await (supabase
        .from('offers') as any)
        .delete()
        .eq('id', offerId);

      if (error) throw error;

      toast.success('Offre supprimée');
      await loadOffers();
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Marquer une offre comme prête (draft -> ready)
  const handleMarkAsReady = async (offer: Offer) => {
    try {
      const { error } = await (supabase
        .from('offers') as any)
        .update({ status: 'ready' })
        .eq('id', offer.id);

      if (error) throw error;

      toast.success('Offre marquée comme prête !');
      await loadOffers();
    } catch (error) {
      console.error('Error marking offer as ready:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Soumettre une offre pour validation (ready -> pending)
  const handleSubmitForApproval = async (offer: Offer) => {
    try {
      const { error } = await (supabase
        .from('offers') as any)
        .update({ status: 'pending' })
        .eq('id', offer.id);

      if (error) throw error;

      // Notifier l'admin
      await supabase.functions.invoke('send-offer-notification', {
        body: {
          offerId: offer.id,
          offerTitle: offer.title
        }
      });

      toast.success('Offre soumise pour validation !');
      await loadOffers();
    } catch (error) {
      console.error('Error submitting offer:', error);
      toast.error('Erreur lors de la soumission');
    }
  };

  // Mettre une offre hors ligne (approved -> draft)
  const handleTakeOffline = async (offer: Offer) => {
    try {
      const { error } = await (supabase
        .from('offers') as any)
        .update({ status: 'draft', is_approved: false })
        .eq('id', offer.id);

      if (error) throw error;

      toast.success('Offre mise hors ligne');
      await loadOffers();
    } catch (error) {
      console.error('Error taking offer offline:', error);
      toast.error('Erreur lors de la mise hors ligne');
    }
  };

  const filteredOffers = offers.filter(offer => {
    const matchesSearch = offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || offer.status === statusFilter;

    return matchesSearch && matchesStatus;
  });
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Mes offres</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez vos offres et suivez leur statut de validation
          </p>
        </div>

        {/* Actions principales */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouvelle offre
          </button>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            {/* Recherche */}
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher une offre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>

            {/* Filtres */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary bg-white"
              >
                <option value="all">Tous les statuts</option>
                <option value="draft">Brouillons</option>
                <option value="ready">Prêtes</option>
                <option value="pending">En validation</option>
                <option value="approved">Approuvées</option>
                <option value="rejected">Refusées</option>
              </select>
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-soft">
            <div className="flex items-center">
              <Clock className="w-6 h-6 text-gray-500 mr-2" />
              <div>
                <p className="text-xs text-gray-500">Brouillons</p>
                <p className="text-xl font-bold text-gray-900">
                  {offers.filter(o => o.status === 'draft').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-soft">
            <div className="flex items-center">
              <CheckCircle2 className="w-6 h-6 text-blue-600 mr-2" />
              <div>
                <p className="text-xs text-gray-500">Prêtes</p>
                <p className="text-xl font-bold text-gray-900">
                  {offers.filter(o => o.status === 'ready').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-soft">
            <div className="flex items-center">
              <Clock className="w-6 h-6 text-yellow-600 mr-2" />
              <div>
                <p className="text-xs text-gray-500">En validation</p>
                <p className="text-xl font-bold text-gray-900">
                  {offers.filter(o => o.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-soft">
            <div className="flex items-center">
              <CheckCircle2 className="w-6 h-6 text-green-600 mr-2" />
              <div>
                <p className="text-xs text-gray-500">Approuvées</p>
                <p className="text-xl font-bold text-gray-900">
                  {offers.filter(o => o.status === 'approved').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-soft">
            <div className="flex items-center">
              <XCircle className="w-6 h-6 text-red-600 mr-2" />
              <div>
                <p className="text-xs text-gray-500">Refusées</p>
                <p className="text-xl font-bold text-gray-900">
                  {offers.filter(o => o.status === 'rejected').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des offres */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredOffers.map((offer) => {
              const config = statusConfig[offer.status as keyof typeof statusConfig] || statusConfig.draft;
              const StatusIcon = config.icon;
              const category = categories.find(c => c.slug === offer.category_slug);
              const subcategory = category?.subcategories.find(s => s.slug === offer.subcategory_slug);
              const mainVariant = offer.variants?.[0];

              return (
                <li key={offer.id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4">
                          {/* Image */}
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                            {offer.image_url || offer.media?.[0] ? (
                              <img
                                src={offer.image_url || offer.media?.[0]?.url}
                                alt={offer.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                <ImageIcon className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-gray-900 truncate">
                              {offer.title}
                            </h3>
                            <div className="mt-1 flex items-center gap-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
                              >
                                <StatusIcon className="w-4 h-4 mr-1" />
                                {config.label}
                              </span>
                              <span className="text-sm text-gray-500">
                                {new Date(offer.created_at).toLocaleDateString('fr-FR')}
                              </span>
                              <span className="text-sm font-medium">
                                {(() => {
                                  if (!offer.variants || offer.variants.length === 0) return null;

                                  // Find lowest price
                                  const prices = offer.variants.map(v => v.discounted_price || v.price).filter(p => !isNaN(Number(p)));
                                  const minPrice = Math.min(...prices);
                                  const isDiscounted = offer.variants.some(v => v.discounted_price === minPrice);
                                  const hasMultiple = offer.variants.length > 1;

                                  return (
                                    <span className={`${isDiscounted ? 'text-primary font-bold' : 'text-gray-900'}`}>
                                      {hasMultiple && <span className="text-gray-500 font-normal mr-1">À partir de</span>}
                                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(minPrice)}
                                    </span>
                                  );
                                })()}
                              </span>
                              {/* Stock Indicator */}
                              {offer.variants && offer.variants.length > 0 && (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${offer.variants.some(v => v.stock === 0)
                                  ? 'bg-red-100 text-red-800'
                                  : offer.variants.some(v => v.stock !== null && v.stock < 10)
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                                  }`}>
                                  {(() => {
                                    const totalStock = offer.variants.reduce((acc, v) => acc + (v.stock || 0), 0);
                                    const hasUnlimited = offer.variants.some(v => v.stock === null);
                                    if (offer.variants.every(v => v.stock === 0)) return 'Épuisé';
                                    if (hasUnlimited) return 'Stock illimité';
                                    return `Stock: ${totalStock}`;
                                  })()}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 mt-2">
                              {offer.variants && offer.variants.map((variant: any) => {
                                const sold = bookingCounts[variant.id] || 0;
                                const remaining = variant.stock;
                                const hasStock = remaining !== null;
                                const total = hasStock ? remaining + sold : null;
                                const lowStock = hasStock && remaining < 5;
                                const noStock = hasStock && remaining <= 0;

                                let stockColor = 'text-gray-500 bg-gray-100';
                                if (noStock) stockColor = 'text-red-700 bg-red-100';
                                else if (lowStock) stockColor = 'text-orange-700 bg-orange-100';
                                else if (hasStock) stockColor = 'text-green-700 bg-green-100';

                                return (
                                  <div key={variant.id} className="text-xs flex items-center gap-2">
                                    <span className="font-medium text-gray-700">{variant.name}:</span>
                                    <span className={`px-2 py-0.5 rounded-full ${stockColor} flex gap-1`}>
                                      <span className="font-bold">{hasStock ? remaining : 'Illimité'}</span>
                                      {hasStock && <span>restants</span>}
                                      {hasStock && <span className="opacity-75 font-normal ml-1">({sold} vendus)</span>}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex items-center gap-2 text-gray-500 mt-2">
                              <MapPin className="w-4 h-4" />
                              <span>{[offer.street_address, offer.zip_code, offer.city].filter(Boolean).join(', ') || 'Adresse non spécifiée'}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                              <span>{category?.name}</span>
                              {subcategory && <span>• {subcategory.name}</span>}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => setSelectedOffer(offer)}
                          className="p-2 text-gray-400 hover:text-primary rounded-full hover:bg-gray-100 transition-colors duration-200"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {/* Bouton Marquer comme prête (draft -> ready) */}
                        {offer.status === 'draft' && (
                          <button
                            onClick={() => handleMarkAsReady(offer)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                          >
                            Marquer prête
                          </button>
                        )}
                        {/* Bouton Soumettre (ready -> pending) */}
                        {offer.status === 'ready' && (
                          <button
                            onClick={() => handleSubmitForApproval(offer)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none"
                          >
                            Soumettre
                          </button>
                        )}
                        {/* Bouton Re-soumettre (rejected -> pending) */}
                        {offer.status === 'rejected' && (
                          <button
                            onClick={() => handleSubmitForApproval(offer)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none"
                          >
                            Re-soumettre
                          </button>
                        )}
                        {/* Bouton Mettre hors ligne (approved -> draft) */}
                        {offer.status === 'approved' && (
                          <button
                            onClick={() => handleTakeOffline(offer)}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-full shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                          >
                            Hors ligne
                          </button>
                        )}
                        {/* Modifier (Tous statuts) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleEditOffer(offer);
                          }}
                          className="p-2 text-gray-400 hover:text-primary rounded-full hover:bg-gray-100 transition-colors duration-200"
                          title="Modifier l'offre"
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>

                        {/* Voir en ligne (Seulement si approuvée) */}
                        {offer.status === 'approved' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.open(`/club?offer=${offer.id}`, '_blank');
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors duration-200"
                            title="Voir l'offre en ligne"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        )}

                        {/* Supprimer (Seulement brouillon ou prête) */}
                        {(offer.status === 'draft' || offer.status === 'ready') && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteOffer(offer.id);
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors duration-200"
                            title="Supprimer l'offre"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Message si aucune offre */}
        {filteredOffers.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="mb-4">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune offre trouvée
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter !== 'all'
                ? "Aucune offre ne correspond à vos critères de recherche."
                : "Vous n'avez pas encore créé d'offre."}
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
            >
              <Plus className="w-5 h-5 mr-2" />
              Créer votre première offre
            </button>
          </div>
        )}
        {/* Formulaire de création */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <CreateOffer
              offer={editingOffer}
              onClose={handleCloseForm}
              onSuccess={() => {
                handleCloseForm();
                loadOffers();
              }}
            />
          </div>
        )}

        {/* Modal de détails */}
        {selectedOffer && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Détails de l'offre
                  </h2>
                  <button
                    onClick={() => setSelectedOffer(null)}
                    className="p-1 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-6">
                  {selectedOffer.media?.[0] && (
                    <div>
                      <img
                        src={selectedOffer.media[0].url}
                        alt={selectedOffer.title}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                  )}

                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {selectedOffer.title}
                    </h3>
                    <div className="flex items-center gap-4 mb-4">
                      {(() => {
                        const config = statusConfig[selectedOffer.status as keyof typeof statusConfig] || statusConfig.draft;
                        const StatusIcon = config.icon;
                        return (
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
                            <StatusIcon className="w-4 h-4 mr-1" />
                            {config.label}
                          </span>
                        );
                      })()}
                      {selectedOffer.variants?.[0] && (
                        <span className="text-lg font-bold text-primary">
                          {selectedOffer.variants[0].price}€
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                    <p className="text-gray-600">{selectedOffer.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Catégorie</h4>
                      <p className="text-gray-600">
                        {categories.find(c => c.slug === selectedOffer.category_slug)?.name}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Sous-catégorie</h4>
                      <p className="text-gray-600">
                        {categories.find(c => c.slug === selectedOffer.category_slug)
                          ?.subcategories.find(s => s.slug === selectedOffer.subcategory_slug)?.name}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Localisation</h4>
                    <p className="text-gray-600 flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {[selectedOffer.street_address, selectedOffer.zip_code, selectedOffer.city].filter(Boolean).join(', ') || 'Adresse non spécifiée'}
                    </p>
                  </div>

                  {/* --- Affichage agenda si dispo --- */}
                  {selectedOffer.calendly_url && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Réservations</h4>
                      <a
                        href={selectedOffer.calendly_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        Voir les créneaux disponibles
                      </a>
                    </div>
                  )}

                  {selectedOffer.status === 'rejected' && selectedOffer.rejection_reason && (
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <h4 className="font-semibold text-red-900 mb-2">Raison du rejet</h4>
                      <p className="text-red-700">{selectedOffer.rejection_reason}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div >
  );
}
