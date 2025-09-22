import React, { useState } from 'react';
import { 
  Bell, 
  Mail,
  Shield,
  CreditCard,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export default function Settings() {
  const [emailNotifications, setEmailNotifications] = useState({
    newBooking: true,
    bookingReminder: true,
    bookingCancellation: true,
    marketing: false
  });

  const [pushNotifications, setPushNotifications] = useState({
    newBooking: true,
    bookingReminder: false,
    bookingCancellation: true,
    marketing: false
  });

  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    try {
      // Simuler une sauvegarde
      setSuccess('Paramètres mis à jour avec succès');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Une erreur est survenue lors de la mise à jour');
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Paramètres
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez vos préférences et paramètres de compte
          </p>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Notifications par email */}
          <div className="bg-white rounded-xl p-6 shadow-soft">
            <div className="flex items-center gap-3 mb-6">
              <Mail className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">
                Notifications par email
              </h2>
            </div>

            <div className="space-y-4">
              {Object.entries(emailNotifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <label htmlFor={`email-${key}`} className="text-gray-700">
                    {key === 'newBooking' && 'Nouvelle réservation'}
                    {key === 'bookingReminder' && 'Rappel de réservation'}
                    {key === 'bookingCancellation' && 'Annulation de réservation'}
                    {key === 'marketing' && 'Communications marketing'}
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id={`email-${key}`}
                      checked={value}
                      onChange={(e) => setEmailNotifications(prev => ({
                        ...prev,
                        [key]: e.target.checked
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Notifications push */}
          <div className="bg-white rounded-xl p-6 shadow-soft">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">
                Notifications push
              </h2>
            </div>

            <div className="space-y-4">
              {Object.entries(pushNotifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <label htmlFor={`push-${key}`} className="text-gray-700">
                    {key === 'newBooking' && 'Nouvelle réservation'}
                    {key === 'bookingReminder' && 'Rappel de réservation'}
                    {key === 'bookingCancellation' && 'Annulation de réservation'}
                    {key === 'marketing' && 'Communications marketing'}
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id={`push-${key}`}
                      checked={value}
                      onChange={(e) => setPushNotifications(prev => ({
                        ...prev,
                        [key]: e.target.checked
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Sécurité */}
          <div className="bg-white rounded-xl p-6 shadow-soft">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">
                Sécurité
              </h2>
            </div>

            <div className="space-y-4">
              <button
                className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Changer le mot de passe
              </button>
              <button
                className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Activer l'authentification à deux facteurs
              </button>
              <button
                className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Gérer les appareils connectés
              </button>
            </div>
          </div>

          {/* Paiements */}
          <div className="bg-white rounded-xl p-6 shadow-soft">
            <div className="flex items-center gap-3 mb-6">
              <CreditCard className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">
                Paiements
              </h2>
            </div>

            <div className="space-y-4">
              <button
                className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Gérer les méthodes de paiement
              </button>
              <button
                className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Historique des transactions
              </button>
              <button
                className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Paramètres de facturation
              </button>
            </div>
          </div>

          {/* Bouton de sauvegarde */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Enregistrer les modifications
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}