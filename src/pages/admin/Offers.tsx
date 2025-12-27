import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Search,
  Filter,
  ChevronDown,
  Eye,
  ToggleLeft,
  ToggleRight,
  MapPin,
  Euro,
  Image as ImageIcon,
  Calendar,
  Building2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { categories } from '../../data/categories';
import toast from 'react-hot-toast';

interface Offer {
  id: string;
  title: string;
  description: string;
  category_slug: string;
  subcategory_slug: string;
  location: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'active';
  is_approved?: boolean;
  created_at: string;
  updated_at: string;
  partner: {
    id: string;
    business_name: string;
    contact_name: string;
    phone: string;
  };
  variants: Array<{
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
  image_url?: string;
}

export default function Offers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select(`
          *,
          category:offer_categories!offers_category_id_fkey(name, slug, parent_slug),
          partner:partners(*),
          variants:offer_variants(*)
        `) as any;

      if (error) throw error;

      console.log('Admin Offers: Loaded offers:', data?.length);

      const formattedData = data?.map((offer: any) => ({
        ...offer,
        // Aligner avec les interfaces attendues si besoin
        category_slug: offer.category?.parent_slug || offer.category?.slug || 'autre',
        subcategory_slug: offer.category?.parent_slug ? offer.category.slug : undefined,
        location: [offer.street_address, offer.zip_code, offer.city].filter(Boolean).join(', ') || 'Adresse non spécifiée'
      }));

