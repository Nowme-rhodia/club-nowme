import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from './LoadingSpinner';
import { Badge, Button, Card } from './ui';

interface StripeWebhookEvent {
  id: string;
  stripe_event_id: string;
  event_type: string;
  customer_id: string | null;
  customer_email: string | null;
  subscription_id: string | null;
  amount: number | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  raw_event: any;
  role: string | null;
}

export function StripeWebhookDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<StripeWebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<StripeWebhookEvent | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const eventsPerPage = 10;

  useEffect(() => {
    fetchStripeEvents();
  }, [filter, page]);

  async function fetchStripeEvents() {
    try {
      setLoading(true);
      let query = supabase
        .from('stripe_webhook_events')
        .select('*', { count: 'exact' });
      if (filter !== 'all') {
        query = query.eq('event_type', filter);
      }
      const from = (page - 1) * eventsPerPage;
      const to = from + eventsPerPage - 1;
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      setEvents(data || []);
      if (count !== null) setTotalCount(count);
    } catch (err) {
      console.error('Error fetching stripe events:', err);
      setError('Failed to load Stripe webhook events');
    } finally {
      setLoading(false);
    }
  }

  const eventTypes = Array.isArray(events) ? Array.from(new Set(events.map(event => event.event_type))) : [];

  const formatAmount = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalPages = Math.ceil(totalCount / eventsPerPage);
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  if (loading && events.length === 0) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500 text-center">
          <p className="text-xl font-semibold">{error}</p>
          <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" onClick={() => fetchStripeEvents()}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tableau de bord Stripe</h1>
        <div className="flex space-x-2">
          <select
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
            <option value="all">Tous les événements</option>
            {Array.isArray(eventTypes) && eventTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700" onClick={() => fetchStripeEvents()}>
            Actualiser
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 bg-white shadow rounded-lg">
          <h3 className="text-lg font-medium text-gray-900">Total des événements</h3>
          <p className="text-3xl font-bold">{totalCount}</p>
        </Card>
        <Card className="p-4 bg-white shadow rounded-lg">
          <h3 className="text-lg font-medium text-gray-900">Événements en attente</h3>
          <p className="text-3xl font-bold">{events.filter(e => e.status === 'pending').length}</p>
        </Card>
        <Card className="p-4 bg-white shadow rounded-lg">
          <h3 className="text-lg font-medium text-gray-900">Événements échoués</h3>
          <p className="text-3xl font-bold text-red-600">{events.filter(e => e.status === 'failed').length}</p>
        </Card>
      </div>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type d'événement</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.isArray(events) && events.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">Aucun événement trouvé</td></tr>
              ) : (
                Array.isArray(events) && events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{event.event_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.customer_email || event.customer_id || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatAmount(event.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(event.created_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(event.status)}`}>{event.status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button className="text-indigo-600 hover:text-indigo-900" onClick={() => setSelectedEvent(event)}>Détails</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-700">
          Affichage de <span className="font-medium">{(page - 1) * eventsPerPage + 1}</span> à{' '}
          <span className="font-medium">{Math.min(page * eventsPerPage, totalCount)}</span> sur{' '}
          <span className="font-medium">{totalCount}</span> résultats
        </div>
        <div className="flex space-x-2">
          <button onClick={() => setPage(page - 1)} disabled={!canGoPrevious} className={`px-3 py-1 border rounded ${canGoPrevious ? 'bg-white hover:bg-gray-50' : 'bg-gray-100 cursor-not-allowed'}`}>
            Précédent
          </button>
          <button onClick={() => setPage(page + 1)} disabled={!canGoNext} className={`px-3 py-1 border rounded ${canGoNext ? 'bg-white hover:bg-gray-50' : 'bg-gray-100 cursor-not-allowed'}`}>
            Suivant
          </button>
        </div>
      </div>
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Détails de l'événement</h2>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setSelectedEvent(null)}>&times;</button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><p className="text-sm font-medium text-gray-500">ID Événement</p><p className="text-sm">{selectedEvent.stripe_event_id}</p></div>
              <div><p className="text-sm font-medium text-gray-500">Type</p><p className="text-sm">{selectedEvent.event_type}</p></div>
              <div><p className="text-sm font-medium text-gray-500">Client</p><p className="text-sm">{selectedEvent.customer_email || '-'}</p></div>
              <div><p className="text-sm font-medium text-gray-500">ID Client</p><p className="text-sm">{selectedEvent.customer_id || '-'}</p></div>
              <div><p className="text-sm font-medium text-gray-500">ID Abonnement</p><p className="text-sm">{selectedEvent.subscription_id || '-'}</p></div>
              <div><p className="text-sm font-medium text-gray-500">Montant</p><p className="text-sm">{formatAmount(selectedEvent.amount)}</p></div>
              <div><p className="text-sm font-medium text-gray-500">Statut</p><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedEvent.status)}`}>{selectedEvent.status}</span></div>
              <div><p className="text-sm font-medium text-gray-500">Date</p><p className="text-sm">{formatDate(selectedEvent.created_at)}</p></div>
              <div><p className="text-sm font-medium text-gray-500">Rôle</p><p className="text-sm">{selectedEvent.role || '-'}</p></div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500 mb-2">Données brutes</p>
              <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto text-xs">{JSON.stringify(selectedEvent.raw_event, null, 2)}</pre>
            </div>
            <div className="mt-4 flex justify-end">
              <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300" onClick={() => setSelectedEvent(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}