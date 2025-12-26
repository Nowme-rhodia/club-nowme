import React, { useState } from 'react';
import { 
  Calendar,
  Search,
  Filter,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  User,
  MapPin
} from 'lucide-react';

// Données simulées pour la démo
const mockBookings = [
  
];

const statusConfig = {
  confirmed: {
    label: 'Confirmée',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-700'
  },
  pending: {
    label: 'En attente',
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-700'
  },
  cancelled: {
    label: 'Annulée',
    icon: XCircle,
    className: 'bg-red-100 text-red-700'
  }
};

export default function Bookings() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredBookings = mockBookings
    .filter(booking => {
      const matchesSearch = 
        booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.offerTitle.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc'
          ? new Date(b.date).getTime() - new Date(a.date).getTime()
          : new Date(a.date).getTime() - new Date(b.date).getTime();
      } else {
        return sortOrder === 'desc'
          ? b.customerName.localeCompare(a.customerName)
          : a.customerName.localeCompare(b.customerName);
      }
    });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Réservations
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez vos réservations et leur statut
          </p>
        </div>

        {/* Filtres et recherche */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Rechercher une réservation..."
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

        {/* Liste des réservations */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune réservation</h3>
              <p className="mt-1 text-sm text-gray-500">
                Aucune réservation ne correspond à vos critères de recherche.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredBookings.map((booking) => {
                const StatusIcon = statusConfig[booking.status as keyof typeof statusConfig].icon;
                return (
                  <li key={booking.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {booking.offerTitle}
                          </h3>
                          <span className={`
                            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${statusConfig[booking.status as keyof typeof statusConfig].className}
                          `}>
                            <StatusIcon className="w-4 h-4 mr-1" />
                            {statusConfig[booking.status as keyof typeof statusConfig].label}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(booking.date).toLocaleString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              hour: 'numeric',
                              minute: 'numeric'
                            })}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {booking.customerName}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {booking.location}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-medium text-gray-900">
                          {booking.price}€
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}