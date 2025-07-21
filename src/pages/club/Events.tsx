import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Clock, Star, Plus } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { getUpcomingEvents, registerToEvent, getUserEvents, isEventAccessible, calculateEventPrice } from '../../lib/club';
import type { ClubEvent } from '../../lib/club';
import { SEO } from '../../components/SEO';
import toast from 'react-hot-toast';

export default function Events() {
  const { profile } = useAuth();
  const [upcomingEvents, setUpcomingEvents] = useState<ClubEvent[]>([]);
  const [userEvents, setUserEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const [upcoming, userEventsData] = await Promise.all([
        getUpcomingEvents(),
        getUserEvents()
      ]);
      
      setUpcomingEvents(upcoming);
      setUserEvents(userEventsData);
    } catch (error) {
      console.error('Erreur chargement événements:', error);
      toast.error('Erreur lors du chargement des événements');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (eventId: string) => {
    setRegistering(eventId);
    try {
      await registerToEvent(eventId);
      toast.success('Inscription confirmée !');
      await loadEvents(); // Recharger pour mettre à jour les compteurs
    } catch (error) {
      console.error('Erreur inscription:', error);
      toast.error('Erreur lors de l\'inscription');
    } finally {
      setRegistering(null);
    }
  };

  const isUserRegistered = (eventId: string) => {
    return userEvents.some(ue => ue.event.id === eventId);
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'discovery': return 'Découverte';
      case 'premium': return 'Premium';
      case 'masterclass': return 'Masterclass';
      default: return type;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'discovery': return 'bg-blue-100 text-blue-700';
      case 'premium': return 'bg-primary/10 text-primary';
      case 'masterclass': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F4] via-white to-[#FDF8F4] py-12">
      <SEO 
        title="Événements du club"
        description="Découvrez tous les événements exclusifs du Nowme Club"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Événements du club
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Apéros, ateliers, masterclass... Trouve ton prochain kiff !
          </p>
        </div>

        {/* Filtres par type */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            🌟 Découverte - Accessible à toutes
          </span>
          <span className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
            💎 Premium - Membres premium uniquement
          </span>
          <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
            🎓 Masterclass - Avec des expertes
          </span>
        </div>

        {/* Liste des événements */}
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Aucun événement programmé
            </h3>
            <p className="text-gray-600">
              De nouveaux événements seront bientôt ajoutés !
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {upcomingEvents.map((event) => {
              const isAccessible = isEventAccessible(event, profile?.subscription_type || 'discovery');
              const isRegistered = isUserRegistered(event.id);
              const isFull = event.current_participants >= event.max_participants;
              const price = calculateEventPrice(event, profile?.subscription_type || 'discovery');

              return (
                <div
                  key={event.id}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
                >
                  {/* Image */}
                  {event.image_url && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-6">
                    {/* Type et statut */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEventTypeColor(event.event_type)}`}>
                        {getEventTypeLabel(event.event_type)}
                      </span>
                      {isRegistered && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          Inscrite ✓
                        </span>
                      )}
                    </div>

                    {/* Titre et description */}
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {event.title}
                    </h3>
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {event.description}
                    </p>

                    {/* Informations pratiques */}
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span className="text-sm">
                          {new Date(event.date_time).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="text-sm">
                          {new Date(event.date_time).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span className="text-sm">{event.location}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Users className="w-4 h-4 mr-2" />
                        <span className="text-sm">
                          {event.current_participants}/{event.max_participants} participants
                        </span>
                      </div>
                    </div>

                    {/* Prix et action */}
                    <div className="flex items-center justify-between">
                      <div>
                        {price > 0 ? (
                          <span className="text-2xl font-bold text-primary">
                            {price}€
                          </span>
                        ) : (
                          <span className="text-2xl font-bold text-green-600">
                            Gratuit
                          </span>
                        )}
                      </div>

                      {!isAccessible ? (
                        <button
                          disabled
                          className="px-6 py-2 bg-gray-200 text-gray-500 rounded-full font-medium cursor-not-allowed"
                        >
                          Premium requis
                        </button>
                      ) : isRegistered ? (
                        <button
                          disabled
                          className="px-6 py-2 bg-green-100 text-green-700 rounded-full font-medium"
                        >
                          Inscrite ✓
                        </button>
                      ) : isFull ? (
                        <button
                          disabled
                          className="px-6 py-2 bg-gray-200 text-gray-500 rounded-full font-medium cursor-not-allowed"
                        >
                          Complet
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRegister(event.id)}
                          disabled={registering === event.id}
                          className="px-6 py-2 bg-primary text-white rounded-full font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                        >
                          {registering === event.id ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                              Inscription...
                            </div>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 inline mr-2" />
                              S'inscrire
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mes événements */}
        {userEvents.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">
              Mes événements
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userEvents.map((userEvent) => (
                <div
                  key={userEvent.id}
                  className="bg-white rounded-xl shadow-md p-6 border-l-4 border-primary"
                >
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {userEvent.event.title}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(userEvent.event.date_time).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      {userEvent.event.location}
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      userEvent.status === 'registered' ? 'bg-blue-100 text-blue-700' :
                      userEvent.status === 'attended' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {userEvent.status === 'registered' ? 'Inscrite' :
                       userEvent.status === 'attended' ? 'Participé' : userEvent.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}