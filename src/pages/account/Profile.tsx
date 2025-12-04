import React from 'react';
import { SEO } from '../../components/SEO';
import { useAuth } from '../../lib/auth';
import { User, Mail, Phone, Calendar } from 'lucide-react';

export default function Profile() {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F4] via-white to-[#FDF8F4] py-12">
      <SEO 
        title="Mes informations"
        description="Gérez vos informations personnelles"
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-soft p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Mes informations</h1>

          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <User className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Prénom</p>
                <p className="font-medium text-gray-900">{profile?.first_name || 'Non renseigné'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <User className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Nom</p>
                <p className="font-medium text-gray-900">{profile?.last_name || 'Non renseigné'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <Mail className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{profile?.email || 'Non renseigné'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <Phone className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Téléphone</p>
                <p className="font-medium text-gray-900">{profile?.phone || 'Non renseigné'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Membre depuis</p>
                <p className="font-medium text-gray-900">
                  {profile?.created_at 
                    ? new Date(profile.created_at).toLocaleDateString('fr-FR', { 
                        day: 'numeric',
                        month: 'long', 
                        year: 'numeric' 
                      })
                    : 'Récemment'
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
              Modifier mes informations
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
