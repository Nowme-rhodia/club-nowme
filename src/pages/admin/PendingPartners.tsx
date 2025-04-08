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
  Mail
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { approvePartner, rejectPartner } from '../../lib/partner';
import type { Database } from '../../types/supabase';

type PendingPartner = Database['public']['Tables']['pending_partners']['Row'] & {
  offer: Database['public']['Tables']['pending_offers']['Row'];
};

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

export default function PendingPartners() {
  const [partners, setPartners] = useState<PendingPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedPartner, setSelectedPartner] = useState<PendingPartner | null>(null);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('pending_partners')
        .select(`
          *,
          offer:pending_offers(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPartners(data as PendingPartner[]);
    } catch (error) {
      console.error('Error loading partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (partner: PendingPartner) => {
    try {
      await approvePartner(partner);
      await loadPartners();
    } catch (error) {
      console.error('Error approving partner:', error);
    }
  };

  const handleReject = async (partner: PendingPartner) => {
    try {
      await rejectPartner(partner);
      await loadPartners();
    } catch (error) {
      console.error('Error rejecting partner:', error);
    }
  };

  const filteredPartners = partners
    .filter(partner => {
      const matchesSearch = 
        partner.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        partner.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        partner.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || partner.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc'
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else {
        return sortOrder === 'desc'
          ? b.business_name.localeCompare(a.business_name)
          : a.business_name.localeCompare(b.business_name);
      }
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
          <h1 className="text-2xl font-bold text-gray-900">Demandes de partenariat</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez les demandes de partenariat entrantes
          </p>
        </div>

        {/* Filtres et recherche */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Rechercher un partenaire..."
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
                  const [newSortBy, newSortOrder] = e.target.value.split('-') as ['date' | 'name', 'asc' | 'desc'];
                  setSortBy(newSortBy);
                  setSortOrder(newSortOrder);
                }}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary bg-white"
              >
                <option value="date-desc">Plus récent</option>
                <option value="date-asc">Plus ancien</option>
                <option value="name-asc">A-Z</option>
                <option value="name-desc">Z-A</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Liste des demandes */}
        {filteredPartners.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="mb-4">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune demande trouvée
            </h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? "Aucune demande ne correspond à vos critères de recherche."
                : "Aucune demande de partenariat en attente."}
            </p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {filteredPartners.map((partner) => {
                const StatusIcon = statusConfig[partner.status].icon;
                return (
                  <li key={partner.id}>
                    <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-4">
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">
                                {partner.business_name}
                              </h3>
                              <div className="mt-1 flex items-center gap-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[partner.status].className}`}>
                                  <StatusIcon className="w-4 h-4 mr-1" />
                                  {statusConfig[partner.status].label}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {format(new Date(partner.created_at), 'dd MMMM yyyy', { locale: fr })}
                                </span>
                              </div>
                              <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                                <span>{partner.contact_name}</span>
                                <a 
                                  href={`mailto:${partner.email}`}
                                  className="inline-flex items-center text-primary hover:text-primary-dark"
                                >
                                  <Mail className="w-4 h-4 mr-1" />
                                  {partner.email}
                                </a>
                                <span>{partner.phone}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => setSelectedPartner(partner)}
                            className="p-2 text-gray-400 hover:text-primary rounded-full hover:bg-gray-100 transition-colors duration-200"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          {partner.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(partner)}
                                className="p-2 text-gray-400 hover:text-green-600 rounded-full hover:bg-gray-100 transition-colors duration-200"
                              >
                                <CheckCircle2 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleReject(partner)}
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
        )}

        {/* Modal de détails */}
        {selectedPartner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Détails de la demande
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Informations du partenaire
                    </h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Entreprise</dt>
                        <dd className="mt-1 text-sm text-gray-900">{selectedPartner.business_name}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Contact</dt>
                        <dd className="mt-1 text-sm text-gray-900">{selectedPartner.contact_name}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Email</dt>
                        <dd className="mt-1 text-sm text-gray-900">{selectedPartner.email}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Téléphone</dt>
                        <dd className="mt-1 text-sm text-gray-900">{selectedPartner.phone}</dd>
                      </div>
                    </dl>
                  </div>

                  {selectedPartner.offer && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Offre proposée
                      </h3>
                      <dl className="space-y-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Titre</dt>
                          <dd className="mt-1 text-sm text-gray-900">{selectedPartner.offer.title}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Description</dt>
                          <dd className="mt-1 text-sm text-gray-900">{selectedPartner.offer.description}</dd>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Catégorie</dt>
                            <dd className="mt-1 text-sm text-gray-900">{selectedPartner.offer.category_slug}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Sous-catégorie</dt>
                            <dd className="mt-1 text-sm text-gray-900">{selectedPartner.offer.subcategory_slug}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Prix</dt>
                            <dd className="mt-1 text-sm text-gray-900">{selectedPartner.offer.price}€</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Localisation</dt>
                            <dd className="mt-1 text-sm text-gray-900">{selectedPartner.offer.location}</dd>
                          </div>
                        </div>
                      </dl>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedPartner(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Fermer
                  </button>
                  {selectedPartner.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          handleReject(selectedPartner);
                          setSelectedPartner(null);
                        }}
                        className="px-4 py-2 border border-red-300 rounded-md text-red-700 hover:bg-red-50"
                      >
                        Refuser
                      </button>
                      <button
                        onClick={() => {
                          handleApprove(selectedPartner);
                          setSelectedPartner(null);
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
      </div>
    </div>
  );
}