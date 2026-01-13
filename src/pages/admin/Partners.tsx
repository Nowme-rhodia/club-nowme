import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertCircle,
  Eye,
  Search,
  Filter,
  ChevronDown,
  Mail,
  CheckCircle2,
  XCircle,
  Trash2,
  FileText
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { approvePartner, rejectPartner } from '../../lib/partner';
import type { Database } from '../../types/supabase';
import DeletionReasonModal from '../../components/admin/DeletionReasonModal';

type Partner = Database['public']['Tables']['partners']['Row'];

const statusConfig: Record<
  string,
  { label: string; className: string; icon: any }
> = {
  pending: {
    label: 'En attente',
    icon: AlertCircle,
    className: 'bg-yellow-100 text-yellow-700'
  },
  approved: {
    label: 'Approuvé',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-700'
  },
  rejected: {
    label: 'Refusé',
    icon: XCircle,
    className: 'bg-red-100 text-red-700'
  },
  archived: {
    label: 'Archivé',
    icon: Trash2,
    className: 'bg-gray-100 text-gray-700'
  }
};

const tabs = [
  { id: 'pending', label: 'En attente' },
  { id: 'approved', label: 'Approuvés' },
  { id: 'rejected', label: 'Refusés' },
  { id: 'archived', label: 'Corbeille' }
];

