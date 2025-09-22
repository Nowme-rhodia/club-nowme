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
  Calendar
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { categories } from '../../data/categories';
import { LocationSearch } from '../../components/LocationSearch';
import toast from 'react-hot-toast';

interface PendingOffer {
  id: string;
  title: string;
  description: string;
  category_slug: string;
  subcategory_slug: string;
  price?: number;
  image_url?: string;
  location?: string;
  status?: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  requires_agenda?: boolean;
  calendly_url?: string | null;
}

interface ApprovedOffer {
  id: string;
  title: string;
  description: string;
  category_slug: string;
  subcategory_slug: string;
  location: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'active';
  is_active?: boolean;
  created_at: string;
  requires_agenda?: boolean;
  calendly_url?: string | null;
  prices: Array<{
    id: string;
    name: string;
    price: number;
    promo_price?: number;
    duration: string;
  }>;
  media: Array<{
    id: string;
    url: string;
    type: 'image' | 'video';
    order: number;
  }>;
}

const statusConfig = {
  pending: {
    label: 'En attente',
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
  },
  active: {
    label: 'Active',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-700'
  },
  draft: {
    label: 'Brouillon',
    icon: Clock,
    className: 'bg-gray-100 text-gray-700'
  }
};
export default function Offers() {
  const { user } = useAuth();
  const [pendingOffers, setPendingOffers] = useState<PendingOffer[]>([]);
  const [approvedOffers, setApprovedOffers] = useState<ApprovedOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<PendingOffer | null>(null);
  const [newOffer, setNewOffer] = useState({
    title: '',
    description: '',
    category_slug: '',
    subcategory_slug: '',
    price: '',
    image_url: '',
    location: '',
    requires_agenda: false,
    calendly_url: ''
  });

  useEffect(() => {
    if (user) {
      loadOffers();
    }
  }, [user]);

  const loadOffers = async () => {
    try {
      // Récupérer le partner_id
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (partnerError) throw partnerError;

      // Récupérer les offres en attente
      const { data: pendingData, error: pendingError } = await supabase
        .from('pending_offers')
        .select('*')
        .eq('pending_partner_id', partnerData.id)
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;

      // Récupérer les offres approuvées
      const { data: approvedData, error: approvedError } = await supabase
        .from('offers')
        .select(`
          *,
          prices:offer_prices(*),
          media:offer_media(*)
        `)
        .eq('partner_id', partnerData.id)
        .order('created_at', { ascending: false });

      if (approvedError) throw approvedError;

      setPendingOffers(pendingData || []);
      setApprovedOffers(approvedData || []);
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
      // Récupérer le partner_id
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('id, business_name')
        .eq('user_id', user?.id)
        .single();

      if (partnerError) throw partnerError;

      // Créer l'offre en attente
      const { error: createError } = await supabase
        .from('pending_offers')
        .insert({
          pending_partner_id: partnerData.id,
          title: newOffer.title,
          description: newOffer.description,
          category_slug: newOffer.category_slug,
          subcategory_slug: newOffer.subcategory_slug,
          price: newOffer.price ? parseFloat(newOffer.price) : null,
          location: newOffer.location,
          image_url: newOffer.image_url || null,
          requires_agenda: newOffer.requires_agenda,
          calendly_url: newOffer.requires_agenda ? newOffer.calendly_url : null,
          status: 'pending'
        });

      if (createError) throw createError;

      // Envoyer notification à l'admin
      await supabase.functions.invoke('send-offer-notification', {
        body: {
          partnerName: partnerData.business_name,
          offerTitle: newOffer.title,
          offerDescription: newOffer.description
        }
      });

      toast.success('Offre soumise avec succès !');
      setShowCreateForm(false);
      setNewOffer({
        title: '',
        description: '',
        category_slug: '',
        subcategory_slug: '',
        price: '',
        image_url: '',
        location: '',
        requires_agenda: false,
        calendly_url: ''
      });
      await loadOffers();
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error("Erreur lors de la création de l'offre");
    }
  };

  const handleDeletePendingOffer = async (offerId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette offre ?')) return;

    try {
      const { error } = await supabase
        .from('pending_offers')
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

  const filteredPendingOffers = pendingOffers.filter(offer => {
    const matchesSearch = offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         offer.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || offer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredApprovedOffers = approvedOffers.filter(offer => {
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
                <option value="pending">En attente</option>
                <option value="approved">Approuvées</option>
                <option value="rejected">Refusées</option>
                <option value="active">Actives</option>
              </select>
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-soft">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600 mr-3" />
              <div>
                <p className="text-sm text-gray-500">En attente</p>
                <p className="text-2xl font-bold text-gray-900">
                  {pendingOffers.filter(o => o.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-soft">
            <div className="flex items-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-gray-500">Approuvées</p>
                <p className="text-2xl font-bold text-gray-900">{approvedOffers.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-soft">
            <div className="flex items-center">
              <XCircle className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <p className="text-sm text-gray-500">Refusées</p>
                <p className="text-2xl font-bold text-gray-900">
                  {pendingOffers.filter(o => o.status === 'rejected').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-soft">
            <div className="flex items-center">
              <CheckCircle2 className="w-8 h-8 text-primary mr-3" />
              <div>
                <p className="text-sm text-gray-500">Actives</p>
                <p className="text-2xl font-bold text-gray-900">
                  {approvedOffers.filter(o => o.is_active !== false).length}
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Offres en attente */}
        {filteredPendingOffers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Offres en attente de validation</h2>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {filteredPendingOffers.map((offer) => {
                  const StatusIcon = statusConfig[offer.status || 'pending'].icon;
                  const category = categories.find(c => c.slug === offer.category_slug);
                  const subcategory = category?.subcategories.find(s => s.slug === offer.subcategory_slug);

                  return (
                    <li key={offer.id}>
                      <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors duration-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-4">
                              {/* Image */}
                              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                {offer.image_url ? (
                                  <img
                                    src={offer.image_url}
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
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[offer.status || 'pending'].className}`}
                                  >
                                    <StatusIcon className="w-4 h-4 mr-1" />
                                    {statusConfig[offer.status || 'pending'].label}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    {new Date(offer.created_at).toLocaleDateString('fr-FR')}
                                  </span>
                                  {offer.price && (
                                    <span className="text-sm text-primary font-medium">
                                      {offer.price}€
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                                  <span>{category?.name}</span>
                                  {subcategory && <span>• {subcategory.name}</span>}
                                  {offer.location && (
                                    <span className="flex items-center">
                                      <MapPin className="w-3 h-3 mr-1" />
                                      {offer.location}
                                    </span>
                                  )}
                                </div>

                                {/* Affichage du lien Calendly si requis */}
                                {offer.requires_agenda && offer.calendly_url && (
                                  <div className="mt-2 text-sm">
                                    <a
                                      href={offer.calendly_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary underline"
                                    >
                                      Voir les créneaux disponibles
                                    </a>
                                  </div>
                                )}

                                {/* Raison du rejet */}
                                {offer.status === 'rejected' && offer.rejection_reason && (
                                  <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-200">
                                    <p className="text-sm text-red-700">
                                      <strong>Raison du rejet :</strong> {offer.rejection_reason}
                                    </p>
                                  </div>
                                )}
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
                            {offer.status === 'pending' && (
                              <button
                                onClick={() => handleDeletePendingOffer(offer.id)}
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
          </div>
        )}
        {/* Offres approuvées */}
        {filteredApprovedOffers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Mes offres validées</h2>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {filteredApprovedOffers.map((offer) => {
                  const StatusIcon = statusConfig[offer.status].icon;
                  const category = categories.find(c => c.slug === offer.category_slug);
                  const subcategory = category?.subcategories.find(s => s.slug === offer.subcategory_slug);
                  const mainPrice = offer.prices?.[0];

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
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[offer.status].className}`}
                                  >
                                    <StatusIcon className="w-4 h-4 mr-1" />
                                    {statusConfig[offer.status].label}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    {new Date(offer.created_at).toLocaleDateString('fr-FR')}
                                  </span>
                                  {mainPrice && (
                                    <span className="text-sm text-primary font-medium">
                                      À partir de {mainPrice.price}€
                                    </span>
                                  )}
                                  {offer.is_active === false && (
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                      Désactivée
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                                  <span>{category?.name}</span>
                                  {subcategory && <span>• {subcategory.name}</span>}
                                  <span className="flex items-center">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {offer.location}
                                  </span>
                                </div>

                                {/* Affichage du lien Calendly si requis */}
                                {offer.requires_agenda && offer.calendly_url && (
                                  <div className="mt-2 text-sm">
                                    <a
                                      href={offer.calendly_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary underline"
                                    >
                                      Réserver un créneau
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 ml-4">
                            <Link
                              to={`/offres/${offer.id}`}
                              className="p-2 text-gray-400 hover:text-primary rounded-full hover:bg-gray-100 transition-colors duration-200"
                            >
                              <Eye className="w-5 h-5" />
                            </Link>
                            <Link
                              to={`/partner/offers/${offer.id}/edit`}
                              className="p-2 text-gray-400 hover:text-primary rounded-full hover:bg-gray-100 transition-colors duration-200"
                            >
                              <Edit3 className="w-5 h-5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
        {/* Message si aucune offre */}
        {filteredPendingOffers.length === 0 && filteredApprovedOffers.length === 0 && (
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
                      onChange={(e) => setNewOffer({...newOffer, title: e.target.value})}
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
                      onChange={(e) => setNewOffer({...newOffer, description: e.target.value})}
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
                        onChange={(e) => setNewOffer({...newOffer, category_slug: e.target.value, subcategory_slug: ''})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                        required
                      >
                        <option value="">Sélectionnez une catégorie</option>
                        {categories.map(category => (
                          <option key={category.slug} value={category.slug}>
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
                        onChange={(e) => setNewOffer({...newOffer, subcategory_slug: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                        disabled={!newOffer.category_slug}
                        required
                      >
                        <option value="">Sélectionnez une sous-catégorie</option>
                        {newOffer.category_slug && categories
                          .find(cat => cat.slug === newOffer.category_slug)
                          ?.subcategories.map(subcategory => (
                            <option key={subcategory.slug} value={subcategory.slug}>
                              {subcategory.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* --- Prix & image --- */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prix (€)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newOffer.price}
                          onChange={(e) => setNewOffer({...newOffer, price: e.target.value})}
                          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                          placeholder="0.00"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                          <Euro className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Image (URL)
                      </label>
                      <input
                        type="url"
                        value={newOffer.image_url}
                        onChange={(e) => setNewOffer({...newOffer, image_url: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  {/* --- Localisation --- */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Localisation
                    </label>
                    <LocationSearch 
                      onLocationSelect={(location) => {
                        setNewOffer({...newOffer, location: location.address});
                      }}
                    />
                  </div>

                  {/* --- Agenda --- */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newOffer.requires_agenda}
                      onChange={(e) =>
                        setNewOffer({
                          ...newOffer,
                          requires_agenda: e.target.checked,
                          calendly_url: e.target.checked ? newOffer.calendly_url : "",
                        })
                      }
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label className="text-sm text-gray-700">
                      Cette offre nécessite une réservation via agenda (Calendly)
                    </label>
                  </div>

                  {newOffer.requires_agenda && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Lien Calendly
                      </label>
                      <input
                        type="url"
                        value={newOffer.calendly_url}
                        onChange={(e) =>
                          setNewOffer({...newOffer, calendly_url: e.target.value})
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                        placeholder="https://calendly.com/votre-lien"
                        required={newOffer.requires_agenda}
                      />
                    </div>
                  )}

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
                      Soumettre l'offre
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
                  {selectedOffer.image_url && (
                    <div>
                      <img
                        src={selectedOffer.image_url}
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
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig[selectedOffer.status || 'pending'].className}`}>
                        {statusConfig[selectedOffer.status || 'pending'].label}
                      </span>
                      {selectedOffer.price && (
                        <span className="text-lg font-bold text-primary">
                          {selectedOffer.price}€
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

                  {selectedOffer.location && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Localisation</h4>
                      <p className="text-gray-600 flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {selectedOffer.location}
                      </p>
                    </div>
                  )}

                  {/* --- Affichage agenda si activé --- */}
                  {selectedOffer.requires_agenda && selectedOffer.calendly_url && (
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
