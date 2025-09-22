import React, { useState } from 'react';
import { Mail, Bell, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function SettingsGeneral() {
  const location = useLocation();
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Paramètres</h1>

        {/* Onglets */}
        <div className="flex border-b mb-6">
          <Link
            to="/partner/settings/general"
            className={`px-4 py-2 -mb-px border-b-2 ${
              location.pathname.includes("general")
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Général
          </Link>
          <Link
            to="/partner/settings/payments"
            className={`ml-6 px-4 py-2 -mb-px border-b-2 ${
              location.pathname.includes("payments")
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Paiements & Agenda
          </Link>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Notifications email */}
          <div className="bg-white rounded-xl p-6 shadow-soft">
            <div className="flex items-center gap-3 mb-6">
              <Mail className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">
                Notifications par email
              </h2>
            </div>
            {Object.entries(emailNotifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between py-2">
                <span>
                  {key === 'newBooking' && 'Nouvelle réservation'}
                  {key === 'bookingReminder' && 'Rappel de réservation'}
                  {key === 'bookingCancellation' && 'Annulation de réservation'}
                  {key === 'marketing' && 'Communications marketing'}
                </span>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) =>
                    setEmailNotifications((prev) => ({
                      ...prev,
                      [key]: e.target.checked
                    }))
                  }
                />
              </div>
            ))}
          </div>

          {/* Notifications push */}
          <div className="bg-white rounded-xl p-6 shadow-soft">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">
                Notifications push
              </h2>
            </div>
            {Object.entries(pushNotifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between py-2">
                <span>
                  {key === 'newBooking' && 'Nouvelle réservation'}
                  {key === 'bookingReminder' && 'Rappel de réservation'}
                  {key === 'bookingCancellation' && 'Annulation de réservation'}
                  {key === 'marketing' && 'Communications marketing'}
                </span>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) =>
                    setPushNotifications((prev) => ({
                      ...prev,
                      [key]: e.target.checked
                    }))
                  }
                />
              </div>
            ))}
          </div>

          {/* Sécurité */}
          <div className="bg-white rounded-xl p-6 shadow-soft">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900">Sécurité</h2>
            </div>
            <button className="w-full text-left py-2 px-3 rounded hover:bg-gray-50">
              Changer le mot de passe
            </button>
            <button className="w-full text-left py-2 px-3 rounded hover:bg-gray-50">
              Authentification à deux facteurs
            </button>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