export default function Partners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending'); // 👉 par défaut on liste les demandes en attente
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadPartners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const loadPartners = async () => {
    try {
      console.log('🔍 [Partners] Loading partners with filter:', statusFilter);

      let query = supabase
        .from('partners')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      console.log('📊 [Partners] Query result:', { data, error, count: data?.length });

      if (error) {
        console.error('❌ [Partners] Error from Supabase:', error);
        throw error;
      }

      console.log('✅ [Partners] Partners loaded:', data);
      setPartners((data || []) as Partner[]);
    } catch (error) {
      console.error('❌ [Partners] Error loading partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (partnerId: string) => {
    setActionLoading(partnerId);
    try {
      console.log('🔄 Approbation du partenaire:', partnerId);
      const result = await approvePartner(partnerId);
      console.log('📦 Résultat de l\'approbation:', result);

      // Afficher le mot de passe temporaire à l'admin
      if (result && (result as any).tempPassword) {
        const tempPassword = (result as any).tempPassword;
        console.log('🔑 Temporary password for partner:', tempPassword);
        alert(`✅ Partenaire approuvé !\n\n🔑 Mot de passe temporaire : ${tempPassword}\n\nCe mot de passe a été envoyé par email au partenaire.`);
      } else {
        console.log('⚠️ Pas de mot de passe dans la réponse:', result);
        alert('✅ Partenaire approuvé ! Un email avec les identifiants a été envoyé.');
      }

      await loadPartners();
    } catch (error: any) {
      console.error('❌ Error approving partner:', error);
      console.error('❌ Error details:', error.message, error.stack);
      alert(`Erreur lors de l'approbation du partenaire: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (partnerId: string) => {
    const reason = prompt('Raison du refus (optionnelle):');
    setActionLoading(partnerId);
    try {
      await rejectPartner(partnerId, reason || undefined);
      await loadPartners();
    } catch (error) {
      console.error('Error rejecting partner:', error);
      alert('Erreur lors du refus du partenaire');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredPartners = partners
    .filter((p) => {
      const s = searchTerm.toLowerCase();
      return (
        (p.business_name ?? '').toLowerCase().includes(s) ||
        (p.contact_name ?? '').toLowerCase().includes(s) ||
        (p.contact_email ?? '').toLowerCase().includes(s)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        const aT = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bT = b.created_at ? new Date(b.created_at).getTime() : 0;
        return sortOrder === 'desc' ? bT - aT : aT - bT;
      }
      const aN = (a.business_name ?? '').toLowerCase();
      const bN = (b.business_name ?? '').toLowerCase();
      return sortOrder === 'desc' ? bN.localeCompare(aN) : aN.localeCompare(bN);
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

  const handleArchive = async (reason: string) => {
    if (!confirmArchive) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          userId: confirmArchive.id, // Partner ID (which is userId for partners usually, or handled by backend)
          partnerId: confirmArchive.id,
          role: 'partner',
          action: 'archive',
          reason: reason
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erreur lors de l'archivage");
      }

      alert('✅ Partenaire archivé avec succès.');
      loadPartners();
    } catch (err: any) {
      console.error('Archive error:', err);
      alert('❌ Erreur : ' + err.message);
    } finally {
      setConfirmArchive(null);
    }
  };

  return (
    <div className="p-8">
      <DeletionReasonModal
        isOpen={!!confirmArchive}
        onClose={() => setConfirmArchive(null)}
        onConfirm={handleArchive}
        userName={confirmArchive?.name || ''}
        userType="partner"
      />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Vérification des partenaires</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gérez les demandes de partenariat : approuvez ou refusez les candidatures
        </p>
      </div>

      {/* Filtres */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Recherche */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Rechercher un partenaire..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>

        {/* Filtres dropdown */}
        <div className="flex gap-2">
          {/* Filtre statut */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary bg-white"
            >
              <option value="all">Tous les statuts</option>
              {Object.entries(statusConfig).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Filter className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>

          {/* Tri */}
          <div className="relative">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split(
                  '-'
                ) as ['date' | 'name', 'asc' | 'desc'];
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
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Liste */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredPartners.map((partner) => {
            const key = (partner.status ?? 'pending') as keyof typeof statusConfig;
            const StatusIcon = statusConfig[key]?.icon ?? AlertCircle;
            const badgeClass = statusConfig[key]?.className ?? '';

            return (
              <li key={partner.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900">
                        {partner.business_name || 'Sans nom'}
                      </h3>
                      <div className="mt-1 flex items-center gap-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}
                        >
                          <StatusIcon className="w-4 h-4 mr-1" />
                          {statusConfig[key]?.label}
                        </span>
                        <span className="text-sm text-gray-500">
                          {partner.created_at
                            ? format(new Date(partner.created_at), 'dd MMMM yyyy', {
                              locale: fr
                            })
                            : '-'}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                        <span>{partner.contact_name}</span>
                        <a
                          href={`mailto:${partner.contact_email}`}
                          className="inline-flex items-center text-primary hover:text-primary-dark"
                        >
                          <Mail className="w-4 h-4 mr-1" />
                          {partner.contact_email}
                        </a>
                        <span>{partner.phone}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      {partner.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(partner.id)}
                            disabled={actionLoading === partner.id}
                            className="p-2 text-gray-400 hover:text-green-600 rounded-full hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50"
                            title="Approuver"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleReject(partner.id)}
                            disabled={actionLoading === partner.id}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50"
                            title="Refuser"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setSelectedPartner(partner)}
                        className="p-2 text-gray-400 hover:text-primary rounded-full hover:bg-gray-100 transition-colors duration-200"
                        title="Voir détails"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {partner.status !== 'archived' && (
                        <button
                          onClick={() => setConfirmArchive({
                            id: partner.id,
                            name: partner.business_name
                          })}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors duration-200"
                          title="Archiver (Soft Delete)"
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

      {/* Modal */}
      {selectedPartner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Détails du partenaire
                </h2>
                <button
                  onClick={() => setSelectedPartner(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Information Générale */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Informations</h3>
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
                      <dd className="mt-1 text-sm text-gray-900">{selectedPartner.contact_email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Téléphone</dt>
                      <dd className="mt-1 text-sm text-gray-900">{selectedPartner.phone}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">SIRET</dt>
                      <dd className="mt-1 text-sm text-gray-900">{selectedPartner.siret}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Adresse</dt>
                      <dd className="mt-1 text-sm text-gray-900">{selectedPartner.address}</dd>
                    </div>
                  </dl>
                </div>

                {/* Configuration Commission */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h3 className="text-lg font-medium text-blue-900 mb-4">Commission & Contrat</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-900 mb-2">
                        Modèle de Commission
                      </label>
                      <div className="flex gap-4">
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            className="form-radio text-blue-600"
                            checked={selectedPartner.commission_model === 'fixed'}
                            onChange={async () => {
                              const { error } = await supabase
                                .from('partners')
                                .update({ commission_model: 'fixed' })
                                .eq('id', selectedPartner.id);
                              if (!error) {
                                setSelectedPartner({ ...selectedPartner, commission_model: 'fixed' });
                                loadPartners();
                              }
                            }}
                          />
                          <span className="ml-2 text-sm text-gray-700">Fixe (Taux unique)</span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            className="form-radio text-blue-600"
                            checked={selectedPartner.commission_model === 'acquisition'}
                            onChange={async () => {
                              const { error } = await supabase
                                .from('partners')
                                .update({ commission_model: 'acquisition' })
                                .eq('id', selectedPartner.id);
                              if (!error) {
                                setSelectedPartner({ ...selectedPartner, commission_model: 'acquisition' });
                                loadPartners();
                              }
                            }}
                          />
                          <span className="ml-2 text-sm text-gray-700">Acquisition (Dégressif)</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-blue-900">
                          {selectedPartner.commission_model === 'acquisition'
                            ? 'Taux 1ère visite (Acquisition)'
                            : 'Taux de commission'}
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <input
                            type="number"
                            className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-12 sm:text-sm border-gray-300 rounded-md"
                            value={selectedPartner.commission_rate || 0}
                            onChange={async (e) => {
                              const val = parseFloat(e.target.value);
                              const { error } = await supabase
                                .from('partners')
                                .update({ commission_rate: val })
                                .eq('id', selectedPartner.id);
                              if (!error) setSelectedPartner({ ...selectedPartner, commission_rate: val });
                            }}
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">%</span>
                          </div>
                        </div>
                      </div>

                      {selectedPartner.commission_model === 'acquisition' && (
                        <div>
                          <label className="block text-sm font-medium text-blue-900">
                            Taux visites suivantes (Fidélité)
                          </label>
                          <div className="mt-1 relative rounded-md shadow-sm">
                            <input
                              type="number"
                              className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-12 sm:text-sm border-gray-300 rounded-md"
                              value={selectedPartner.commission_rate_repeat || 0}
                              onChange={async (e) => {
                                const val = parseFloat(e.target.value);
                                const { error } = await supabase
                                  .from('partners')
                                  .update({ commission_rate_repeat: val })
                                  .eq('id', selectedPartner.id);
                                if (!error) setSelectedPartner({ ...selectedPartner, commission_rate_repeat: val });
                              }}
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                              <span className="text-gray-500 sm:text-sm">%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={() => window.open(`/admin/contract/${selectedPartner.id}`, '_blank')}
                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Générer le Contrat de Mandat
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    loadPartners(); // Refresh main list
                    setSelectedPartner(null);
                  }}
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
