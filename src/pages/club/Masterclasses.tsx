import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Video, Star, Play } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { getUpcomingMasterclasses, registerToMasterclass, getUserMasterclasses } from '../../lib/club';
import type { Masterclass } from '../../lib/club';
import { SEO } from '../../components/SEO';
import { RestrictedAccess } from '../../components/RestrictedAccess';
import toast from 'react-hot-toast';

export default function Masterclasses() {
  const { profile } = useAuth();
  const [masterclasses, setMasterclasses] = useState<Masterclass[]>([]);
  const [userMasterclasses, setUserMasterclasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);

  const isPremium = profile?.subscription_type === 'premium';

  useEffect(() => {
    if (isPremium) {
      loadMasterclasses();
    } else {
      setLoading(false);
    }
  }, [isPremium]);

  const loadMasterclasses = async () => {
    try {
      const [upcoming, userMasterclassesData] = await Promise.all([
        getUpcomingMasterclasses(),
        getUserMasterclasses()
      ]);
      
      setMasterclasses(upcoming);
      setUserMasterclasses(userMasterclassesData);
    } catch (error) {
      console.error('Erreur chargement masterclasses:', error);
      toast.error('Erreur lors du chargement des masterclasses');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (masterclassId: string) => {
    setRegistering(masterclassId);
    try {
      await registerToMasterclass(masterclassId);
      toast.success('Inscription confirmée !');
      await loadMasterclasses();
    } catch (error) {
      console.error('Erreur inscription:', error);
      toast.error('Erreur lors de l\'inscription');
    } finally {
      setRegistering(null);
    }
  };

  const isUserRegistered = (masterclassId: string) => {
    return userMasterclasses.some(um => um.masterclass.id === masterclassId);
  };

  if (!isPremium) {
    return (
      <div className="relative">
        <SEO 
          title="Masterclasses exclusives"
          description="Accédez aux masterclasses exclusives avec des expertes reconnues"
        />
        <RestrictedAccess
          title="Les masterclasses sont réservées aux membres premium !"
          description="Accède aux sessions exclusives avec des expertes reconnues : développement personnel, bien-être, business..."
          imageUrl="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80"
        />
      </div>
    );
  }

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
        title="Masterclasses exclusives"
        description="Participez aux masterclasses exclusives du Nowme Club avec des expertes reconnues"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Masterclasses exclusives
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Sessions premium avec des expertes reconnues pour booster ton développement personnel et professionnel
          </p>
        </div>

        {/* Catégories */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
            🧠 Développement personnel
          </span>
          <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            💼 Business & Carrière
          </span>
          <span className="px-4 py-2 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">
            💆‍♀️ Bien-être & Santé
          </span>
          <span className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
            🎨 Créativité & Arts
          </span>
        </div>

        {/* Liste des masterclasses */}
        {masterclasses.length === 0 ? (
          <div className="text-center py-12">
            <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Aucune masterclass programmée
            </h3>
            <p className="text-gray-600">
              De nouvelles sessions seront bientôt ajoutées !
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {masterclasses.map((masterclass) => {
              const isRegistered = isUserRegistered(masterclass.id);
              const isFull = masterclass.current_participants >= masterclass.max_participants;

              return (
                <div
                  key={masterclass.id}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
                >
                  <div className="p-8">
                    {/* Expert */}
                    <div className="flex items-center mb-6">
                      {masterclass.expert_photo_url ? (
                        <img
                          src={masterclass.expert_photo_url}
                          alt={masterclass.expert_name}
                          className="w-16 h-16 rounded-full object-cover mr-4"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                          <Star className="w-8 h-8 text-primary" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {masterclass.expert_name}
                        </h3>
                        <p className="text-gray-600 text-sm">Experte {masterclass.category}</p>
                      </div>
                    </div>

                    {/* Titre et description */}
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      {masterclass.title}
                    </h2>
                    <p className="text-gray-600 mb-6">
                      {masterclass.description}
                    </p>

                    {/* Bio experte */}
                    {masterclass.expert_bio && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <h4 className="font-semibold text-gray-900 mb-2">À propos de l'experte</h4>
                        <p className="text-gray-600 text-sm">{masterclass.expert_bio}</p>
                      </div>
                    )}

                    {/* Informations pratiques */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        <div>
                          <div className="text-sm font-medium">
                            {new Date(masterclass.date_time).toLocaleDateString('fr-FR')}
                          </div>
                          <div className="text-xs">
                            {new Date(masterclass.date_time).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="text-sm">{masterclass.duration_minutes} min</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Users className="w-4 h-4 mr-2" />
                        <span className="text-sm">
                          {masterclass.current_participants}/{masterclass.max_participants}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Video className="w-4 h-4 mr-2" />
                        <span className="text-sm">En ligne</span>
                      </div>
                    </div>

                    {/* Statut et action */}
                    <div className="flex items-center justify-between">
                      <div>
                        {isRegistered && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                            Inscrite ✓
                          </span>
                        )}
                      </div>

                      {isRegistered ? (
                        <button
                          disabled
                          className="px-6 py-2 bg-green-100 text-green-700 rounded-full font-medium"
                        >
                          <Play className="w-4 h-4 inline mr-2" />
                          Inscrite
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
                          onClick={() => handleRegister(masterclass.id)}
                          disabled={registering === masterclass.id}
                          className="px-6 py-2 bg-primary text-white rounded-full font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                        >
                          {registering === masterclass.id ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                              Inscription...
                            </div>
                          ) : (
                            <>
                              <Play className="w-4 h-4 inline mr-2" />
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

        {/* Mes masterclasses */}
        {userMasterclasses.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">
              Mes masterclasses
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userMasterclasses.map((userMasterclass) => (
                <div
                  key={userMasterclass.id}
                  className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500"
                >
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {userMasterclass.masterclass.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Avec {userMasterclass.masterclass.expert_name}
                  </p>
                  <div className="space-y-1 text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(userMasterclass.masterclass.date_time).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      {userMasterclass.masterclass.duration_minutes} min
                    </div>
                  </div>
                  <div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      userMasterclass.attendance_status === 'registered' ? 'bg-blue-100 text-blue-700' :
                      userMasterclass.attendance_status === 'attended' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {userMasterclass.attendance_status === 'registered' ? 'Inscrite' :
                       userMasterclass.attendance_status === 'attended' ? 'Participé' : userMasterclass.attendance_status}
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