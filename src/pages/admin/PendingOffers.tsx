import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Eye,
  Search,
  Filter,
  ChevronDown,
  Mail,
  MapPin,
  Image as ImageIcon,
  Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { categories } from '../../data/categories';
import toast from 'react-hot-toast';

interface PendingOffer {
  id: string;
  title: string;
  description: string;
  category_slug: string;
  subcategory_slug: string;
  price?: number;
  location?: string;
  image_url?: string;
  requires_agenda?: boolean;
  calendly_url?: string | null;
  status?: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  pending_partner: {
    id: string;
    business_name: string;
    contact_name: string;
    email: string;
    phone: string;
  };
}

const statusConfig = {
  pending: {
    label: 'En attente',
    icon: AlertCircle,
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

export default function PendingOffers() {
  const [offers, setOffers] = useState<PendingOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedOffer, setSelectedOffer] = useState<PendingOffer | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [offerToReject, setOfferToReject] = useState<PendingOffer | null>(null);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('pending_offers')
        .select(`
          *,
          pending_partner:pending_partners(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error('Error loading offers:', error);
      toast.error('Erreur lors du chargement des offres');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (offer: PendingOffer) => {
    try {
      let partnerId = null;

      // Vérifier si le partenaire existe déjà
      const { data: existingPartner, error: partnerCheckError } = await supabase
        .from('partners')
        .select('id')
        .eq('business_name', offer.pending_partner.business_name)
        .eq('contact_name', offer.pending_partner.contact_name)
        .single();

      if (partnerCheckError && partnerCheckError.code !== 'PGRST116') {
        throw partnerCheckError;
      }

      if (existingPartner) {
        partnerId = existingPartner.id;
      } else {
        const { data: newPartner, error: partnerError } = await supabase
          .from('partners')
          .insert({
            business_name: offer.pending_partner.business_name,
            contact_name: offer.pending_partner.contact_name,
            phone: offer.pending_partner.phone,
            description: `Partenaire validé via l'offre: ${offer.title}`
          })
          .select('id')
          .single();

        if (partnerError) throw partnerError;
        partnerId = newPartner.id;
      }

      // Créer l'offre validée
      const { data: newOffer, error: offerError } = await supabase
        .from('offers')
        .insert({
          partner_id: partnerId,
          title: offer.title,
          description: offer.description,
          category_slug: offer.category_slug,
          subcategory_slug: offer.subcategory_slug,
          location: offer.location || 'Paris',
          requires_agenda: offer.requires_agenda || false,
          calendly_url: offer.requires_agenda ? offer.calendly_url : null,
          status: 'active',
          is_active: true
        })
        .select('id')
        .single();

      if (offerError) throw offerError;

      // Ajouter un prix
      if (offer.price) {
        const { error: priceError } = await supabase
          .from('offer_prices')
          .insert({
            offer_id: newOffer.id,
            name: 'Prix standard',
            price: offer.price,
            duration: 'Séance'
          });
        if (priceError) throw priceError;
      }

      // Ajouter une image
      if (offer.image_url) {
        const { error: mediaError } = await supabase
          .from('offer_media')
          .insert({
            offer_id: newOffer.id,
            url: offer.image_url,
            type: 'image',
            order: 1
          });
        if (mediaError) throw mediaError;
      }

      // Supprimer de pending_offers
      const { error: deleteError } = await supabase
        .from('pending_offers')
        .delete()
        .eq('id', offer.id);
      if (deleteError) throw deleteError;

      // Envoyer notif
      await supabase.functions.invoke('send-offer-approval', {
        body: {
          to: offer.pending_partner.email,
          contactName: offer.pending_partner.contact_name,
          offerTitle: offer.title
        }
      });

      toast.success('Offre approuvée avec succès !');
      await loadOffers();
    } catch (error) {
      console.error('Error approving offer:', error);
      toast.error("Erreur lors de l'approbation");
    }
  };

  const handleReject = async () => {
    if (!offerToReject || !rejectionReason.trim()) {
      toast.error('Veuillez saisir une raison de rejet');
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('pending_offers')
        .update({ 
          status: 'rejected',
          rejection_reason: rejectionReason
        })
        .eq('id', offerToReject.id);

      if (updateError) throw updateError;

      await supabase.functions.invoke('send-offer-rejection', {
        body: {
          to: offerToReject.pending_partner.email,
          contactName: offerToReject.pending_partner.contact_name,
          offerTitle: offerToReject.title,
          rejectionReason: rejectionReason
        }
      });

      toast.success('Offre rejetée');
      setShowRejectionModal(false);
      setOfferToReject(null);
      setRejectionReason('');
      await loadOffers();
    } catch (error) {
      console.error('Error rejecting offer:', error);
      toast.error('Erreur lors du rejet');
    }
  };

  const filteredOffers = offers
    .filter(offer => {
      const matchesSearch = 
        offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.pending_partner.business_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || offer.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc'
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
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
        <h1 className="text-2xl font-bold text-gray-900">Offres en attente</h1>
        <p className="mt-1 text-sm text-gray-500">
          Validez ou rejetez les offres soumises par les partenaires
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-soft">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm text-gray-500">En attente</p>
              <p className="text-2xl font-bold text-gray-900">
                {offers.filter(o => o.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-soft">
          <div className="flex items-center">
            <CheckCircle2 className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Approuvées</p>
              <p className="text-2xl font-bold text-gray-900">
                {offers.filter(o => o.status === 'approved').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-soft">
          <div className="flex items-center">
            <XCircle className="w-8 h-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Rejetées</p>
              <p className="text-2xl font-bold text-gray-900">
                {offers.filter(o => o.status === 'rejected').length}
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
            placeholder="Rechercher une offre..."
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
              {Object.entries(statusConfig).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
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
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Liste des offres */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredOffers.map((offer) => {
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
                          <h3 className="text-lg font-medium text-gray-900">
                            {offer.title}
                          </h3>
                          <div className="mt-1 flex items-center gap-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[offer.status || 'pending'].className}`}>
                              <StatusIcon className="w-4 h-4 mr-1" />
                              {statusConfig[offer.status || 'pending'].label}
                            </span>
                            <span className="text-sm text-gray-500">
                              {format(new Date(offer.created_at), 'dd MMMM yyyy', { locale: fr })}
                            </span>
                            {offer.price && (
                              <span className="text-sm text-primary font-medium">
                                {offer.price}€
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                            <span className="font-medium">{offer.pending_partner.business_name}</span>
                            <a 
                              href={`mailto:${offer.pending_partner.email}`}
                              className="inline-flex items-center text-primary hover:text-primary-dark"
                            >
                              <Mail className="w-4 h-4 mr-1" />
                              {offer.pending_partner.email}
                            </a>
                            <span>{category?.name}</span>
                            {offer.location && (
                              <span className="flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                {offer.location}
                              </span>
                            )}
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
                      {offer.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(offer)}
                            className="p-2 text-gray-400 hover:text-green-600 rounded-full hover:bg-gray-100 transition-colors duration-200"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setOfferToReject(offer);
                              setShowRejectionModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors duration-200"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </>
                      )}
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
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
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
                  <h4 className="font-semibold text-gray-900 mb-2">Partenaire</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-medium">{selectedOffer.pending_partner.business_name}</p>
                    <p className="text-sm text-gray-600">{selectedOffer.pending_partner.contact_name}</p>
                    <p className="text-sm text-gray-600">{selectedOffer.pending_partner.email}</p>
                    <p className="text-sm text-gray-600">{selectedOffer.pending_partner.phone}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600">{selectedOffer.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Catégorie</h4>
                    <p className="text-gray-600">{category?.name}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Sous-catégorie</h4>
                    <p className="text-gray-600">{subcategory?.name}</p>
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

                {selectedOffer.status === 'rejected' && selectedOffer.rejection_reason && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="font-semibold text-red-900 mb-2">Raison du rejet</h4>
                    <p className="text-red-700">{selectedOffer.rejection_reason}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedOffer(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Fermer
                </button>
                {selectedOffer.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        setOfferToReject(selectedOffer);
                        setShowRejectionModal(true);
                        setSelectedOffer(null);
                      }}
                      className="px-4 py-2 border border-red-300 rounded-md text-red-700 hover:bg-red-50"
                    >
                      Rejeter
                    </button>
                    <button
                      onClick={() => {
                        handleApprove(selectedOffer);
                        setSelectedOffer(null);
                      }}
                      className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                    >
                      Approuver
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de rejet */}
      {showRejectionModal && offerToReject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Rejeter l'offre
              </h3>
              <p className="text-gray-600 mb-4">
                Offre : <strong>{offerToReject.title}</strong>
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Raison du rejet *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  placeholder="Expliquez pourquoi cette offre ne peut pas être acceptée..."
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRejectionModal(false);
                    setOfferToReject(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Rejeter l'offre
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}