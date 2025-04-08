import React, { useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  Calendar,
  DollarSign,
  ArrowUp,
  ArrowDown,
  BarChart3
} from 'lucide-react';

// Données simulées pour la démo
const mockData = {
  totalBookings: 156,
  totalRevenue: 4850,
  averageRating: 4.8,
  activeOffers: 12,
  recentBookings: [
    { id: 1, offer: "Massage relaxant", date: "2024-01-22", price: 75 },
    { id: 2, offer: "Séance de yoga", date: "2024-01-21", price: 45 },
    { id: 3, offer: "Coaching bien-être", date: "2024-01-20", price: 90 },
  ],
  monthlyStats: [
    { month: 'Jan', bookings: 45 },
    { month: 'Fév', bookings: 52 },
    { month: 'Mar', bookings: 48 },
    { month: 'Avr', bookings: 58 },
    { month: 'Mai', bookings: 62 },
    { month: 'Juin', bookings: 55 }
  ]
};

export default function Statistics() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  const stats = [
    {
      title: "Réservations totales",
      value: mockData.totalBookings,
      change: "+12%",
      trend: "up",
      icon: Calendar
    },
    {
      title: "Chiffre d'affaires",
      value: `${mockData.totalRevenue}€`,
      change: "+8%",
      trend: "up",
      icon: DollarSign
    },
    {
      title: "Note moyenne",
      value: mockData.averageRating,
      change: "+0.2",
      trend: "up",
      icon: Users
    },
    {
      title: "Offres actives",
      value: mockData.activeOffers,
      change: "-1",
      trend: "down",
      icon: TrendingUp
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Statistiques
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Aperçu de vos performances et réservations
          </p>
        </div>

        {/* Filtres de période */}
        <div className="mb-8">
          <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-white">
            {[
              { value: 'week', label: 'Semaine' },
              { value: 'month', label: 'Mois' },
              { value: 'year', label: 'Année' }
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTimeRange(value as typeof timeRange)}
                className={`
                  px-4 py-2 text-sm font-medium rounded-md
                  ${timeRange === value
                    ? 'bg-primary text-white'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Cartes statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-soft hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <span className={`
                  inline-flex items-center px-2 py-1 rounded-full text-sm
                  ${stat.trend === 'up' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}
                `}>
                  {stat.trend === 'up' ? (
                    <ArrowUp className="w-4 h-4 mr-1" />
                  ) : (
                    <ArrowDown className="w-4 h-4 mr-1" />
                  )}
                  {stat.change}
                </span>
              </div>
              <h3 className="text-gray-500 text-sm mb-1">{stat.title}</h3>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Graphique et réservations récentes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Graphique */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Évolution des réservations
              </h2>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
            <div className="h-64 flex items-end justify-between gap-2">
              {mockData.monthlyStats.map((stat, index) => (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div 
                    className="w-full bg-primary/20 rounded-t-lg transition-all duration-300 hover:bg-primary/30"
                    style={{ height: `${(stat.bookings / 62) * 100}%` }}
                  />
                  <span className="text-xs text-gray-500 mt-2">{stat.month}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Réservations récentes */}
          <div className="bg-white rounded-xl p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Dernières réservations
            </h2>
            <div className="space-y-4">
              {mockData.recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <h3 className="font-medium text-gray-900">{booking.offer}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(booking.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long'
                      })}
                    </p>
                  </div>
                  <span className="font-medium text-gray-900">{booking.price}€</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}