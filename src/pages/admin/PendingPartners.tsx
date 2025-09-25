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
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { approvePartner, rejectPartner } from '../../lib/partner';
import type { Database } from '../../types/supabase';

type Partner = Database['public']['Tables']['partners']['Row'];

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  pending: {
    label: 'En attente',
    icon: AlertCircle,
    className: 'bg-yellow-100 text-yellow-700',
  },
  approved: {
    label: 'Approuvée',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-700',
  },
  rejected: {
    label: 'Refusée',
    icon: XCircle,
    className: 'bg-red-100 text-red-700',
  },
};

export default function PendingPartners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  // Raison du refus (par id partenaire)
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    loadPartners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const loadPartners = async () => {
    try {
      let query = supabase
        .from('partners')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPartners((data || []) as Partner[]);
    } catch (error) {
      console.error('Error loading partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (partner: Partner) => {
    try {
      await approvePartner(partner.id as string);
      await loadPartners();
    } catch (error) {
      console.error('Error approving partner:', error);
    }
  };

  const handleReject = async (partner: Partner) => {
    try {
      const reason = rejectReasons[partner.id as string] || 'Demande refusée par l’admin';
      await rejectPartner(partner.id as string, reason);
      await loadPartners();
    } catch (error) {
      console.error('Error rejecting partner:', error);
    }
  };

  // Filtrage + tri client
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
        {/* Header */}
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <Filter className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>

            <div className="relative">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-') as [
                    'date' | 'name',
                    'asc' | 'desc'
                  ];
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
        {filteredPartners.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="mb-4">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune demande trouvée</h3>
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
                const key = (partner.status ?? 'pending') as keyof typeof statusConfig;
                const StatusIcon = statusConfig[key]?.icon ?? AlertCircle;
                const badgeClass = statusConfig[key]?.className ?? statusConfig.pending.className;

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
                                ? format(new Date(partner.created_at), 'dd MMMM yyyy', { locale: fr })
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

                          {/* Champ raison du refus */}
                          {partner.status === 'pending' && (
                            <div className="mt-3">
                              <textarea
                                placeholder="Raison du refus (optionnelle)"
                                className="w-full p-2 border rounded text-sm"
                                value={rejectReasons[partner.id as string] || ''}
                                onChange={(e) =>
                                  setRejectReasons({
                                    ...rejectReasons,
                                    [partner.id as string]: e.target.value,
                                  })
                                }
                              />
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          {partner.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(partner)}
                                className="p-2 text-gray-400 hover:text-green-600 rounded-full hover:bg-gray-100 transition-colors duration-200"
                                title="Approuver"
                              >
                                <CheckCircle2 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleReject(partner)}
                                className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors duration-200"
                                title="Refuser"
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
      </div>
    </div>
  );
}
