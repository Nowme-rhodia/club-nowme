import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
import toast from 'react-hot-toast';

interface Offer {
  id: string;
  title: string;
  description: string;
  category_slug: string;
  subcategory_slug: string;
  street_address: string | null;
  zip_code: string | null;
  city: string | null;
  department: string | null;
  coordinates: [number, number] | null;
  status: 'draft' | 'ready' | 'pending' | 'approved' | 'rejected';
  is_approved: boolean;
  created_at: string;
  calendly_url?: string | null;
  event_start_date?: string | null;
  event_end_date?: string | null;
  variants?: Array<{
    id: string;
    name: string;
    price: number;
    discounted_price?: number | null;
  }>;
  media?: Array<{
    id: string;
    url: string;
    type: 'image' | 'video';
  }>;
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
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
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
  });

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

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from('offer_categories').select('*');
    if (data) setDbCategories(data);
  };

  const parentCategories = dbCategories.filter(c => !c.parent_slug);
  const subCategories = dbCategories.filter(c => c.parent_slug === newOffer.category_slug);

  useEffect(() => {
    if (user) {
      loadOffers();
    }
  }, [user]);

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
          variants:offer_variants(*)
        `)
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

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

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newOffer.title || !newOffer.description || !newOffer.category_slug) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
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

      // Créer l'offre en brouillon directement dans la table offers
      const { data: createdOffer, error: createError } = await (supabase
        .from('offers') as any)
        .insert({
          partner_id: partnerId,
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
          status: 'draft',
          is_approved: false
        })
        .select()
        .single();

      if (createError) throw createError;

      // Ajouter les variants
      if (createdOffer) {
        const validVariants = variants.filter(v => v.name && v.price);
        if (validVariants.length > 0) {
          const variantsToInsert = validVariants.map(v => ({
            offer_id: (createdOffer as any).id,
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

      toast.success('Offre créée en brouillon !');
      setShowCreateForm(false);
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
      });
      setVariants([{ name: '', price: '', discounted_price: '' }]);

      await loadOffers();
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error("Erreur lors de la création de l'offre");
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
                            {offer.media?.[0] ? (
                              <img
                                src={offer.media[0].url}
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
                              {mainVariant && (
                                <span className="text-sm text-primary font-medium">
                                  À partir de {mainVariant.price}€
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-gray-500">
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
                        {/* Bouton Éditer (draft, ready, rejected) */}
                        {(offer.status === 'draft' || offer.status === 'ready' || offer.status === 'rejected') && (
                          <Link
                            to={`/partner/offers/${offer.id}/edit`}
                            className="p-2 text-gray-400 hover:text-primary rounded-full hover:bg-gray-100 transition-colors duration-200"
                          >
                            <Edit3 className="w-5 h-5" />
                          </Link>
                        )}
                        {/* Bouton Supprimer (draft, ready) */}
                        {(offer.status === 'draft' || offer.status === 'ready') && (
                          <button
                            onClick={() => handleDeleteOffer(offer.id)}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors duration-200"
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
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Créer une nouvelle offre
                </h2>

                <form onSubmit={handleCreateOffer} className="space-y-6">
                  {/* --- Titre --- */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titre de l'offre *
                    </label>
                    <input
                      type="text"
                      value={newOffer.title}
                      onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      placeholder="Ex: Massage relaxant 60 minutes"
                      required
                    />
                  </div>

                  {/* --- Description --- */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={newOffer.description}
                      onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      placeholder="Décrivez votre offre en détail..."
                      required
                    />
                  </div>

                  {/* --- Catégorie & sous-catégorie --- */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Catégorie *
                      </label>
                      <select
                        value={newOffer.category_slug}
                        onChange={(e) => setNewOffer({ ...newOffer, category_slug: e.target.value, subcategory_slug: '' })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                        required
                      >
                        <option value="">Sélectionnez une catégorie</option>
                        {parentCategories.map(category => (
                          <option key={category.id} value={category.slug}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sous-catégorie *
                      </label>
                      <select
                        value={newOffer.subcategory_slug}
                        onChange={(e) => setNewOffer({ ...newOffer, subcategory_slug: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                        disabled={!newOffer.category_slug}
                        required
                      >
                        <option value="">Sélectionnez une sous-catégorie</option>
                        {subCategories.map(subcategory => (
                          <option key={subcategory.id} value={subcategory.slug}>
                            {subcategory.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* --- Variants (Tarifs) --- */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Tarifs *
                      </label>
                      <button
                        type="button"
                        onClick={addVariant}
                        className="inline-flex items-center px-3 py-1 text-sm font-medium text-primary hover:text-primary-dark"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Ajouter un tarif
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {variants.map((variant, index) => (
                        <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                Nom du tarif *
                              </label>
                              <input
                                type="text"
                                value={variant.name}
                                onChange={(e) => updateVariant(index, 'name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                                placeholder="Ex: Séance 1h, Pack 5 séances..."
                                required={index === 0}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                Prix (€) *
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={variant.price}
                                  onChange={(e) => updateVariant(index, 'price', e.target.value)}
                                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                                  placeholder="0.00"
                                  required={index === 0}
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                  <Euro className="w-3 h-3 text-gray-400" />
                                </div>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                Prix réduit (€)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={variant.discounted_price}
                                  onChange={(e) => updateVariant(index, 'discounted_price', e.target.value)}
                                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                                  placeholder="0.00"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                  <Euro className="w-3 h-3 text-gray-400" />
                                </div>
                              </div>
                            </div>
                          </div>
                          {variants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeVariant(index)}
                              className="mt-6 p-1 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Ajoutez différents tarifs pour votre offre (ex: durées différentes, packs, etc.)
                    </p>
                  </div>

                  {/* --- Localisation --- */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Localisation *
                    </label>
                    <LocationSearch
                      onSelect={(location) => {
                        setNewOffer({
                          ...newOffer,
                          street_address: location.street_address || '',
                          zip_code: location.zip_code || '',
                          city: location.city || '',
                          department: location.department || '',
                          coordinates: [location.lat, location.lng]
                        });
                      }}
                    />
                  </div>

                  {/* --- Agenda --- */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lien Calendly (optionnel)
                    </label>
                    <input
                      type="url"
                      value={newOffer.calendly_url}
                      onChange={(e) =>
                        setNewOffer({ ...newOffer, calendly_url: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      placeholder="https://calendly.com/votre-lien"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Laissez vide si l'offre ne nécessite pas de réservation par agenda.
                    </p>
                  </div>

                  {/* --- Actions --- */}
                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark"
                    >
                      Enregistrer en brouillon
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        {/* Modal de détails */}
        {selectedOffer && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Détails de l'offre
                </h2>

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

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setSelectedOffer(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
