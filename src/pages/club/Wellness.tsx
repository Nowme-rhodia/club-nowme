import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Phone, Video, MapPin, Heart, CheckCircle } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { checkConsultationEligibility, bookWellnessConsultation, getUserConsultations } from '../../lib/club';
import type { WellnessConsultation } from '../../lib/club';
import { SEO } from '../../components/SEO';
import { RestrictedAccess } from '../../components/RestrictedAccess';
import toast from 'react-hot-toast';

const consultants = [
  {
    name: 'Dr. Sophie Martin',
    specialty: 'Psychologie positive',
    bio: 'Spécialiste en développement personnel et gestion du stress',
    photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150'
  },
  {
    name: 'Marie Dubois',
    specialty: 'Nutrition holistique',
    bio: 'Nutritionniste spécialisée dans l\'alimentation intuitive',
    photo: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=150'
  },
  {
    name: 'Léa Rousseau',
    specialty: 'Coach de vie',
    bio: 'Accompagnement vers l\'épanouissement personnel et professionnel',
    photo: 'https://images.unsplash.com/photo-1594824388853-d0c2d8e8e8e8?auto=format&fit=crop&q=80&w=150'
  }
];

export default function Wellness() {
  const { profile } = useAuth();
  const [eligibility, setEligibility] = useState<any>(null);
  const [consultations, setConsultations] = useState<WellnessConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingData, setBookingData] = useState({
    consultantName: '',
    specialty: '',
    type: 'video' as 'phone' | 'video' | 'in_person',
    scheduledDate: '',
    duration: 45
  });
  const [booking, setBooking] = useState(false);

  const isPremium = profile?.subscription_type === 'premium';

  useEffect(() => {
    if (isPremium) {
      loadWellnessData();
    } else {
      setLoading(false);
    }
  }, [isPremium]);

  const loadWellnessData = async () => {
    try {
      const [eligibilityData, consultationsData] = await Promise.all([
        checkConsultationEligibility(),
        getUserConsultations()
      ]);
      
      setEligibility(eligibilityData);
      setConsultations(consultationsData);
    } catch (error) {
      console.error('Erreur chargement données bien-être:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleBookConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    setBooking(true);

    try {
      await bookWellnessConsultation(bookingData);
      toast.success('Consultation réservée !');
      setShowBookingForm(false);
      await loadWellnessData();
    } catch (error) {
      console.error('Erreur réservation:', error);
      toast.error('Erreur lors de la réservation');
    } finally {
      setBooking(false);
    }
  };

  const selectConsultant = (consultant: any) => {
    setBookingData({
      ...bookingData,
      consultantName: consultant.name,
      specialty: consultant.specialty
    });
  };

  if (!isPremium) {
    return (
      <div className="relative">
        <SEO 
          title="Consultations bien-être"
          description="Accédez à vos consultations bien-être gratuites avec des expertes"
        />
        <RestrictedAccess
          title="Les consultations bien-être sont réservées aux membres premium !"
          description="Bénéficie d'une consultation gratuite par trimestre avec nos expertes : psychologie, nutrition, coaching..."
          imageUrl="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80"
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
        title="Consultations bien-être"
        description="Réservez vos consultations bien-être gratuites avec nos expertes"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Consultations bien-être
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Une consultation gratuite par trimestre avec nos expertes pour prendre soin de toi
          </p>
        </div>

        {/* Statut d'éligibilité */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className={`rounded-2xl p-6 text-center ${
            eligibility?.eligible 
              ? 'bg-green-50 border-2 border-green-200' 
              : 'bg-orange-50 border-2 border-orange-200'
          }`}>
            <div className="flex items-center justify-center mb-4">
              {eligibility?.eligible ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                <Heart className="w-8 h-8 text-orange-600" />
              )}
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${
              eligibility?.eligible ? 'text-green-900' : 'text-orange-900'
            }`}>
              {eligibility?.eligible 
                ? `Consultation disponible pour ${eligibility.quarter}` 
                : `Consultation déjà utilisée pour ${eligibility?.quarter}`}
            </h3>
            <p className={`${
              eligibility?.eligible ? 'text-green-700' : 'text-orange-700'
            }`}>
              {eligibility?.message}
            </p>
            
            {eligibility?.eligible && (
              <button
                onClick={() => setShowBookingForm(true)}
                className="mt-4 px-6 py-3 bg-primary text-white rounded-full font-semibold hover:bg-primary-dark transition-colors"
              >
                Réserver ma consultation
              </button>
            )}
          </div>
        </div>

        {/* Formulaire de réservation */}
        {showBookingForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Réserver une consultation
                </h2>

                <form onSubmit={handleBookConsultation} className="space-y-6">
                  {/* Choix du consultant */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">
                      Choisir une experte
                    </label>
                    <div className="grid grid-cols-1 gap-4">
                      {consultants.map((consultant) => (
                        <div
                          key={consultant.name}
                          onClick={() => selectConsultant(consultant)}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            bookingData.consultantName === consultant.name
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center">
                            <img
                              src={consultant.photo}
                              alt={consultant.name}
                              className="w-12 h-12 rounded-full object-cover mr-4"
                            />
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {consultant.name}
                              </h3>
                              <p className="text-sm text-primary font-medium">
                                {consultant.specialty}
                              </p>
                              <p className="text-sm text-gray-600">
                                {consultant.bio}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Type de consultation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type de consultation
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { value: 'video', label: 'Visio', icon: Video },
                        { value: 'phone', label: 'Téléphone', icon: Phone },
                        { value: 'in_person', label: 'En personne', icon: MapPin }
                      ].map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setBookingData({ ...bookingData, type: value as any })}
                          className={`p-4 rounded-lg border-2 text-center transition-all ${
                            bookingData.type === value
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Icon className="w-6 h-6 mx-auto mb-2" />
                          <span className="text-sm font-medium">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date et heure */}
                  <div>
                    <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 mb-2">
                      Date et heure souhaitées
                    </label>
                    <input
                      type="datetime-local"
                      id="scheduledDate"
                      value={bookingData.scheduledDate}
                      onChange={(e) => setBookingData({ ...bookingData, scheduledDate: e.target.value })}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      required
                    />
                  </div>

                  {/* Durée */}
                  <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                      Durée
                    </label>
                    <select
                      id="duration"
                      value={bookingData.duration}
                      onChange={(e) => setBookingData({ ...bookingData, duration: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    >
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => setShowBookingForm(false)}
                      className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={booking || !bookingData.consultantName || !bookingData.scheduledDate}
                      className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {booking ? 'Réservation...' : 'Réserver'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Mes consultations */}
        {consultations.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">
              Mes consultations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {consultations.map((consultation) => (
                <div
                  key={consultation.id}
                  className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500"
                >
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {consultation.consultant_name}
                  </h3>
                  <p className="text-sm text-green-600 font-medium mb-2">
                    {consultation.consultant_specialty}
                  </p>
                  <div className="space-y-1 text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(consultation.scheduled_date).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      {consultation.duration_minutes} min
                    </div>
                    <div className="flex items-center">
                      {consultation.consultation_type === 'video' && <Video className="w-4 h-4 mr-2" />}
                      {consultation.consultation_type === 'phone' && <Phone className="w-4 h-4 mr-2" />}
                      {consultation.consultation_type === 'in_person' && <MapPin className="w-4 h-4 mr-2" />}
                      {consultation.consultation_type === 'video' ? 'Visio' :
                       consultation.consultation_type === 'phone' ? 'Téléphone' : 'En personne'}
                    </div>
                  </div>
                  <div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      consultation.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      consultation.status === 'completed' ? 'bg-green-100 text-green-700' :
                      consultation.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {consultation.status === 'scheduled' ? 'Programmée' :
                       consultation.status === 'completed' ? 'Terminée' :
                       consultation.status === 'cancelled' ? 'Annulée' :
                       consultation.status === 'rescheduled' ? 'Reprogrammée' : consultation.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Informations sur le service */}
        <div className="mt-16 bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Comment ça marche ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-primary font-bold">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Choisis ton experte</h3>
              <p className="text-gray-600 text-sm">
                Sélectionne la spécialiste qui correspond à tes besoins
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-primary font-bold">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Réserve ton créneau</h3>
              <p className="text-gray-600 text-sm">
                Choisis la date, l'heure et le format qui te conviennent
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-primary font-bold">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Profite de ta session</h3>
              <p className="text-gray-600 text-sm">
                45 minutes rien que pour toi avec une professionnelle
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}