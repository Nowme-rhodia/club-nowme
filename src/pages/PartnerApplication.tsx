import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CheckCircle, AlertCircle } from 'lucide-react';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';

interface FormData {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  message: string;
}

export default function PartnerApplication() {
  // Données de test en mode développement
  const isDev = import.meta.env.DEV;
  
  const [formData, setFormData] = useState<FormData>({
    businessName: isDev ? 'Spa Zen & Bien-être' : '',
    contactName: isDev ? 'Marie Dupont' : '',
    email: isDev ? 'marie.dupont@spa-zen.fr' : '',
    phone: isDev ? '0612345678' : '',
    message: isDev ? 'Nous sommes un spa spécialisé dans les massages bien-être, la relaxation et les soins du corps. Nous proposons une gamme complète de services incluant massages, soins du visage, hammam et sauna. Notre équipe de professionnels qualifiés offre une expérience unique de détente et de bien-être.' : '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.businessName.trim()) {
      newErrors.businessName = "Le nom de l'entreprise est requis";
    }
    if (!formData.contactName.trim()) {
      newErrors.contactName = 'Le nom du contact est requis';
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Un email valide est requis';
    }
    if (!formData.phone.trim() || !/^[0-9]{10}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Un numéro de téléphone à 10 chiffres est requis';
    }
    if (!formData.message.trim() || formData.message.trim().length < 20) {
      newErrors.message = 'Veuillez décrire votre activité (minimum 20 caractères)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-partner-submission', {
        body: {
          business: {
            name: formData.businessName,
            contactName: formData.contactName,
            email: formData.email,
            phone: formData.phone,
            message: formData.message,
          },
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur lors de l'envoi");

      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error:', error);
      setErrors((prev) => ({
        ...prev,
        message: 'Une erreur est survenue. Veuillez réessayer.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <SEO
          title="Demande envoyée"
          description="Votre demande de partenariat a été envoyée avec succès."
        />
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Demande envoyée avec succès !</h2>
          <p className="mt-2 text-gray-600">
            Nous avons bien reçu votre demande de partenariat. Notre équipe va l'étudier et vous
            recontactera dans les plus brefs délais.
          </p>
          <p className="text-sm text-gray-500">
            Une fois votre demande approuvée, vous pourrez compléter votre profil et publier vos
            offres.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-white bg-primary hover:bg-primary-dark transition-colors duration-200"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <SEO
        title="Devenir partenaire"
        description="Rejoignez Nowme Club et proposez vos offres bien-être."
      />
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Devenir partenaire</h1>
            <p className="text-gray-600">
              Remplissez ce formulaire rapide pour rejoindre Nowme Club. Après validation, vous
              pourrez compléter votre profil et publier vos offres.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nom de l'entreprise */}
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l'entreprise <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="businessName"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition ${
                  errors.businessName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ex: Spa Zen & Bien-être"
              />
              {errors.businessName && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.businessName}
                </p>
              )}
            </div>

            {/* Nom du contact */}
            <div>
              <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-1">
                Nom du contact <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="contactName"
                name="contactName"
                value={formData.contactName}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition ${
                  errors.contactName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ex: Marie Dupont"
              />
              {errors.contactName && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.contactName}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email professionnel <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="contact@votre-entreprise.fr"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Téléphone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0612345678"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Décrivez votre activité <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                value={formData.message}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition resize-none ${
                  errors.message ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Parlez-nous de votre entreprise, vos services, et pourquoi vous souhaitez rejoindre Nowme Club..."
              />
              <p className="mt-1 text-sm text-gray-500">
                {formData.message.length} / 20 caractères minimum
              </p>
              {errors.message && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.message}
                </p>
              )}
            </div>

            {/* Submit button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Envoi en cours...
                  </>
                ) : (
                  'Envoyer ma demande'
                )}
              </button>
            </div>

            <p className="text-xs text-center text-gray-500">
              En soumettant ce formulaire, vous acceptez d'être contacté par notre équipe concernant
              votre demande de partenariat.
            </p>
          </form>
        </div>

        {/* Info box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Prochaines étapes</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ Notre équipe examine votre demande sous 48h</li>
            <li>✓ Vous recevez une notification par email</li>
            <li>✓ Une fois approuvé, complétez votre profil et publiez vos offres</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
