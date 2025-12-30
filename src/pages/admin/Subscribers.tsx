import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Search,
  Filter,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Clock,
  Eye
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const statusConfig = {
  active: {
    label: 'Actif',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-700'
  },
  pending: {
    label: 'En attente',
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-700'
  },
  cancelled: {
    label: 'Annulé',
    icon: XCircle,
    className: 'bg-red-100 text-red-700'
  }
};

export default function Subscribers() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedSubscriber, setSelectedSubscriber] = useState(null);

  useEffect(() => {
    loadSubscribers();
  }, []);

  const loadSubscribers = async () => {
    try {
      // Fetch profiles and subscriptions in parallel
      const [profilesRes, subscriptionsRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('subscriptions')
          .select('user_id, status')
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (subscriptionsRes.error) throw subscriptionsRes.error;

      // Create a map of usage subscriptions by user_id
      const subMap = new Map();
      subscriptionsRes.data.forEach(sub => {
        if (sub.status === 'active') { // Prioritize active status if duplicates exist
          subMap.set(sub.user_id, sub.status);
        } else if (!subMap.has(sub.user_id)) {
          subMap.set(sub.user_id, sub.status);
        }
      });

      // Merge status into profiles and filter out admins/partners
      const mergedData = profilesRes.data
        .filter(profile => !profile.is_admin && !profile.partner_id)
        .map(profile => ({
          ...profile,
          subscription_status: subMap.get(profile.user_id) || 'pending' // Default to pending if no sub found
        }));

      setSubscribers(mergedData);
    } catch (error) {
      console.error('Error loading subscribers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubscribers = subscribers
    .filter(subscriber => {
      const matchesSearch =
        subscriber.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subscriber.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subscriber.email.toLowerCase().includes(searchTerm.toLowerCase());
      const safeStatus = subscriber.subscription_status || 'pending';
      const matchesStatus = statusFilter === 'all' || safeStatus === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // Sort logic remains the same, assuming filteredSubscribers have the properties
      // ...
      if (sortBy === 'date') {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else {
        const nameA = `${a.last_name || ''} ${a.first_name || ''}`;
        const nameB = `${b.last_name || ''} ${b.first_name || ''}`;
        return sortOrder === 'desc'
          ? nameB.localeCompare(nameA)
          : nameA.localeCompare(nameB);
      }
    });

  if (loading) {
    // ... loading skeleton ... (keep existing)
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
      {/* ... Header and Filters ... */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Abonnées</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gérez les abonnées et leur statut
        </p>
      </div>

      {/* Filters code (lines 112-157) remains roughly the same, verify closure */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Rechercher une abonnée..."
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
              <option value="name-asc">A-Z</option>
              <option value="name-desc">Z-A</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>


      {/* Liste des abonnées */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredSubscribers.map((subscriber) => {
            const statusKey = subscriber.subscription_status || 'pending';
            const statusInfo = statusConfig[statusKey] || statusConfig.pending;
            const StatusIcon = statusInfo.icon;

            return (
              <li key={subscriber.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-4">
                        {subscriber.photo_url ? (
                          <img
                            src={subscriber.photo_url}
                            alt={`${subscriber.first_name} ${subscriber.last_name}`}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-semibold">
                              {(subscriber.first_name?.[0] || '').toUpperCase()}{(subscriber.last_name?.[0] || '').toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {subscriber.first_name} {subscriber.last_name}
                          </h3>
                          <div className="mt-1 flex items-center gap-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                              <StatusIcon className="w-4 h-4 mr-1" />
                              {statusInfo.label}
                            </span>
                            {/* Display selected plan for pending users */}
                            {statusKey === 'pending' && subscriber.selected_plan && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                Plan: {subscriber.selected_plan === 'yearly' ? 'Annuel' : 'Mensuel'}
                              </span>
                            )}
                            <span className="text-sm text-gray-500">
                              Inscrite le {format(new Date(subscriber.created_at), 'dd MMMM yyyy', { locale: fr })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => setSelectedSubscriber(subscriber)}
                        className="p-2 text-gray-400 hover:text-primary rounded-full hover:bg-gray-100 transition-colors duration-200"
                      >
                        <Eye className="w-5 h-5" />
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
      {selectedSubscriber && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Détails de l'abonnée
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Informations personnelles
                  </h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Prénom</dt>
                      <dd className="mt-1 text-sm text-gray-900">{selectedSubscriber.first_name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Nom</dt>
                      <dd className="mt-1 text-sm text-gray-900">{selectedSubscriber.last_name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">{selectedSubscriber.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Téléphone</dt>
                      <dd className="mt-1 text-sm text-gray-900">{selectedSubscriber.phone}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Abonnement
                  </h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Statut</dt>
                      <dd className="mt-1">
                        {(() => {
                          const sKey = selectedSubscriber.subscription_status || 'pending';
                          const sInfo = statusConfig[sKey] || statusConfig.pending;
                          const SIcon = sInfo.icon;
                          return (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sInfo.className}`}>
                              <SIcon className="w-4 h-4 mr-1" />
                              {sInfo.label}
                            </span>
                          );
                        })()}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedSubscriber(null)}
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