      setOffers(formattedData || []);
    } catch (error) {
      console.error('Error loading offers:', error);
      toast.error('Erreur lors du chargement des offres');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveOffer = async (offerId: string) => {
    try {
      const { error } = await (supabase
        .from('offers') as any)
        .update({
          status: 'approved',
          is_approved: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', offerId);

      if (error) throw error;

      toast.success('Offre approuvée');
      await loadOffers();
    } catch (error) {
      console.error('Error approving offer:', error);
      toast.error('Erreur lors de l\'approbation');
    }
  };

  const handleToggleActive = async (offerId: string, currentStatus: boolean) => {
    try {
      const { error } = await (supabase
        .from('offers') as any)
        .update({
          is_approved: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', offerId);

      if (error) throw error;

      toast.success(currentStatus ? 'Offre désactivée' : 'Offre activée');
      await loadOffers();
    } catch (error) {
      console.error('Error toggling offer status:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const filteredOffers = offers
    .filter(offer => {
      const matchesSearch =
        offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.partner.business_name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && offer.is_approved !== false) ||
        (statusFilter === 'inactive' && offer.is_approved === false) ||
        (statusFilter === 'draft' && offer.status === 'draft') ||
        (statusFilter === 'approved' && offer.status === 'approved') ||
        offer.status === statusFilter;

      const matchesCategory = categoryFilter === 'all' || offer.category_slug === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc'
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'partner') {
        return sortOrder === 'desc'
          ? b.partner.business_name.localeCompare(a.partner.business_name)
          : a.partner.business_name.localeCompare(b.partner.business_name);
      } else {
        return sortOrder === 'desc'
          ? b.title.localeCompare(a.title)
          : a.title.localeCompare(b.title);
      }
    });

  if (loading) {
    return (
      <div className="p-8">
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
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Offres validées</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gérez les offres approuvées et leur statut d'activation
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-soft">
          <div className="flex items-center">
            <Building2 className="w-8 h-8 text-primary mr-3" />
            <div>
              <p className="text-sm text-gray-500">Total offres</p>
              <p className="text-2xl font-bold text-gray-900">{offers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-soft">
          <div className="flex items-center">
            <ToggleRight className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Actives</p>
              <p className="text-2xl font-bold text-gray-900">
                {offers.filter(o => o.is_approved !== false).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-soft">
          <div className="flex items-center">
            <ToggleLeft className="w-8 h-8 text-gray-600 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Désactivées</p>
              <p className="text-2xl font-bold text-gray-900">
                {offers.filter(o => o.is_approved === false).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-soft">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Ce mois</p>
              <p className="text-2xl font-bold text-gray-900">
                {offers.filter(o => {
                  const offerDate = new Date(o.created_at);
                  const now = new Date();
                  return offerDate.getMonth() === now.getMonth() &&
                    offerDate.getFullYear() === now.getFullYear();
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Rechercher une offre ou un partenaire..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary bg-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="draft">Brouillon</option>
              <option value="approved">Approuvées</option>
              <option value="active">Actives</option>
              <option value="inactive">Désactivées</option>
            </select>
            <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary bg-white"
            >
              <option value="all">Toutes les catégories</option>
              {categories.map(category => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>

          <div className="relative">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('-');
                setSortBy(newSortBy);
                setSortOrder(newSortOrder);
              }}
              className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary bg-white"
            >
              <option value="date-desc">Plus récent</option>
              <option value="date-asc">Plus ancien</option>
              <option value="title-asc">A-Z</option>
              <option value="title-desc">Z-A</option>
              <option value="partner-asc">Partenaire A-Z</option>
              <option value="partner-desc">Partenaire Z-A</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Liste des offres */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredOffers.map((offer) => {
            const category = categories.find(c => c.slug === offer.category_slug);
            const subcategory = category?.subcategories.find(s => s.slug === offer.subcategory_slug);
            const mainVariant = offer.variants?.[0];
            const isActive = offer.is_approved !== false;

            return (
              <li key={offer.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-4">
                        {/* Image */}
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                          {(offer.image_url || offer.media?.[0]) ? (
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
                          <h3 className="text-lg font-medium text-gray-900">
                            {offer.title}
                          </h3>
                          <div className="mt-1 flex items-center gap-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                              }`}>
                              {isActive ? 'Active' : 'Désactivée'}
                            </span>
                            <span className="text-sm text-gray-500">
                              {format(new Date(offer.created_at), 'dd MMMM yyyy', { locale: fr })}
                            </span>
                            {mainVariant && (
                              <span className="text-sm text-primary font-medium">
                                À partir de {mainVariant.price}€
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                            <span className="font-medium">{offer.partner.business_name}</span>
                            <span>{category?.name}</span>
                            {subcategory && <span>• {subcategory.name}</span>}
                            <span className="flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {offer.location}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      {offer.status === 'draft' && (
                        <button
                          onClick={() => handleApproveOffer(offer.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                          title="Approuver l'offre"
                        >
                          Approuver
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedOffer(offer)}
                        className="p-2 text-gray-400 hover:text-primary rounded-full hover:bg-gray-100 transition-colors duration-200"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(offer.id, isActive)}
                        className={`p-2 rounded-full hover:bg-gray-100 transition-colors duration-200 ${isActive ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-green-600'
                          }`}
                      >
                        {isActive ? (
                          <ToggleRight className="w-5 h-5" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Modal de détails */}
      {selectedOffer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Détails de l'offre
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Images */}
                {(selectedOffer.image_url || selectedOffer.media.length > 0) && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Images</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedOffer.image_url && (
                        <img
                          src={selectedOffer.image_url}
                          alt={selectedOffer.title}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      )}
                      {selectedOffer.media.map((media) => (
                        <img
                          key={media.id}
                          src={media.url}
                          alt={selectedOffer.title}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Informations principales */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {selectedOffer.title}
                    </h3>
                    <div className="flex items-center gap-4 mb-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${selectedOffer.is_approved !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                        {selectedOffer.is_approved !== false ? 'Active' : 'Désactivée'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Partenaire</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="font-medium">{selectedOffer.partner.business_name}</p>
                      <p className="text-sm text-gray-600">{selectedOffer.partner.contact_name}</p>
                      <p className="text-sm text-gray-600">{selectedOffer.partner.phone}</p>
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
                      <h4 className="font-semibold text-gray-900 mb-1">Localisation</h4>
                      <p className="text-gray-600 flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {selectedOffer.location}
                      </p>
                    </div>
                  </div>

                  {/* Variants */}
                  {selectedOffer.variants.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Tarifs</h4>
                      <div className="space-y-2">
                        {selectedOffer.variants.map((variant) => (
                          <div key={variant.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                            <div>
                              <p className="font-medium">{variant.name}</p>
                              <p className="text-sm text-gray-600">{variant.duration}</p>
                            </div>
                            <div className="text-right">
                              {variant.promo_price ? (
                                <div>
                                  <span className="text-lg font-bold text-primary">{variant.promo_price}€</span>
                                  <span className="text-sm text-gray-400 line-through ml-2">{variant.price}€</span>
                                </div>
                              ) : (
                                <span className="text-lg font-bold text-gray-900">{variant.price}€</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => handleToggleActive(selectedOffer.id, selectedOffer.is_approved !== false)}
                  className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg transition-all transform active:scale-95 ${selectedOffer.is_approved !== false
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                >
                  {selectedOffer.is_approved !== false ? 'Désactiver' : 'Activer'}
                </button>

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
  );
}